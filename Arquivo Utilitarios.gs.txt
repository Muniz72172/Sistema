// Arquivo: Utilitarios.gs

//  SEGURANÇA🔒
function hashSenha(senha) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, senha);
  return Utilities.base64Encode(digest);
}

function gerarSenhaProvisoria() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ123456789";
  let senha = "";
  for (let i = 0; i < 6; i++) {
    senha += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return senha;
}

//  LOGS📋
function registrarLog(evento, nip, origem, mensagem = "") {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("LogsCadastro");
  const agora = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
  const nipFormatado = "'" + String(nip).padStart(8, '0');
  sheet.appendRow([agora, evento, nipFormatado, mensagem, origem]);
}

function registrarLogCadastro(evento, nip, mensagem, origem) {
  const planilha = SpreadsheetApp.getActiveSpreadsheet();
  const abaLogs = planilha.getSheetByName("LogsCadastro");
  const dataHora = new Date();
  abaLogs.appendRow([dataHora, evento, nip, mensagem, origem]);
}

//  AVISOS📢
function listarAvisosAtivos() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Avisos");
  if (!sheet) return [];
  const dados = sheet.getDataRange().getValues();
  const avisos = [];
  for (let i = 1; i < dados.length; i++) {
    const ativo = String(dados[i][0]).toLowerCase().trim();
    const conteudo = dados[i][1];
    const tipo = String(dados[i][2] || "").toLowerCase().trim();
    if (ativo === "sim" && conteudo) {
      avisos.push({ tipo, conteudo });
    }
  }
  return avisos;
}

//  DADOS DO USUÁRIO👤
function buscarNomePorNip(nip) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("UsuariosCadastrados");
  const dados = sheet.getDataRange().getValues();
  for (let i = 1; i < dados.length; i++) {
    const nipPlanilha = String(dados[i][0]).replace(/^'/, '');
    if (nipPlanilha === String(nip)) {
      const nomeCompleto = dados[i][1];
      const [primeiro, segundo] = nomeCompleto.split(" ");
      return segundo ? `${primeiro} ${segundo}` : primeiro;
    }
  }
  return "Usuário";
}

function buscarUsuarioPorNIP(nip) {
  const planilha = SpreadsheetApp.getActiveSpreadsheet();
  const aba = planilha.getSheetByName("UsuariosCadastrados");
  const dados = aba.getDataRange().getValues();
  const cabecalho = dados[0];
  const idxNIP = cabecalho.indexOf("NIP");
  const idxNome = cabecalho.indexOf("Nome");
  const idxCelular = cabecalho.indexOf("Celular");
  const idxNascimento = cabecalho.indexOf("DataNascimento");
  const idxVinculo = cabecalho.indexOf("Vinculo");

  for (let i = 1; i < dados.length; i++) {
    if (String(dados[i][idxNIP]) === String(nip)) {
      return {
        nome: dados[i][idxNome],
        celular: dados[i][idxCelular],
        nascimento: Utilities.formatDate(new Date(dados[i][idxNascimento]), Session.getScriptTimeZone(), 'yyyy-MM-dd'),
        vinculo: dados[i][idxVinculo]
      };
    }
  }
  return null;
}


//  SENHAS🔐
function trocarSenha(nip, novaSenha) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("UsuariosCadastrados");
  const dados = sheet.getDataRange().getValues();
  for (let i = 1; i < dados.length; i++) {
    const nipPlanilha = String(dados[i][0]).replace(/^'/, '');
    if (nipPlanilha === String(nip)) {
      const novaHash = hashSenha(novaSenha);
      sheet.getRange(i + 1, 8).setValue(novaHash);
      sheet.getRange(i + 1, 9).setValue("Ativo");
      registrarLog("Troca de senha", nip, "Alterar Senha Menu");
      return "Senha alterada com sucesso.";
    }
  }
  return "Erro: NIP não localizado.";
}

function trocarSenhaPorRecuperacao(nip, senhaProvisoria, novaSenha) {
  Logger.log("Iniciando troca de senha para NIP: " + nip);
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("UsuariosCadastrados");
  const dados = sheet.getDataRange().getValues();
  for (let i = 1; i < dados.length; i++) {
    const nipPlanilha = String(dados[i][0]).replace(/^'/, '');
    if (nipPlanilha === String(nip)) {
      const hashProvisoria = hashSenha(senhaProvisoria);
      const hashArmazenado = dados[i][7];
      const status = dados[i][8];
      if (status !== "Provisório") return "A senha atual não é provisória.";
      if (hashProvisoria !== hashArmazenado) return "Senha provisória incorreta.";
      const novaHash = hashSenha(novaSenha);
      sheet.getRange(i + 1, 8).setValue(novaHash);
      sheet.getRange(i + 1, 9).setValue("Ativo");
      registrarLog("Troca via recuperação", nip, "trocarSenha.html");
      return "Senha redefinida com sucesso.";
    }
  }
  return "NIP não encontrado.";
}

function enviarNovaSenha(nip) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("UsuariosCadastrados");
  const dados = sheet.getDataRange().getValues();
  for (let i = 1; i < dados.length; i++) {
    const nipPlanilha = String(dados[i][0]).replace(/^'/, '');
    if (nipPlanilha === String(nip)) {
      const email = dados[i][4];
      const nome = dados[i][1];
      if (!email) return "E-mail não cadastrado.";
      const novaSenha = gerarSenhaProvisoria();
      const hash = hashSenha(novaSenha);
      sheet.getRange(i + 1, 8).setValue(hash);
      sheet.getRange(i + 1, 9).setValue("Provisório");
      const assunto = "Nova senha provisória - Sistema PNSPA";
      const corpo = `Prezado(a) ${nome},\n\nSua nova senha provisória é:\n\n${novaSenha}\n\nAcesse o sistema e altere sua senha.\n\nPNSPA`;
      MailApp.sendEmail(email, assunto, corpo);
      registrarLog("Recuperação de senha", nip, "Recuperar", `Nova senha enviada para ${email}`);
      return "Nova senha enviada por e-mail.";
    }
  }
  return "NIP não encontrado.";
}

function obterDadosUsuario(nip) {
  const dados = buscarUsuarioPorNIP(nip);
  if (!dados) return { status: "erro", mensagem: "NIP não encontrado" };
  return { status: "ok", ...dados };
}
