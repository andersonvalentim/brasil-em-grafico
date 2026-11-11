/**
 * OCDE — Data Explorer (API SDMX, CSV).
 * parametros: {
 *   dataflow: "AGÊNCIA,ID,VERSÃO" (ex.: "OECD.CTP.TPS,DSD_REV_COMP_GLOBAL@DF_RSGLOBAL,"),
 *   chave: o resto da chave SDMX depois da área (ex.: ".TAX_REV.S13._T._T.PT_B1GQ.A"),
 *   medias: { "código da área": "rótulo" } (ex.: { "A9": "América Latina e Caribe", "OECD_REP": "OCDE" }),
 *   anos: quantos anos para trás (padrão 15)
 * }
 * Guarda o Brasil, as médias pedidas e os países da América Latina e do G20.
 * https://gitlab.algobank.oecd.org/public-documentation/dotstat-migration/-/raw/main/OECD_Data_API_documentation.pdf
 */
import { baixarTexto, numero } from '../lib/http.mjs';
import { lerCsv } from '../lib/csv.mjs';
import { NOMES, paisesDosGrupos } from '../lib/paises.mjs';

export async function coletar(indicador) {
  const { dataflow, chave, medias = {}, anos = 15 } = indicador.fonte.parametros;
  if (!/^[\w.@,]+$/.test(dataflow || '') || !/^[\w.]*$/.test(chave || '')) throw new Error('parametros.dataflow e parametros.chave inválidos');

  const nomes = { ...medias };
  for (const c of paisesDosGrupos()) nomes[c] = NOMES[c];
  const desde = new Date().getFullYear() - anos;
  const url = `https://sdmx.oecd.org/public/rest/data/${dataflow}/${chave}` +
    `?startPeriod=${desde}&dimensionAtObservation=AllDimensions&format=csvfilewithlabels`;
  const texto = await baixarTexto(url, { tempoLimite: 180000, tentativas: 5 });

  return lerCsv(texto)
    .map((l) => ({ nome: nomes[l.REF_AREA], periodo: String(l.TIME_PERIOD), valor: numero(l.OBS_VALUE) }))
    .filter((o) => o.nome && o.valor != null && /^\d{4}$/.test(o.periodo))
    .map((o) => ({ local: 'BR', categoria: o.nome, periodo: o.periodo, valor: Math.round(o.valor * 100) / 100 }));
}
