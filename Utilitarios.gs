// Utilitarios.gs

function getNomePorNip(nip) {
  const aba = SpreadsheetApp.getActive().getSheetByName("BaseUsuarios");
  const dados = aba.getDataRange().getValues();
  for (let i = 1; i < dados.length; i++) {
    if (dados[i][0] == nip) {
      return dados[i][1]; // Coluna 2: Nome
    }
  }
  return "";
}

function formatarDataBrasileira(dataISO) {
  const data = new Date(dataISO);
  return Utilities.formatDate(data, Session.getScriptTimeZone(), "dd/MM/yyyy");
}

function formatarDataISO(dataBR) {
  const partes = dataBR.split("/");
  return `${partes[2]}-${partes[1]}-${partes[0]}`;
}

function verificarSeJaTemMarcacao(nip, data, destino) {
  const aba = SpreadsheetApp.getActive().getSheetByName("ControleOnibus");
  const dados = aba.getDataRange().getValues();
  for (let i = 1; i < dados.length; i++) {
    if (
      dados[i][1] === data &&
      dados[i][2] === destino &&
      dados[i][3] === nip &&
      (dados[i][8] === "CONFIRMADO" || dados[i][8] === "ESPERA")
    ) {
      return true;
    }
  }
  return false;
}

function gerarHashSenha(senha) {
  const rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, senha);
  return Utilities.base64Encode(rawHash);
}
