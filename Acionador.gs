function transferirAgendamentosPassados() {
  const planilha = SpreadsheetApp.getActiveSpreadsheet();
  const abaAgendamentos = planilha.getSheetByName("Agendamentos");
  const abaArquivo = planilha.getSheetByName("ArquivoAgendamentos");
  const hoje = new Date();

  const dados = abaAgendamentos.getDataRange().getValues();
  const cabecalho = dados[0];
  const dadosFiltrados = [];

  // Índice das colunas importantes
  const idxDataViagem = cabecalho.indexOf("DATAVIAGEM");
  const idxNip = cabecalho.indexOf("NIP");

  if (idxDataViagem === -1 || idxNip === -1) {
    Logger.log("Coluna DATAVIAGEM ou NIP não encontrada.");
    return;
  }

  // Verifica cada linha (exceto o cabeçalho)
  for (let i = 1; i < dados.length; i++) {
    const linha = dados[i];
    const dataViagem = new Date(linha[idxDataViagem]);

    // Se a data da viagem for anterior a hoje
    if (dataViagem < hoje) {
      // Garante que o campo NIP seja texto, com zeros à esquerda (8 dígitos) e apóstrofo
      const novaLinha = linha.slice();
      let nip = String(linha[idxNip]).replace(/^'+/, '').replace(/^0+/, '').padStart(8, '0');
      novaLinha[idxNip] = "'" + nip; // apóstrofo força texto no Google Sheets
      dadosFiltrados.push(novaLinha);
    }
  }

  if (dadosFiltrados.length === 0) {
    Logger.log("Nenhum agendamento passado encontrado.");
    return;
  }

  // Adiciona ao ArquivoAgendamentos
  abaArquivo.getRange(abaArquivo.getLastRow() + 1, 1, dadosFiltrados.length, dadosFiltrados[0].length)
            .setValues(dadosFiltrados);

  // Remove linhas antigas da aba Agendamentos (de trás para frente)
  for (let i = dados.length - 1; i > 0; i--) {
    const dataViagem = new Date(dados[i][idxDataViagem]);
    if (dataViagem < hoje) {
      abaAgendamentos.deleteRow(i + 1); // +1 por causa do cabeçalho
    }
  }

  Logger.log(`${dadosFiltrados.length} agendamentos transferidos com sucesso.`);
}


function configurarTriggerTransferenciaAgendamentos() {
  // Remove triggers anteriores com essa função, se existirem
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "transferirAgendamentosPassados") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // Cria novo acionador diário às 20h no fuso horário do Brasil
  ScriptApp.newTrigger("transferirAgendamentosPassados")
    .timeBased()
    .atHour(20)
    .everyDays(1)
    .inTimezone("America/Sao_Paulo")
    .create();

  Logger.log("Trigger diário das 20h configurado com sucesso.");
}
