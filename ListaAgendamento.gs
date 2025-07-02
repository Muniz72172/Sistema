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
    let dataConfig = configData[i][0];
    if (typeof dataConfig === "string" && dataConfig.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [d, m, y] = dataConfig.split("/");
      dataConfig = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    } else if (dataConfig instanceof Date) {
      dataConfig = Utilities.formatDate(dataConfig, Session.getScriptTimeZone(), "yyyy-MM-dd");
    }
    if (String(dataConfig) === dataSelecionada) {
      qtdAssentos = Number(configData[i][2]) || 0;
      configAtivo = (String(configData[i][3]).toUpperCase() === "SIM");
      break;
    }
  }
  if (!qtdAssentos) throw new Error("Configuração de assentos não encontrada para a data.");
  if (!configAtivo) throw new Error("A configuração para a data está inativa.");

  const assentosTravados = [7, 8];
  const assentosReservados = [43, 44, 45, 46];

  // Apenas assentos válidos para vagas normais
  const assentosValidos = [];
  for (let i = 1; i <= qtdAssentos; i++) {
    if (!assentosTravados.includes(i) && !assentosReservados.includes(i)) {
      assentosValidos.push(i);
    }
  }

  const values = sheetAg.getDataRange().getValues();
  const headers = values[0];
  const idx = {};
  headers.forEach((h, i) => { idx[h.toUpperCase()] = i; });

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

  let total = 0, reservas = 0, ocupandoVaga = 0, acompanhantes = 0;
  let assentosReservadosOcupados = 0;
  let lista = [];

  // Contador das vagas ocupadas APENAS em assentos normais
  let ocupandoVagaAssentoValido = 0;

  for (let i = 1; i < values.length; i++) {
    const linha = values[i];
    if (!linha[colData]) continue;

    let dataPlanilha = linha[colData];
    if (typeof dataPlanilha === "string" && dataPlanilha.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [d, m, y] = dataPlanilha.split("/");
      dataPlanilha = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    } else if (dataPlanilha instanceof Date) {
      dataPlanilha = Utilities.formatDate(dataPlanilha, Session.getScriptTimeZone(), "yyyy-MM-dd");
    }
    if (String(dataPlanilha) !== dataSelecionada) continue;

    if (!linha[colStatus]) continue;
    const statusStr = String(linha[colStatus]).trim();

    let assentoNum = parseInt(linha[colAssento]);

    // Agendados: status "Agendado" (exatamente assim)
    if (statusStr === "Agendado") {
      total++;
      ocupandoVaga++;
      // Só conta como ocupando vaga se não for assento reservado (43-46)
      if (!isNaN(assentoNum) && assentosValidos.includes(assentoNum)) {
        ocupandoVagaAssentoValido++;
      }
    }

    // Reservas: status "Reserva"
    if (statusStr === "Reserva") {
      total++;
      reservas++;
    }

    // Contagem de acompanhantes (tipo de vaga)
    let tipoVaga = "";
    if ((linha[colAcomp] || "").toString().trim().toLowerCase() === "acompanhante") {
      tipoVaga = "acompanhante";
      acompanhantes++;
    } else {
      tipoVaga = "titular";
    }

    // Contagem dos assentos reservados ocupados
    if (!isNaN(assentoNum) && assentosReservados.includes(assentoNum) && statusStr === "Agendado") {
      assentosReservadosOcupados++;
    }

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
      status: statusStr,
      tipoVaga: tipoVaga
    });
  }

  // Vagas disponíveis = total de assentos válidos - ocupandoVagaAssentoValido
  let vagasDisponiveis = assentosValidos.length - ocupandoVagaAssentoValido;
  if (vagasDisponiveis < 0) vagasDisponiveis = 0;

  const resumo = {
    total: total,
    ocupandoVaga: ocupandoVaga,
    acompanhantes: acompanhantes,
    reservas: reservas,
    vagasDisponiveis: vagasDisponiveis,
    assentosReservadosOcupados: assentosReservadosOcupados
  };

  return { resumo: resumo, lista: lista };
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
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][colId]) === String(id)) {
      sheetAg.getRange(i + 1, colStatus + 1).setValue("Cancelado");
      return "Agendamento cancelado com sucesso.";
    }
  }
  throw new Error("Agendamento não encontrado.");
}

/**
 * Retorna o resumo geral dos agendamentos e datas ativas.
 * @param {string} [dataSelecionada] - Data opcional para filtrar (yyyy-mm-dd)
 * @return {Object} { totalAgendados, totalOcupandoVaga, totalReservas, totalDatasAtivas }
 */
function resumoGeralAgendamentos(dataSelecionada) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetAg = ss.getSheetByName('Agendamentos');
  const sheetConfig = ss.getSheetByName('ConfigOnibus');
  if (!sheetAg) throw new Error("Aba 'Agendamentos' não encontrada.");
  if (!sheetConfig) throw new Error("Aba 'ConfigOnibus' não encontrada.");

  const values = sheetAg.getDataRange().getValues();
  const headers = values[0];
  const idx = {};
  headers.forEach((h, i) => { idx[h.toUpperCase()] = i; });

  const colStatus = idx['STATUS'];
  const colAssento = idx['ASSENTO'];
  const colData = idx['DATAVIAGEM'];

  // Buscar total de assentos válidos para a data (excluindo travados e reservados)
  let qtdAssentos = 0;
  const configData = sheetConfig.getDataRange().getValues();
  const assentosTravados = [7, 8];
  const assentosReservados = [43, 44, 45, 46];
  let assentosValidos = [];
  if (configData.length > 1) {
    for (let i = 1; i < configData.length; i++) {
      let dataConfig = configData[i][0];
      if (typeof dataConfig === "string" && dataConfig.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        const [d, m, y] = dataConfig.split("/");
        dataConfig = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      } else if (dataConfig instanceof Date) {
        dataConfig = Utilities.formatDate(dataConfig, Session.getScriptTimeZone(), "yyyy-MM-dd");
      }
      if (!dataSelecionada || String(dataConfig) === dataSelecionada) {
        qtdAssentos = Number(configData[i][2]) || 0;
        break;
      }
    }
    for (let i = 1; i <= qtdAssentos; i++) {
      if (!assentosTravados.includes(i) && !assentosReservados.includes(i)) {
        assentosValidos.push(i);
      }
    }
  }

  let totalAgendados = 0;
  let totalOcupandoVaga = 0;
  let totalReservas = 0;
  let ocupandoVagaAssentoValido = 0;
  for (let i = 1; i < values.length; i++) {
    const row = values[i];

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
    const statusStr = String(row[colStatus]).trim();
    let assentoNum = parseInt(row[colAssento]);

    // Agendados: status "Agendado" (exatamente assim)
    if (statusStr === "Agendado") {
      totalAgendados++;
      totalOcupandoVaga++;
      if (!isNaN(assentoNum) && assentosValidos.includes(assentoNum)) {
        ocupandoVagaAssentoValido++;
      }
    }

    // Reservas: status "Reserva"
    if (statusStr === "Reserva") {
      totalAgendados++;
      totalReservas++;
    }
  }

  // Vagas disponíveis = total de assentos válidos - ocupandoVagaAssentoValido
  let vagasDisponiveis = assentosValidos.length - ocupandoVagaAssentoValido;
  if (vagasDisponiveis < 0) vagasDisponiveis = 0;

  const configValues = sheetConfig.getDataRange().getValues();
  let totalDatasAtivas = 0;
  for (let i = 1; i < configValues.length; i++) {
    if (String(configValues[i][3]).toUpperCase() === "SIM") {
      totalDatasAtivas++;
    }
  }

  return {
    totalAgendados: totalAgendados,
    totalOcupandoVaga: totalOcupandoVaga,
    totalReservas: totalReservas,
    totalDatasAtivas: totalDatasAtivas,
    vagasDisponiveis: vagasDisponiveis // (opcional, caso queira usar no painel geral)
  };
}
