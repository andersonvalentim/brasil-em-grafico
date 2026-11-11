/**
 * BIS — Banco de Compensações Internacionais (API de estatísticas, SDMX em CSV).
 * parametros: { dataflow: ex. "WS_CBPOL", frequencia: "M", meses: quantos meses guardar (padrão 36) }
 * Guarda o Brasil, a zona do euro e os países da América Latina e do G20 que o BIS publica.
 * https://stats.bis.org/api-doc/v2/
 */
import { baixarTexto, numero } from '../lib/http.mjs';
import { lerCsv } from '../lib/csv.mjs';
import { NOMES, ISO2, paisesDosGrupos } from '../lib/paises.mjs';

export async function coletar(indicador) {
  const { dataflow, frequencia = 'M', meses = 36 } = indicador.fonte.parametros;
  if (!/^[A-Z0-9_]+$/.test(dataflow || '')) throw new Error('parametros.dataflow inválido');

  const nomes = { XM: 'Zona do euro' };
  for (const c of paisesDosGrupos()) if (ISO2[c]) nomes[ISO2[c]] = NOMES[c];
  const inicio = new Date();
  inicio.setUTCMonth(inicio.getUTCMonth() - meses);
  const url = `https://stats.bis.org/api/v2/data/dataflow/BIS/${dataflow}/1.0/${frequencia}.${Object.keys(nomes).join('+')}` +
    `?startPeriod=${inicio.toISOString().slice(0, 7)}&format=csv`;
  const texto = await baixarTexto(url, { tempoLimite: 120000 });

  return lerCsv(texto)
    .map((l) => ({ nome: nomes[l.REF_AREA], periodo: String(l.TIME_PERIOD), valor: numero(l.OBS_VALUE) }))
    .filter((o) => o.nome && o.valor != null && /^\d{4}-\d{2}$/.test(o.periodo))
    .map((o) => ({ local: 'BR', categoria: o.nome, periodo: o.periodo, valor: o.valor }));
}
