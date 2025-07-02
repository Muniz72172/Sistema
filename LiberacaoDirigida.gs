// LiberacaoDirigida.gs


function consultarDisponibilidadeDataDirigida(dataISO) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetConfig = ss.getSheetByName('ConfigOnibus');
  const sheetAg = ss.getSheetByName('Agendamentos');
  if (!sheetConfig) throw new Error("Aba 'ConfigOnibus' não encontrada.");
  if (!sheetAg) throw new Error("Aba 'Agendamentos' não encontrada.");

  // Busca dados da data na ConfigOnibus
  const confVals = sheetConfig.getDataRange().getValues();
  let ativa = false, destino = "", qtdAssentos = 0;
  for (let i = 1; i < confVals.length; i++) {
    let dataConf = confVals[i][0];
    let dataStr = "";
    if (dataConf instanceof Date) {
      dataStr = Utilities.formatDate(dataConf, Session.getScriptTimeZone(), "yyyy-MM-dd");
    } else if (typeof dataConf === "string" && dataConf.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [d, m, y] = dataConf.split("/");
      dataStr = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    } else {
      dataStr = String(dataConf);
    }
    if (dataStr === dataISO) {
      ativa = String(confVals[i][3]).toUpperCase() === "SIM";
      destino = confVals[i][1] || "";
      qtdAssentos = parseInt(confVals[i][2]) || 0;
      break;
    }
  }
  if (!ativa) return { ativa: false };

  // Buscar ocupação na Agendamentos
  const values = sheetAg.getDataRange().getValues();
  const headers = values[0].map(h => h ? h.toString().trim().toUpperCase() : "");

  const colData = headers.indexOf("DATAVIAGEM");
  const colStatus = headers.indexOf("STATUS");
  const colAssento = headers.indexOf("ASSENTO");
  const colNome = headers.indexOf("NOME");
  const colNip = headers.indexOf("NIP");
  const colAcomp = headers.indexOf("ACOMPANHANTE");

  if (colData === -1 || colStatus === -1) {
    throw new Error("Coluna de Data ou Status não encontrada. Headers lidos: " + JSON.stringify(headers));
  }

  const assentosReservados = ["43","44","45","46"];
  const assentosTravados = ["7","8"];
  let especiaisOcupados = {};
  assentosReservados.forEach(a => especiaisOcupados[a] = null);

  let reservas = 0;
  let titulares = 0, acompanhantes = 0;
  let ocupandoVagaAssentoValido = 0; // Só conta ocupação de vagas normais
  let passageirosAgendados = 0; // Correto: 1 por linha agendada, não por assento

  for (let i=1; i<values.length; i++) {
    const linha = values[i];
    if (!linha[colData]) continue;

    // Normaliza data
    let dataPlanilha = linha[colData];
    if (typeof dataPlanilha === "string" && dataPlanilha.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [d, m, y] = dataPlanilha.split("/");
      dataPlanilha = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    } else if (dataPlanilha instanceof Date) {
      dataPlanilha = Utilities.formatDate(dataPlanilha, Session.getScriptTimeZone(), "yyyy-MM-dd");
    }
    if (String(dataPlanilha) !== dataISO) continue;

    if (!linha[colStatus]) continue;
    const statusStr = String(linha[colStatus]).trim().toUpperCase();

    // Novo: trata campo ASSENTO com múltiplos separados por vírgula
    let assentoStr = (linha[colAssento] || "").toString();
    let assentosLista = assentoStr.split(",").map(a => a.trim()).filter(a => a !== "");
    if (assentosLista.some(a => assentosTravados.includes(a))) continue;

    if (statusStr === "AGENDADO") {
      passageirosAgendados++; // <-- conta sempre 1 por linha "Agendado"

      let assentoEspecialRegistrado = false;
      assentosLista.forEach(assentoNum => {
        if (assentosReservados.includes(assentoNum) && !especiaisOcupados[assentoNum]) {
          especiaisOcupados[assentoNum] = {
            nome: colNome !== -1 ? (linha[colNome] || "") : "",
            nip: colNip !== -1 ? (linha[colNip] || "") : ""
          };
          assentoEspecialRegistrado = true;
        }
      });
      // Se não registrou nenhum especial, considera como normal
      if (!assentoEspecialRegistrado) {
        if (colAcomp !== -1 && (linha[colAcomp] || "").toString().trim().toLowerCase() === "acompanhante") {
          acompanhantes++;
        } else {
          titulares++;
        }
        // Só conta para vagas disponíveis se TODOS os assentos não são reservados
        if (!assentosLista.some(a => assentosReservados.includes(a))) {
          ocupandoVagaAssentoValido++;
        }
      }
    }

    // Fila de espera
    if (statusStr === "RESERVA") reservas++;
  }

  // Vagas disponíveis: desconta travados e reservados da lotação total
  const totalAssentosNormais = qtdAssentos - assentosTravados.length - assentosReservados.length;
  let vagas = totalAssentosNormais - ocupandoVagaAssentoValido;
  vagas = Math.max(0, vagas);
  const lotado = vagas <= 0;

  // Status detalhado dos assentos especiais
  let statusEspeciais = {};
  assentosReservados.forEach(num => {
    if (especiaisOcupados[num]) {
      statusEspeciais[num] = "OCUPADO por " + especiaisOcupados[num].nome + " (" + especiaisOcupados[num].nip + ")";
    } else {
      statusEspeciais[num] = "LIVRE";
    }
  });

  return {
    ativa: true,
    destino: destino,
    qtdAssentos: qtdAssentos,
    passageirosAgendados: passageirosAgendados,
    agendados: passageirosAgendados, // para o frontend
    reservas: reservas,
    vagas: vagas,
    lotado: lotado,
    statusEspeciais: statusEspeciais
  };
}


/**
 * Liberação dirigida de assento especial para usuário específico, com ou sem acompanhante.
 * Preenche todos os campos conforme a estrutura da planilha.
 * @param {Object} dados - Payload vindo do formulário (ver liberacaoDirigida.html)
 */
function liberarAssentoDirigido(dados) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetAg = ss.getSheetByName('Agendamentos');
  const sheetLog = ss.getSheetByName('Registro_Onibus');
  const sheetUsuarios = ss.getSheetByName('UsuariosCadastrados');
  if (!sheetAg) throw new Error("Aba 'Agendamentos' não encontrada.");
  if (!sheetUsuarios) throw new Error("Aba 'UsuariosCadastrados' não encontrada.");
  if (!sheetLog) throw new Error("Aba 'Registro_Onibus' não encontrada.");

  // Checar se assentos já estão ocupados para a data/destino
  const agVals = sheetAg.getDataRange().getValues();
  const assentos = dados.assento.split(",").map(a=>a.trim());
  assentos.forEach(assento => {
    for (let i=1; i<agVals.length; i++) {
      let dataAg = agVals[i][5]; // DATAVIAGEM (coluna F, índice 5)
      let dataStrAg = "";
      if (dataAg instanceof Date) {
        dataStrAg = Utilities.formatDate(dataAg, Session.getScriptTimeZone(), "yyyy-MM-dd");
      } else if (typeof dataAg === "string" && dataAg.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        const [d, m, y] = dataAg.split("/");
        dataStrAg = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      } else {
        dataStrAg = String(dataAg);
      }
      if (
        dataStrAg === dados.dataViagem &&
        String(agVals[i][8]) === assento && // ASSENTO (coluna I, índice 8)
        String(agVals[i][12]).toUpperCase() === "AGENDADO" // STATUS (coluna M, índice 12)
      ) {
        throw new Error("Assento " + assento + " já está ocupado para essa data.");
      }
    }
  });

  // Não permitir duplicidade de agendamento para o mesmo usuário naquela data
  for (let i=1; i<agVals.length; i++) {
    let dataAg = agVals[i][5]; // DATAVIAGEM
    let dataStrAg = "";
    if (dataAg instanceof Date) {
      dataStrAg = Utilities.formatDate(dataAg, Session.getScriptTimeZone(), "yyyy-MM-dd");
    } else if (typeof dataAg === "string" && dataAg.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [d, m, y] = dataAg.split("/");
      dataStrAg = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    } else {
      dataStrAg = String(dataAg);
    }
    if (
      dataStrAg === dados.dataViagem &&
      String(agVals[i][0]) === dados.nip && // NIP (coluna A, índice 0)
      (
        String(agVals[i][12]).toUpperCase() === "AGENDADO" ||
        String(agVals[i][12]).toUpperCase() === "RESERVA"
      )
    ) {
      throw new Error("Este usuário já possui agendamento ou reserva nesta data.");
    }
  }

  // Buscar dados do usuário titular
  const users = sheetUsuarios.getDataRange().getValues();
  let userLine = users.find(u => String(u[0]).replace(/^0+/, '') === String(dados.nip).replace(/^0+/, ''));
  if (!userLine) throw new Error("Usuário não encontrado na base de cadastrados.");

  // Função para garantir NIP com zeros à esquerda (8 dígitos)
  function formatNip(nip) {
    nip = String(nip).replace(/\D/g, ''); // só digitos
    while (nip.length < 8) nip = "0" + nip;
    return nip;
  }

  // Função para calcular idade a partir da data de nascimento (coluna 5) e data da viagem
  function calcularIdade(dataNascimento, dataViagem) {
    if (!dataNascimento) return "";
    let nascimento;
    if (dataNascimento instanceof Date) {
      nascimento = dataNascimento;
    } else if (typeof dataNascimento === "string" && dataNascimento.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      // dd/MM/yyyy
      const [d, m, y] = dataNascimento.split("/");
      nascimento = new Date(`${y}-${m}-${d}`);
    } else if (typeof dataNascimento === "string" && dataNascimento.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // yyyy-MM-dd
      nascimento = new Date(dataNascimento);
    } else {
      return "";
    }
    const dataViagemDate = new Date(dataViagem);
    let idade = dataViagemDate.getFullYear() - nascimento.getFullYear();
    const m = dataViagemDate.getMonth() - nascimento.getMonth();
    if (m < 0 || (m === 0 && dataViagemDate.getDate() < nascimento.getDate())) {
      idade--;
    }
    return idade;
  }

  // Extrai dados do usuário titular
  const nip = formatNip(userLine[0]);
  const nome = userLine[1] || "";
  const dataNasc = userLine[2] || ""; // Data Nascimento
  const idade = calcularIdade(dataNasc, dados.dataViagem);
  const celular = userLine[5] || ""; // Celular (coluna 7)
  const vinculo = userLine[6] || ""; // Vínculo (coluna 4)
  const flag_pcd = userLine[10] && String(userLine[10]).toUpperCase() === "SIM" ? "SIM" : "NÃO";

  // Prepara linha do agendamento do titular
  let rowTitular = [
   "'" + String(dados.nip).padStart(8, '0'),
    nome,                            // NOME (B)
    idade,                           // Idade (C)
    celular,                         // Celular (D)
    vinculo,                         // Vínculo (E)
    dados.dataViagem,                // DATAVIAGEM (F)
    dados.destino,                   // DESTINO (G)
    dados.tipoViagem,                // Tipo de Viagem (H)
    dados.acompanhante === "SIM" && assentos[1]
    ? assentos[0] + ", " + assentos[1]
    : assentos[0],                   // ASSENTO (I)
    "Não",                           // ACOMPANHANTE (J) (ajustado abaixo se for com acompanhante)
    flag_pcd,                        // FLAG_PCD (K)
    Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss"), // DATAHORAMARCACAO (L)
    "Agendado",                      // STATUS (M)
    "Sistema ADMIN"                        // ORIGEM (N)
  ];

  // Se for COM acompanhante, ajusta o campo ACOMPANHANTE do titular para "Sim" ou nome do acompanhante
  if (dados.acompanhante === "SIM") {
    rowTitular[9] = dados.acomp_nome || "Sim";
  }

  sheetAg.appendRow(rowTitular);

  // Se for com acompanhante, gravar acompanhante (dados do formulário)
  if (dados.acompanhante === "SIM") {
  let rowAcomp = [
    formatarIdentificador(dados.acomp_nipcpf) || "",  // NIP/CPF formatado
    dados.acomp_nome,                                 // NOME
    dados.acomp_idade,                                // Idade
    dados.acomp_celular,                              // Celular
    dados.acomp_vinculo,                              // Vínculo
    dados.dataViagem,                                 // DATAVIAGEM
    dados.destino,                                    // DESTINO
    dados.tipoViagem,                                 // Tipo de Viagem
    assentos[1],                                      // ASSENTO
    "Acompanhante",                                   // ACOMPANHANTE
    "",                                               // FLAG_PCD
    Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss"), // DATAHORAMARCACAO
    "Agendado",                                       // STATUS
    "Sistema ADMIN"                                   // ORIGEM
  ];
  sheetAg.appendRow(rowAcomp);
}

  // Log no Registro_Onibus
  sheetLog.appendRow([
    new Date(),
    "Agendamento",
    "",
    "confirmado",
    "'" + String(dados.nip).padStart(8, '0'),
    nome,
    dados.dataViagem,
    dados.destino,
    dados.tipoViagem,
    dados.assento,
    flag_pcd,
    dados.acompanhante === "SIM" ? "Com acompanhante" : "Sem acompanhante",
    dados.acomp_nome || "",
    dados.acomp_vinculo,
    "Liberação dirigida pelo Admin",
    dados.justificativa,
  ]);

  return "Liberação realizada com sucesso.";
}

/**
 * Busca usuário por NIP na aba UsuariosCadastrados (para autocomplete no formulário e mostrar todos os dados).
 * @param {string} nip
 * @return {Object|null}
 */
function buscarUsuarioPorNip(nip) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('UsuariosCadastrados');
  if (!sheet) return null;
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]).replace(/^0+/, '') === String(nip).replace(/^0+/, '')) {
      // Calcule idade para hoje (você pode adaptar para a data da viagem se quiser)
      let dataNasc = values[i][5] || "";
      let idade = "";
      if (dataNasc) {
        let nascimento;
        if (dataNasc instanceof Date) {
          nascimento = dataNasc;
        } else if (typeof dataNasc === "string" && dataNasc.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
          const [d, m, y] = dataNasc.split("/");
          nascimento = new Date(`${y}-${m}-${d}`);
        } else if (typeof dataNasc === "string" && dataNasc.match(/^\d{4}-\d{2}-\d{2}$/)) {
          nascimento = new Date(dataNasc);
        }
        if (nascimento) {
          const hoje = new Date();
          idade = hoje.getFullYear() - nascimento.getFullYear();
          const m = hoje.getMonth() - nascimento.getMonth();
          if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) {
            idade--;
          }
        }
      }
      return {
        nip: ("00000000" + values[i][0]).slice(-8),
        nome: values[i][1] || "",
        idade: idade || "",
        celular: values[i][5] || "",
        vinculo: values[i][6] || "",
        pcd: values[i][10] && values[i][10].toString().toUpperCase() === "SIM" ? "SIM" : "NÃO"
      };
    }
  }
  return null;
}


// Função sugerida para formatação
function formatarIdentificador(ident) {
  ident = String(ident).replace(/\D/g, ''); // remove não numérico
  if (ident.length <= 8) {
    // Provavelmente é NIP
    return "'" + ident.padStart(8, '0');
  } else if (ident.length === 11) {
    // Provavelmente é CPF
    return ident.padStart(11, '0'); // CPF sem apóstrofo
  } else {
    return ident;
  }
}
