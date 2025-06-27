// Arquivo: Login.gs (Corrigido)

/**
 * Gera o hash da senha usando SHA-256 + Base64
 */
function hashSenha(senha) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, senha);
  return Utilities.base64Encode(digest);
}

/**
 * Retorna a aba UsuariosCadastrados da planilha principal
 */
function getSheetUsuarios() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName("UsuariosCadastrados");
}

/**
 * Busca o usuário pelo NIP na planilha
 */
function buscarUsuarioPorNip(nip) {
  const sheet = getSheetUsuarios();
  const dados = sheet.getDataRange().getValues();
  for (let i = 1; i < dados.length; i++) {
    const nipPlanilha = String(dados[i][0]).replace(/^'/, ''); // Remove apóstrofo invisível
    if (nipPlanilha === String(nip)) {
      return { linha: i + 1, dados: dados[i] };
    }
  }
  return null;
}

/**
 * Verifica se o usuário ainda pertence à base FUSMAOFF externa
 */
function usuarioAindaValido(nip) {
  const idFusma = "1x2yy3xErVsgelY9S6yvvU8Zjm66luCbqxmObLsuCltY";
  const fusmaSheet = SpreadsheetApp.openById(idFusma).getSheetByName("ValidacaoFusma");
  const dados = fusmaSheet.getDataRange().getValues();
  for (let i = 1; i < dados.length; i++) {
    const nipFusma = String(dados[i][0]).replace(/^'/, '');
    if (nipFusma === nip) return true;
  }
  return false;
}

/**
 * Login do usuário com validação de senha e permanência na área da PNSPA
 * CORRIGIDO: Acesso correto aos dados do usuário e retorno de todos os campos
 */
function loginUsuario(nip, senha) {
  const usuario = buscarUsuarioPorNip(nip);
  if (!usuario) {
    return { status: "erro", msg: "NIP não encontrado." };
  }

  const hash = hashSenha(senha);
  const senhaCorreta = usuario.dados[7]; // Coluna H
  const statusSenha = usuario.dados[8]; // Coluna I

  if (senhaCorreta !== hash) {
    return { status: "erro", msg: "Senha incorreta." };
  }

  if (!usuarioAindaValido(nip)) {
    return { status: "erro", msg: "Usuário fora da área de cobertura da PNSPA. Acesso negado." };
  }

  const precisaTrocar = (statusSenha === "Provisório");

  // CORREÇÃO: Acesso correto aos dados do usuário usando usuario.dados
  // Assumindo a ordem das colunas: NIP(0), Nome(1), DataNascimento(2), Cidade(3), Celular(4), Vínculo(5)
  return {
    status: "ok",
    precisaTrocar,
    nip: String(nip),
    nome: usuario.dados[1] || "",
    nascimento: formatarData(usuario.dados[2]),
    cidade: usuario.dados[3] || "",
    celular: usuario.dados[4] || "",
    vinculo: usuario.dados[5] || ""
  };
}

/**
 * Função auxiliar para formatar data
 */
function formatarData(data) {
  if (!data) return "";
  
  try {
    if (data instanceof Date) {
      return Utilities.formatDate(data, Session.getScriptTimeZone(), "yyyy-MM-dd");
    } else {
      // Tenta converter para data se for string
      const dataObj = new Date(data);
      if (!isNaN(dataObj.getTime())) {
        return Utilities.formatDate(dataObj, Session.getScriptTimeZone(), "yyyy-MM-dd");
      }
    }
  } catch (e) {
    Logger.log("Erro ao formatar data: " + e);
  }
  
  // Se não conseguir formatar, retorna como string
  return String(data || "");
}


