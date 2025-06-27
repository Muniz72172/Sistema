// ListaAgendamento.gs

/**
 * Carrega o painel/lista de agendamentos e resumo para uma data específica.
 * @param {string} dataSelecionada - Data no formato 'yyyy-mm-dd'
 * @return {Object} {resumo: {...}, lista: [...]}
 */
function carregarPainelAgendamentoPorData(dataSelecionada) {
  if (!dataSelecionada) throw new Error("Data não informada.");
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetAg = ss.getSheetByName('Agendamentos');
  const sheetConfig = ss.getSheetByName('ConfigOnibus');
  if (!sheetAg) throw new Error("Aba 'Agendamentos' não encontrada.");
  if (!sheetConfig) throw new Error("Aba 'ConfigOnibus' não encontrada.");

  // Buscar total de assentos para a data
  const configData = sheetConfig.getDataRange().getValues();
  let qtdAssentos = 0;
  let configAtivo = false;
  for (let i = 1; i < configData.length; i++) {
    // Normalizar formato de data da config (pode vir como dd/MM/yyyy ou yyyy-MM-dd ou Date)
    let dataConfig = configData[i][0];
    if (typeof dataConfig === "string" && dataConfig.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [d, m, y] = dataConfig.split("/");
      dataConfig = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    } else if (dataConfig instanceof Date) {
      dataConfig = Utilities.formatDate(dataConfig, Session.getScriptTimeZone(), "yyyy-MM-dd");
    }
    if (String(dataConfig) === dataSelecionada) {
      qtdAssentos = Number(configData[i][2]) || 0; // coluna QTDEASSENTOS (ajuste se necessário)
      configAtivo = (String(configData[i][3]).toUpperCase() === "SIM"); // coluna ATIVO (ajuste se necessário)
      break;
    }
  }
  if (!qtdAssentos) throw new Error("Configuração de assentos não encontrada para a data.");
  if (!configAtivo) throw new Error("A configuração para a data está inativa.");

  // Buscar agendamentos ativos dessa data
  const values = sheetAg.getDataRange().getValues();
  const headers = values[0];
  const idx = {};
  headers.forEach((h,i)=>{ idx[h.toUpperCase()] = i; });

  // Garantir colunas obrigatórias
  const colData = idx['DATAVIAGEM'];
  const colStatus = idx['STATUS'];
  const colAssento = idx['ASSENTO'];
  const colNome = idx['NOME'];
  const colNip = idx['NIP'];
  const colPCD = idx['PCD'];
  const colAcomp = idx['ACOMPANHANTE'];
  const colTipoViagem = idx['TIPO DE VIAGEM'] || idx['TIPODEVIAGEM'];
  const colCelular = idx['CELULAR'];
  const colId = idx['ID'] !== undefined ? idx['ID'] : null;

  // Map para auxiliar busca de acompanhantes em reservas
  const agendamentos = [];
  const nomesAgendados = [];
  let total = 0, titulares = 0, acompanhantes = 0, reservas = 0;
  let lista = [];

  // Filtrar linhas válidas
  for (let i=1; i<values.length; i++) {
    const linha = values[i];
    if (!linha[colData]) continue;

    // Normaliza data da planilha para yyyy-mm-dd
    let dataPlanilha = linha[colData];
    if (typeof dataPlanilha === "string" && dataPlanilha.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [d, m, y] = dataPlanilha.split("/");
      dataPlanilha = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    } else if (dataPlanilha instanceof Date) {
      dataPlanilha = Utilities.formatDate(dataPlanilha, Session.getScriptTimeZone(), "yyyy-MM-dd");
    }
    if (String(dataPlanilha) !== dataSelecionada) continue;

    if (!linha[colStatus] || String(linha[colStatus]).toUpperCase() !== "AGENDADO") continue;

    agendamentos.push({
      idx: i,
      id: colId !== null ? linha[colId] : "",
      data: dataSelecionada,
      nome: linha[colNome] || "",
      nip: linha[colNip] || "",
      assento: (linha[colAssento] || "").toString(),
      pcd: linha[colPCD] || "",
      acompanhante: linha[colAcomp] || "",
      tipoViagem: linha[colTipoViagem] || "",
      celular: linha[colCelular] || "",
      status: "Agendado"
    });
    nomesAgendados.push((linha[colNome] || "").toString().trim());
    total++;
  }

  // Determinação de titulares, acompanhantes e reservas conforme lógica fornecida
  // Primeiro, um mapa por assento para facilitar busca de reservas
  const assentoMap = {};
  agendamentos.forEach(item => {
    if (!assentoMap[item.assento]) assentoMap[item.assento] = [];
    assentoMap[item.assento].push(item);
  });

  // Segundo, um set de nomes de acompanhantes (quem é citado como acompanhante em outro registro)
  const nomesComoAcompanhante = new Set();
  agendamentos.forEach(item => {
    if (item.acompanhante && item.acompanhante.trim() && item.acompanhante.trim() !== "-") {
      nomesComoAcompanhante.add(item.acompanhante.trim());
    }
  });

  // Contagem detalhada por regras fornecidas
  agendamentos.forEach(item => {
    // Titulares: quem tem acompanhante nomeado (em qualquer assento, inclusive Rxx)
    if (item.acompanhante && item.acompanhante.trim() && item.acompanhante.trim() !== "-") {
      titulares++;
      // Reservas: só conta a reserva uma vez por titular com ASSENTO Rxx e acompanhante nomeado
      if (/^R\d+$/i.test(item.assento)) {
        reservas++;
      }
    }
    // Acompanhantes: quem NÃO tem acompanhante nomeado, mas seu nome aparece como acompanhante de outro, mesmo ASSENTO
    else if (nomesComoAcompanhante.has(item.nome.trim())) {
      acompanhantes++;
    }
    // (Os demais, se necessário, podem ser ignorados do ponto de vista de métricas principais)
    lista.push(item);
  });

  // Vagas disponíveis
  const vagasDisponiveis = qtdAssentos - (titulares + acompanhantes);

  // Resumo
  const resumo = {
    total: total, // agendamentos ativos
    titulares: titulares,
    acompanhantes: acompanhantes,
    reservas: reservas,
    vagasDisponiveis: vagasDisponiveis
  };

  return {resumo: resumo, lista: lista};
}

/**
 * Cancela um agendamento por ID.
 * @param {string} id
 * @return {string}
 */
function cancelarAgendamentoPorId(id) {
  if (!id) throw new Error("ID não informado.");
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetAg = ss.getSheetByName('Agendamentos');
  const values = sheetAg.getDataRange().getValues();
  const headers = values[0];
  const colId = headers.indexOf("ID");
  const colStatus = headers.indexOf("STATUS");
  if (colId === -1 || colStatus === -1) throw new Error("Coluna ID ou STATUS não encontrada.");
  for (let i=1; i<values.length; i++) {
    if (String(values[i][colId]) === String(id)) {
      sheetAg.getRange(i+1, colStatus+1).setValue("Cancelado");
      return "Agendamento cancelado com sucesso.";
    }
  }
  throw new Error("Agendamento não encontrado.");
}

/**
 * Retorna o resumo geral dos agendamentos e datas ativas.
 * @param {string} [dataSelecionada] - Data opcional para filtrar (yyyy-mm-dd)
 * @return {Object} { totalAgendados, totalTitulares, totalReservas, totalDatasAtivas }
 */
function resumoGeralAgendamentos(dataSelecionada) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetAg = ss.getSheetByName('Agendamentos');
  const sheetConfig = ss.getSheetByName('ConfigOnibus');
  if (!sheetAg) throw new Error("Aba 'Agendamentos' não encontrada.");
  if (!sheetConfig) throw new Error("Aba 'ConfigOnibus' não encontrada.");

  // --- Resumo dos agendamentos ---
  const values = sheetAg.getDataRange().getValues();
  const headers = values[0];
  const idx = {};
  headers.forEach((h,i)=>{ idx[h.toUpperCase()] = i; });

  const colStatus = idx['STATUS'];
  const colAssento = idx['ASSENTO'];
  const colData = idx['DATAVIAGEM'];
  const colNome = idx['NOME'];
  const colAcomp = idx['ACOMPANHANTE'];

  // Para lógica conforme especificação
  const agendamentos = [];
  const nomesAgendados = [];
  for (let i=1; i<values.length; i++) {
    const row = values[i];

    // Filtro por data se fornecida
    let matchData = true;
    if (dataSelecionada) {
      let dataPlanilha = row[colData];
      if (typeof dataPlanilha === "string" && dataPlanilha.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        const [d, m, y] = dataPlanilha.split("/");
        dataPlanilha = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      } else if (dataPlanilha instanceof Date) {
        dataPlanilha = Utilities.formatDate(dataPlanilha, Session.getScriptTimeZone(), "yyyy-MM-dd");
      }
      matchData = (String(dataPlanilha) === dataSelecionada);
    }
    if (!matchData) continue;

    if (String(row[colStatus]).toUpperCase() === "AGENDADO") {
      agendamentos.push({
        nome: (row[colNome] || "").toString(),
        assento: (row[colAssento] || "").toString(),
        acompanhante: (row[colAcomp] || "").toString()
      });
      nomesAgendados.push((row[colNome] || "").toString().trim());
    }
  }

  // Auxiliares
  const nomesComoAcompanhante = new Set();
  agendamentos.forEach(item => {
    if (item.acompanhante && item.acompanhante.trim() && item.acompanhante.trim() !== "-") {
      nomesComoAcompanhante.add(item.acompanhante.trim());
    }
  });

  // Contagem
  let totalAgendados = agendamentos.length;
  let totalTitulares = 0;
  let totalAcompanhantes = 0;
  let totalReservas = 0;

  // Mapa para contar reservas sem duplicidade
  const reservasUnicas = new Set();

  agendamentos.forEach(item => {
    // Titulares: quem tem acompanhante nomeado (em qualquer assento, inclusive Rxx)
    if (item.acompanhante && item.acompanhante.trim() && item.acompanhante.trim() !== "-") {
      totalTitulares++;
      // Reservas: só conta a reserva uma vez por titular com ASSENTO Rxx e acompanhante nomeado
      if (/^R\d+$/i.test(item.assento)) {
        reservasUnicas.add(item.assento);
      }
    }
    // Acompanhantes: quem NÃO tem acompanhante nomeado, mas seu nome aparece como acompanhante de outro, mesmo ASSENTO
    else if (nomesComoAcompanhante.has(item.nome.trim())) {
      totalAcompanhantes++;
    }
    // Os demais são ignorados para métricas principais
  });
  totalReservas = reservasUnicas.size;

  // --- Resumo das datas ativas ---
  const configValues = sheetConfig.getDataRange().getValues();
  let totalDatasAtivas = 0;
  for (let i=1; i<configValues.length; i++) {
    if (String(configValues[i][3]).toUpperCase() === "SIM") {
      totalDatasAtivas++;
    }
  }

  return {
    totalAgendados: totalAgendados,
    totalTitulares: totalTitulares,
    totalReservas: totalReservas,
    totalAcompanhantes: totalAcompanhantes,
    totalDatasAtivas: totalDatasAtivas
  };
}
