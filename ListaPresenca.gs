/**
 * ListaPresenca.gs - Backend Apps Script para Lista de Presença do Ônibus
 */

/**
 * Retorna a lista de presença para uma data (usada em listaPresenca.html).
 * @param {string} data - formato yyyy-mm-dd
 * @return {Array<Object>}
 */
function gerarListaPresencaCompleta(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetAg = ss.getSheetByName('Agendamentos');
  if (!sheetAg) throw new Error("Aba 'Agendamentos' não encontrada.");

  const values = sheetAg.getDataRange().getValues();
  const headers = values[0];
  const idx = {};
  headers.forEach((h, i) => { idx[h.toUpperCase()] = i; });

  function get(v, prop) { 
    return v[idx[prop.toUpperCase()]] !== undefined ? v[idx[prop.toUpperCase()]] : ''; 
  }

  // Normaliza a data para yyyy-mm-dd
  function normalizaData(d) {
    if (typeof d === "string" && d.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [dia, mes, ano] = d.split('/');
      return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
    } else if (d instanceof Date) {
      return Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd");
    }
    return d;
  }

  const lista = [];
  for (let i = 1; i < values.length; i++) {
    const v = values[i];
    if (!v || !get(v, 'DATAVIAGEM')) continue;
    const dataLinha = normalizaData(get(v, 'DATAVIAGEM'));
    if (dataLinha !== data) continue;
    if (String(get(v, 'STATUS')).toUpperCase() === "CANCELADO") continue;

    lista.push({
      nip: get(v, 'NIP') || get(v, 'CPF') || "",
      nome: get(v, 'NOME') || "",
      idade: get(v, 'IDADE') || "",
      destino: get(v, 'DESTINO') || "",
      assento: get(v, 'ASSENTO') || "",
      celular: get(v, 'CELULAR') || "",
      vinculo: get(v, 'VINCULO') || "",
      acompanhante: get(v, 'ACOMPANHANTE') || "",
      tipoViagem: get(v, 'TIPO DE VIAGEM') || get(v, 'TIPODEVIAGEM') || ""
    });
  }
  return lista;
}

/**
 * Retorna as datas configuradas do ônibus (usada para exibir destino e validar datas).
 * @return {Array<Object>}
 */
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

/**
 * Registra evento de geração da lista de presença no log/auditoria.
 */
function registrarEventoOnibus(data, destino, evento) {
  const aba = SpreadsheetApp.getActive().getSheetByName("Registro_Onibus");
  if (!aba) return;
  aba.appendRow([
    new Date(), 
    Session.getActiveUser().getEmail() || "",
    data,
    destino,
    evento
  ]);
}
