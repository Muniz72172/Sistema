// RegistrarFaltas.gs


/** UTILS **/
function normalizaNIP(nip) {
  // Garante zeros à esquerda para 8 dígitos
  nip = String(nip).replace(/^'+/, '').replace(/^0+/, '');
  return nip.padStart(8, '0');
}
function normalizaData(data) {
  if (!data) return '';
  if (data instanceof Date) {
    return Utilities.formatDate(data, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(data)) return data;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(data)) {
    var [d, m, y] = data.split('/');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return data;
}

// Busca e retorna todos os campos relevantes do registro
function buscarAgendamentoFalta(nip, dataViagem) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ag = ss.getSheetByName('ArquivoAgendamentos');
  const dados = ag.getDataRange().getValues();
  const nipBusca = normalizaNIP(nip);
  const dataBusca = normalizaData(dataViagem);
  for (let i = 1; i < dados.length; i++) {
    let linha = dados[i];
    let nipLinha = normalizaNIP(linha[0]);
    let dataLinha = normalizaData(linha[5]);
    if (nipLinha === nipBusca && dataLinha === dataBusca) {
      return {
        nome: linha[1],
        nip: nipLinha,
        celular: linha[3] || "",
        vinculo: linha[4] || "",
        pcd: linha[10] && String(linha[10]).toUpperCase() === "SIM" ? "SIM" : "NÃO",
        dataViagem: dataLinha,
        destino: linha[6] || "",
        assento: linha[8] || "",
        tipoViagem: linha[7] || "",
        acompanhante: linha[9] || "",
        origem: linha[13] || "",
        dataHora: linha[11] ? Utilities.formatDate(linha[11], Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm') : "",
        statusFalta: linha[14] && String(linha[14]).toUpperCase() === "FALTOU" ? "FALTOU" : "Presente"
      };
    }
  }
  return { erro: true, mensagem: 'Registro não encontrado.' };
}

// Registrar falta: marca na planilha e copia para FaltasOnibus
function registrarFaltaGS(nip, dataViagem) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ag = ss.getSheetByName('ArquivoAgendamentos');
    const faltas = ss.getSheetByName('FaltasOnibus');
    const dados = ag.getDataRange().getValues();
    const nipBusca = normalizaNIP(nip);
    const dataBusca = normalizaData(dataViagem);

    for (let i = 1; i < dados.length; i++) {
      let linha = dados[i], nipLinha = normalizaNIP(linha[0]), dataLinha = normalizaData(linha[5]);
      if (nipLinha === nipBusca && dataLinha === dataBusca) {
        // Marcar como FALTOU na planilha principal
        ag.getRange(i + 1, 15).setValue('FALTOU');

        // Preparar linha para FaltasOnibus
        let linhaCopia = linha.slice();
        linhaCopia[0] = "'" + nipLinha; // Garante NIP com zeros à esquerda e como texto no Google Sheets
        linhaCopia[14] = "FALTOU"; // Garante que campo Verificação está "FALTOU"

        // Evitar duplicidade em FaltasOnibus
        const faltasData = faltas.getDataRange().getValues();
        let duplicado = false;
        for (let j = 1; j < faltasData.length; j++) {
          let nipF = normalizaNIP(faltasData[j][0]);
          let dataF = normalizaData(faltasData[j][5]);
          if (nipF === nipBusca && dataF === dataBusca) {
            duplicado = true; break;
          }
        }
        if (!duplicado) faltas.appendRow(linhaCopia);
        return { sucesso: true, mensagem: 'Falta registrada com sucesso.' };
      }
    }
    return { sucesso: false, mensagem: 'Registro não encontrado para registrar falta.' };
  } catch (erro) {
    return { sucesso: false, mensagem: 'Erro ao registrar falta: ' + erro };
  }
}

// Remover falta: limpa campo e remove da FaltasOnibus
function removerFaltaGS(nip, dataViagem) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ag = ss.getSheetByName('ArquivoAgendamentos');
    const faltas = ss.getSheetByName('FaltasOnibus');
    const dados = ag.getDataRange().getValues();
    const nipBusca = normalizaNIP(nip);
    const dataBusca = normalizaData(dataViagem);

    let registroEncontrado = false;
    for (let i = 1; i < dados.length; i++) {
      let nipLinha = normalizaNIP(dados[i][0]), dataLinha = normalizaData(dados[i][5]);
      if (nipLinha === nipBusca && dataLinha === dataBusca) {
        ag.getRange(i + 1, 15).setValue('');
        registroEncontrado = true;
        break;
      }
    }
    if (!registroEncontrado) return { sucesso: false, mensagem: 'Registro não encontrado para tirar falta.' };

    // Remove da FaltasOnibus (sempre pelo NIP com zeros à esquerda e data)
    let faltasData = faltas.getDataRange().getValues();
    for (let j = faltasData.length - 1; j > 0; j--) {
      let nipF = normalizaNIP(faltasData[j][0]);
      let dataF = normalizaData(faltasData[j][5]);
      if (nipF === nipBusca && dataF === dataBusca) {
        faltas.deleteRow(j + 1);
      }
    }
    return { sucesso: true, mensagem: 'Falta removida com sucesso.' };
  } catch (erro) {
    return { sucesso: false, mensagem: 'Erro ao tirar falta: ' + erro };
  }
}
