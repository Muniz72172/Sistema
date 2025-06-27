// Arquivo: Controlador.gs

function doGet(e) {
  var page = e.parameter.page;
  if (!page) return HtmlService.createHtmlOutputFromFile("login");

  switch (page) {
    case "login":
      return HtmlService.createHtmlOutputFromFile("login")
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    case "menu":
      return HtmlService.createHtmlOutputFromFile("menu")
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    case "cadastroValidacao":
      return HtmlService.createHtmlOutputFromFile("cadastroValidacao")
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    case "cadastroFinal":
      return HtmlService.createHtmlOutputFromFile("cadastroFinal")
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    case "alterarCadastro":
      return HtmlService.createHtmlOutputFromFile("alterarCadastro")
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    case "alterarSenhaMenu":
      return HtmlService.createHtmlOutputFromFile("alterarSenhaMenu")
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    case "recuperar":
      return HtmlService.createHtmlOutputFromFile("recuperar")
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    case "trocarSenha":
      return HtmlService.createHtmlOutputFromFile("trocarSenha")
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    case "onibus":
      return HtmlService.createHtmlOutputFromFile("onibus")
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
        case "meusAgendamentos":
  return HtmlService.createHtmlOutputFromFile("meusAgendamentos")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

    case "instrucoesOnibus":
      return HtmlService.createHtmlOutputFromFile("instrucoesOnibus")
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    case "formularioOnibusComAcompanhante":
      return HtmlService.createHtmlOutputFromFile("formularioOnibusComAcompanhante")
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    case "formularioOnibusSemAcompanhante":
      return HtmlService.createHtmlOutputFromFile("formularioOnibusSemAcompanhante")
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    case "formularioOnibus":
      return HtmlService.createHtmlOutputFromFile("formularioOnibus")
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    case "cadastroFinal_teste":
      return HtmlService.createHtmlOutputFromFile("cadastroFinal_teste")
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    default:
      return HtmlService.createHtmlOutput("Página não encontrada")
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
}

// ✅ Função para obter a base da URL do script
function getBaseUrl() {
  return ScriptApp.getService().getUrl();
}

// ✅ Objeto de rotas centralizadas para uso futuro
const rotasSistema = {
  menu: getBaseUrl() + "?page=menu",
  login: getBaseUrl() + "?page=login",
  cadastroValidacao: getBaseUrl() + "?page=cadastroValidacao",
  cadastroFinal: getBaseUrl() + "?page=cadastroFinal",
  alterarCadastro: getBaseUrl() + "?page=alterarCadastro",
  alterarSenhaMenu: getBaseUrl() + "?page=alterarSenhaMenu",
  recuperar: getBaseUrl() + "?page=recuperar",
  trocarSenha: getBaseUrl() + "?page=trocarSenha",
  onibus: getBaseUrl() + "?page=onibus",
  meusAgendamentos: getBaseUrl() + "?page=meusAgendamentos",
  instrucoesOnibus: getBaseUrl() + "?page=instrucoesOnibus",
  formularioOnibusComAcompanhante: getBaseUrl() + "?page=formularioOnibusComAcompanhante",
  formularioOnibusSemAcompanhante: getBaseUrl() + "?page=formularioOnibusSemAcompanhante",
  formularioOnibus: getBaseUrl() + "?page=formularioOnibus"
};

// ✅ Função pública para acessar os links por nome
function getLinkPorNome(nome) {
  return rotasSistema[nome] || "";
}

