/**
 * ONU — Base global dos Objetivos de Desenvolvimento Sustentável (UN Stats SDG API).
 * parametros: { serie: código da série (ex.: "VC_IHR_PSRC"), dimensoes: { "Sex": "BOTHSEX" }, anos }
 * Guarda o Brasil, a média da América Latina e Caribe, a média mundial e os países da América Latina e do G20.
 * https://unstats.un.org/sdgs/UNSDGAPIV5/swagger/index.html
 */
import { baixarJson, numero } from '../lib/http.mjs';
import { NOMES, M49, MEDIA_AMERICA_LATINA, MEDIA_MUNDO, paisesDosGrupos } from '../lib/paises.mjs';

export async function coletar(indicador) {
  const { serie, dimensoes = {}, anos = 15 } = indicador.fonte.parametros;
  if (!/^[A-Za-z0-9_]+$/.test(serie || '')) throw new Error('parametros.serie deve ser um código de série dos ODS');

  const nomes = { 1: MEDIA_MUNDO, 419: MEDIA_AMERICA_LATINA };
  for (const c of paisesDosGrupos()) if (M49[c]) nomes[M49[c]] = NOMES[c];
  const areas = Object.keys(nomes).map((c) => `areaCode=${c}`).join('&');
  const desde = new Date().getFullYear() - anos;
  const j = await baixarJson(`https://unstats.un.org/sdgapi/v1/sdg/Series/Data?seriesCode=${serie}&${areas}&pageSize=10000`, { tempoLimite: 180000 });

  return (j.data || [])
    .filter((r) => Object.entries(dimensoes).every(([k, v]) => (r.dimensions || {})[k] === v))
    .map((r) => ({ nome: nomes[r.geoAreaCode], periodo: String(r.timePeriodStart), valor: numero(r.value) }))
    .filter((o) => o.nome && o.valor != null && Number(o.periodo) >= desde)
    .map((o) => ({ local: 'BR', categoria: o.nome, periodo: o.periodo, valor: Math.round(o.valor * 100) / 100 }));
}
