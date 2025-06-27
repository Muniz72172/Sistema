// AdminOnibus.gs

function validarLoginAdminOnibus(nip, hash) {
  const aba = SpreadsheetApp.getActive().getSheetByName("LoginAdminOnibus");
  const dados = aba.getDataRange().getValues();
  for (let i = 1; i < dados.length; i++) {
    const [nipAtual, nome, email, senhaHash, ativo] = dados[i];
    if (nipAtual == nip && senhaHash == hash && ativo === "SIM") {
      return { sucesso: true, nip: nipAtual, nome: nome };
    }
  }
  return { sucesso: false, mensagem: "NIP ou senha inválidos, ou acesso inativo." };
}

function buscarCadastroAdminOnibus(nip) {
  const aba = SpreadsheetApp.getActive().getSheetByName("LoginAdminOnibus");
  const dados = aba.getDataRange().getValues();
  for (let i = 1; i < dados.length; i++) {
    const [nipAtual, nome, email, senhaHash, ativo] = dados[i];
    if (nipAtual == nip && ativo === "SIM" && senhaHash === "") {
      return { sucesso: true, nip: nipAtual, nome: nome, email: email };
    }
  }
  return { sucesso: false, mensagem: "NIP não autorizado ou já cadastrado." };
}

function registrarSenhaAdminOnibus(nip, hash) {
  const aba = SpreadsheetApp.getActive().getSheetByName("LoginAdminOnibus");
  const dados = aba.getDataRange().getValues();
  for (let i = 1; i < dados.length; i++) {
    if (dados[i][0] == nip && dados[i][4] === "SIM" && dados[i][3] === "") {
      aba.getRange(i + 1, 4).setValue(hash); // Coluna D = SENHA_HASH
      aba.getRange(i + 1, 6).setValue(new Date()); // Coluna F = CADASTRADO_EM
      return { sucesso: true };
    }
  }
  return { sucesso: false, mensagem: "Erro ao registrar senha." };
}

// As demais funções seguem iguais...

function getAgendadosPorDataDestino(data, destino) {
  const aba = SpreadsheetApp.getActive().getSheetByName("ControleOnibus");
  const dados = aba.getDataRange().getValues();
  const lista = [];
  for (let i = 1; i < dados.length; i++) {
    const [_, dataReg, dest, nip, nome, assento, pcd, acompanhante, status] = dados[i];
    if (status === "CONFIRMADO" && dataReg === data && dest === destino) {
      lista.push({ nip, nome, assento, pcd: pcd === "SIM", acompanhante: acompanhante === "SIM" });
    }
  }
  return lista;
}

function cancelarPorAdmin(nip, data, destino) {
  const aba = SpreadsheetApp.getActive().getSheetByName("ControleOnibus");
  const dados = aba.getDataRange().getValues();
  for (let i = 1; i < dados.length; i++) {
    if (dados[i][1] === data && dados[i][2] === destino && dados[i][3] === nip && dados[i][8] === "CONFIRMADO") {
      aba.getRange(i + 1, 8).setValue("CANCELADO");
      aba.getRange(i + 1, 11).setValue("Cancelado pelo Admin");
      break;
    }
  }
}

function lancarFalta(nip, data, destino, motivo) {
  const aba = SpreadsheetApp.getActive().getSheetByName("ControleOnibus");
  const dados = aba.getDataRange().getValues();
  for (let i = 1; i < dados.length; i++) {
    if (dados[i][1] === data && dados[i][2] === destino && dados[i][3] === nip && dados[i][8] === "CONFIRMADO") {
      aba.getRange(i + 1, 8).setValue("FALTOU");
      aba.getRange(i + 1, 11).setValue("Falta registrada pelo Admin: " + motivo);
      break;
    }
  }
}

function getFilaDeEspera(data, destino) {
  const aba = SpreadsheetApp.getActive().getSheetByName("ControleOnibus");
  const dados = aba.getDataRange().getValues();
  const lista = [];
  let ordem = 1;
  for (let i = 1; i < dados.length; i++) {
    const [_, dataReg, dest, nip, nome, , pcd, , status] = dados[i];
    if (status === "ESPERA" && dataReg === data && dest === destino) {
      lista.push({ ordem: ordem++, nip, nome, pcd: pcd === "SIM" });
    }
  }
  return lista;
}

function promoverReserva(nip, data, destino) {
  const aba = SpreadsheetApp.getActive().getSheetByName("ControleOnibus");
  const dados = aba.getDataRange().getValues();
  for (let i = 1; i < dados.length; i++) {
    if (dados[i][1] === data && dados[i][2] === destino && dados[i][3] === nip && dados[i][8] === "ESPERA") {
      aba.getRange(i + 1, 8).setValue("CONFIRMADO");
      aba.getRange(i + 1, 11).setValue("Promoção manual pelo Admin");
      break;
    }
  }
}

function cancelarReserva(nip, data, destino) {
  const aba = SpreadsheetApp.getActive().getSheetByName("ControleOnibus");
  const dados = aba.getDataRange().getValues();
  for (let i = 1; i < dados.length; i++) {
    if (dados[i][1] === data && dados[i][2] === destino && dados[i][3] === nip && dados[i][8] === "ESPERA") {
      aba.getRange(i + 1, 8).setValue("CANCELADO");
      aba.getRange(i + 1, 11).setValue("Cancelado na fila pelo Admin");
      break;
    }
  }
}

function liberarAssentoParaUsuario(data, destino, assento, nip, justificativa) {
  const aba = SpreadsheetApp.getActive().getSheetByName("ControleOnibus");
  const novaLinha = aba.getLastRow() + 1;
  aba.getRange(novaLinha, 1).setValue(new Date());
  aba.getRange(novaLinha, 2).setValue(data);
  aba.getRange(novaLinha, 3).setValue(destino);
  aba.getRange(novaLinha, 4).setValue(nip);
  aba.getRange(novaLinha, 6).setValue(assento);
  aba.getRange(novaLinha, 8).setValue("CONFIRMADO");
  aba.getRange(novaLinha, 11).setValue("Assento liberado pelo Admin: " + justificativa);
}

function gerarListaPresenca(data, destino) {
  const aba = SpreadsheetApp.getActive().getSheetByName("ControleOnibus");
  const dados = aba.getDataRange().getValues();
  const lista = [];
  for (let i = 1; i < dados.length; i++) {
    if (dados[i][1] === data && dados[i][2] === destino && dados[i][8] === "CONFIRMADO") {
      lista.push({
        nip: dados[i][3],
        nome: dados[i][4],
        assento: dados[i][5],
        pcd: dados[i][6] === "SIM",
        acompanhante: dados[i][7] === "SIM"
      });
    }
  }
  return lista;
}

function registrarEventoOnibus(data, destino, acao) {
  const aba = SpreadsheetApp.getActive().getSheetByName("LogAdminOnibus");
  const novaLinha = aba.getLastRow() + 1;
  aba.getRange(novaLinha, 1).setValue(new Date());
  aba.getRange(novaLinha, 2).setValue(data);
  aba.getRange(novaLinha, 3).setValue(destino);
  aba.getRange(novaLinha, 4).setValue(acao);
}
