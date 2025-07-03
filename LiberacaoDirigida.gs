// GerenciarDatas.gs


// Funções usadas na opção Gerenciar Datas de Agendamento (com validações e correção de datas)

// Busca as datas conforme armazenadas na planilha, sempre no formato yyyy-MM-dd (ISO)
function getDatasConfigOnibus() {
  const aba = SpreadsheetApp.getActive().getSheetByName("ConfigOnibus");
  const dados = aba.getDataRange().getValues();
  const resultado = [];
  for (let i = 1; i < dados.length; i++) {
    let dataPlanilha = dados[i][0];
    let dataISO = "";
    if (typeof dataPlanilha === "string" && dataPlanilha.includes("/")) {
      // dd/MM/yyyy
      let [d, m, y] = dataPlanilha.split("/");
      dataISO = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    } else if (dataPlanilha instanceof Date) {
      dataISO = Utilities.formatDate(dataPlanilha, Session.getScriptTimeZone(), "yyyy-MM-dd");
    } else {
      dataISO = dataPlanilha;
    }
    resultado.push({
      data: dataISO,
      destino: dados[i][1] || "",
      qtdAssentos: dados[i][2] || "",
      ativo: (dados[i][3] || "").toString().toUpperCase() === "SIM",
      observacao: dados[i][4] || ""
    });
  }
  return resultado;
}

// Função robusta para comparar datas e alternar o status
function alternarStatusDataOnibus(dataISO) {
  const aba = SpreadsheetApp.getActive().getSheetByName("ConfigOnibus");
  const dados = aba.getDataRange().getValues();

  // dataISO está no formato yyyy-MM-dd
  for (let i = 1; i < dados.length; i++) {
    let dataPlanilha = dados[i][0];
    let dataPlanilhaISO = "";
    if (typeof dataPlanilha === "string" && dataPlanilha.includes("/")) {
      // dd/MM/yyyy
      let [d, m, y] = dataPlanilha.split("/");
      dataPlanilhaISO = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    } else if (dataPlanilha instanceof Date) {
      dataPlanilhaISO = Utilities.formatDate(dataPlanilha, Session.getScriptTimeZone(), "yyyy-MM-dd");
    } else {
      dataPlanilhaISO = dataPlanilha;
    }
    if (dataPlanilhaISO === dataISO) {
      const novoValor = (dados[i][3] || "").toString().toUpperCase() === "SIM" ? "NÃO" : "SIM";
      aba.getRange(i + 1, 4).setValue(novoValor);
      break;
    }
  }
}

// Adiciona nova data, impede duplicidade e dias proibidos, grava sempre em dd/MM/yyyy
function adicionarDataConfigOnibusCompleto(data, destino, qtdAssentos, ativo, observacao) {
  const aba = SpreadsheetApp.getActive().getSheetByName("ConfigOnibus");
  const dados = aba.getDataRange().getValues();

  // Corrigir fuso horário e garantir data correta, sempre GMT-3
  let dataObj = new Date(data + "T00:00:00-03:00");
  if (isNaN(dataObj.getTime())) {
    throw new Error("Data inválida.");
  }

  // Validar sexta/sab/dom: 5,6,0
  const diaSemana = dataObj.getDay();
  if (diaSemana === 5 || diaSemana === 6 || diaSemana === 0) {
    throw new Error("Não é permitido cadastrar datas para sexta-feira, sábado ou domingo.");
  }

  // Validar duplicidade: comparar por yyyy-MM-dd
  const dataISO = Utilities.formatDate(dataObj, Session.getScriptTimeZone(), "yyyy-MM-dd");
  for (let i = 1; i < dados.length; i++) {
    let dataPlanilha = dados[i][0];
    let dataPlanilhaISO = "";
    if (typeof dataPlanilha === "string" && dataPlanilha.includes("/")) {
      let [d, m, y] = dataPlanilha.split("/");
      dataPlanilhaISO = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    } else if (dataPlanilha instanceof Date) {
      dataPlanilhaISO = Utilities.formatDate(dataPlanilha, Session.getScriptTimeZone(), "yyyy-MM-dd");
    } else {
      dataPlanilhaISO = dataPlanilha;
    }
    if (dataPlanilhaISO === dataISO) {
      throw new Error("Já existe uma data cadastrada para " + Utilities.formatDate(dataObj, Session.getScriptTimeZone(), "dd/MM/yyyy") + ".");
    }
  }

  const ultimaLinha = aba.getLastRow() + 1;
  const dataFormatada = Utilities.formatDate(dataObj, Session.getScriptTimeZone(), "dd/MM/yyyy");
  aba.getRange(ultimaLinha, 1).setValue(dataFormatada);
  aba.getRange(ultimaLinha, 2).setValue(destino);
  aba.getRange(ultimaLinha, 3).setValue(Number(qtdAssentos));
  aba.getRange(ultimaLinha, 4).setValue(ativo);
  aba.getRange(ultimaLinha, 5).setValue(observacao || "");
}

function removerDataConfigOnibus(dataISO) {
  const aba = SpreadsheetApp.getActive().getSheetByName("ConfigOnibus");
  const dados = aba.getDataRange().getValues();
  for (let i = 1; i < dados.length; i++) {
    let dataPlanilha = dados[i][0];
    let dataPlanilhaISO = "";
    if (typeof dataPlanilha === "string" && dataPlanilha.includes("/")) {
      let [d, m, y] = dataPlanilha.split("/");
      dataPlanilhaISO = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    } else if (dataPlanilha instanceof Date) {
      dataPlanilhaISO = Utilities.formatDate(dataPlanilha, Session.getScriptTimeZone(), "yyyy-MM-dd");
    } else {
      dataPlanilhaISO = dataPlanilha;
    }
    if (dataPlanilhaISO === dataISO) {
      aba.deleteRow(i + 1);
      break;
    }
  }
}
