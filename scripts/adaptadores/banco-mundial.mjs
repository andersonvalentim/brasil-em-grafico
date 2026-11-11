/**
 * Banco Mundial — Indicadores de Desenvolvimento Mundial (API v2).
 * parametros: { indicador: código (ex.: "SL.UEM.TOTL.ZS"), anos: quantos anos para trás (padrão 15) }
 * Guarda o Brasil, a média da América Latina e Caribe (LCN), a média do mundo (WLD)
 * e os países da América Latina e do G20.
 * https://datahelpdesk.worldbank.org/knowledgebase/articles/889392
 */
import { baixarJson, numero } from '../lib/http.mjs';
import { NOMES, MEDIA_AMERICA_LATINA, MEDIA_MUNDO, paisesDosGrupos } from '../lib/paises.mjs';

const GRUPOS = { LCN: MEDIA_AMERICA_LATINA, WLD: MEDIA_MUNDO };

export async function coletar(indicador) {
  const { indicador: codigo, anos = 15 } = indicador.fonte.parametros;
  if (!/^[A-Z0-9.]+$/.test(codigo || '')) throw new Error('parametros.indicador deve ser um código do Banco Mundial');

  const nomes = { ...GRUPOS };
  for (const c of paisesDosGrupos()) nomes[c] = NOMES[c];
  const anoAtual = new Date().getFullYear();
  const url = `https://api.worldbank.org/v2/country/${Object.keys(nomes).join(';')}/indicator/${codigo}` +
    `?format=json&per_page=5000&date=${anoAtual - anos}:${anoAtual}`;

  const resposta = await baixarJson(url, { tempoLimite: 120000 });
  if (!Array.isArray(resposta) || !Array.isArray(resposta[1])) throw new Error(`o Banco Mundial não devolveu o indicador ${codigo}`);

  const observacoes = [];
  for (const l of resposta[1]) {
    const nome = nomes[l.countryiso3code];
    const valor = numero(l.value);
    if (!nome || valor == null) continue;
    observacoes.push({ local: 'BR', categoria: nome, periodo: String(l.date), valor: Math.round(valor * 100) / 100 });
  }
  return observacoes;
}
