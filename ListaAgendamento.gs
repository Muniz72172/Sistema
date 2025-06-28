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

  // Lista final e contadores
  let total = 0, titulares = 0, acompanhantes = 0, reservas = 0;
  let assentosReservadosOcupados = 0;
  const assentosReservados = [43,44,45,46];
  const assentosTravados = [7,8];
  let lista = [];

  // Filtrar linhas válidas e classificar titular/acompanhante/reserva
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

    if (!linha[colStatus]) continue;
    const statusStr = String(linha[colStatus]).toUpperCase();
    if (statusStr !== "AGENDADO" && statusStr !== "RESERVA") continue;

    // Ignorar assentos travados (7 e 8)
    let assentoNum = parseInt(linha[colAssento]);
    if (!isNaN(assentoNum) && assentosTravados.includes(assentoNum)) continue;

    // Contar assentos reservados ocupados (43,44,45,46)
    if (!isNaN(assentoNum) && assentosReservados.includes(assentoNum)) {
      assentosReservadosOcupados++;
    }

    let tipoVaga = "";
    if ((linha[colAcomp] || "").toString().trim().toLowerCase() === "acompanhante") {
      tipoVaga = "acompanhante";
      acompanhantes++;
    } else {
      tipoVaga = "titular";
      titulares++;
    }
    if (statusStr === "RESERVA") reservas++;

    lista.push({
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
      status: statusStr === "RESERVA" ? "Reserva" : "Agendado",
      tipoVaga: tipoVaga
    });
    total++;
  }

  // Vagas disponíveis (desconsiderando assentos travados e reservados!)
  const totalAssentosDisponiveis = qtdAssentos - assentosTravados.length - assentosReservados.length;
  const vagasDisponiveis = totalAssentosDisponiveis - (titulares + acompanhantes);

  // Resumo - adicionando assentosReservadosOcupados
  const resumo = {
    total: total, // agendamentos ativos + reservas
    titulares: titulares,
    acompanhantes: acompanhantes,
    reservas: reservas,
    vagasDisponiveis: vagasDisponiveis,
    assentosReservadosOcupados: assentosReservadosOcupados
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
  let totalAgendados = 0;
  let totalTitulares = 0;
  let totalAcompanhantes = 0;
  let totalReservas = 0;

  // Não calcula assentos reservados nem travados no resumo geral (só painel da data)

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

    if (!row[colStatus]) continue;
    const statusStr = String(row[colStatus]).toUpperCase();
    if (statusStr === "AGENDADO" || statusStr === "RESERVA") {
      if ((row[colAcomp] || "").toString().trim().toLowerCase() === "acompanhante") {
        totalAcompanhantes++;
      } else {
        totalTitulares++;
      }
      if (statusStr === "AGENDADO") {
        totalAgendados++;
      } else if (statusStr === "RESERVA") {
        totalReservas++;
      }
    }
  }

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
