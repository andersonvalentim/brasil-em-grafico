/**
 * ANEEL — Bandeiras tarifárias (dados abertos).
 * parametros: { meses: quantos meses guardar }
 * Valores convertidos de R$/MWh para R$ a cada 100 kWh (÷ 10).
 * https://dadosabertos.aneel.gov.br/dataset/bandeiras-tarifarias
 */
import { baixarJson, numero } from '../lib/http.mjs';

const API = 'https://dadosabertos.aneel.gov.br/api/3/action/datastore_search';
const ACIONAMENTO = '0591b8f6-fe54-437b-b72b-1aa2efd46e42';
const ADICIONAL = '5879ca80-b3bd-45b1-a135-d9b77c1d5b36';

const por100kWh = (rsMWh) => Math.round(((rsMWh ?? 0) / 10) * 1000) / 1000;

function nomeBandeira(nome) {
  return String(nome).trim().replace(/\bP(\d)\b/, 'patamar $1');
}

async function registros(recurso) {
  const j = await baixarJson(`${API}?resource_id=${recurso}&limit=1000`);
  if (!j.success) throw new Error('ANEEL: resposta sem sucesso');
  return j.result.records;
}

export async function coletar(indicador) {
  const { meses = 24 } = indicador.fonte.parametros;
  const [acionamentos, adicionais] = await Promise.all([registros(ACIONAMENTO), registros(ADICIONAL)]);

  const observacoes = acionamentos
    .map((r) => ({
      local: 'BR',
      periodo: String(r.DatCompetencia).slice(0, 7),
      categoria: nomeBandeira(r.NomBandeiraAcionada),
      valor: por100kWh(numero(r.VlrAdicionalBandeira)),
    }))
    .filter((o) => /^\d{4}-\d{2}$/.test(o.periodo))
    .sort((a, b) => (a.periodo < b.periodo ? -1 : 1))
    .slice(-meses);

  const vigente = adicionais.map((r) => String(r.DatVigencia)).sort().pop();
  const tabela = [{ categoria: 'Verde', valor: 0 }].concat(
    adicionais
      .filter((r) => String(r.DatVigencia) === vigente)
      .map((r) => ({ categoria: nomeBandeira(r.NomBandeiraAcionada), valor: por100kWh(numero(r.VlrAdicionalBandeiraRSMWh)) }))
      .sort((a, b) => a.valor - b.valor)
  );

  return { observacoes, extras: { tabela, vigenteDesde: vigente } };
}
