// RotasAdmin.gs

function doGet(e) {
  var page = (e && e.parameter && e.parameter.page) ? e.parameter.page : 'loginAdminOnibus';
  switch (page) {
    case 'loginAdminOnibus':
      return HtmlService.createHtmlOutputFromFile('loginAdmin.html');
    case 'validarCadastroAdminOnibus':
      return HtmlService.createHtmlOutputFromFile('validarCadastroAdminOnibus.html');
    case 'cadastroSenhaAdminOnibus':
      return HtmlService.createHtmlOutputFromFile('cadastroSenhaAdminOnibus.html');
    case 'menuAdminOnibus':
      return HtmlService.createHtmlOutputFromFile('menuAdminOnibus.html');
    case 'gerenciarDatas':
      return HtmlService.createHtmlOutputFromFile('gerenciarDatas.html');
    case 'listarAgendados':
      return HtmlService.createHtmlOutputFromFile('listarAgendados.html');
    case 'filaEsperaAdmin':
      return HtmlService.createHtmlOutputFromFile('filaEsperaAdmin.html');
    case 'liberacaoDirigida':
      return HtmlService.createHtmlOutputFromFile('liberacaoDirigida.html');
    case 'listaPresenca':
      return HtmlService.createHtmlOutputFromFile('listaPresenca.html');
    case 'listaAgendamentos':
      return HtmlService.createHtmlOutputFromFile('listaAgendamento.html');
    default:
      return HtmlService.createHtmlOutput('<h3>Página não encontrada</h3>');
  }
}
