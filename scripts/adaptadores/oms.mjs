/**
 * OMS — Global Health Observatory (API OData).
 * parametros: { indicador: código do GHO (ex.: "MDG_0000000001"), filtro: condição OData extra (ex.: "Dim1 eq 'SEX_BTSX'"), anos }
 * Guarda o Brasil, a média das Américas (região da OMS, que inclui Estados Unidos e Canadá), a média mundial
 * e os países da América Latina e do G20.
 * https://www.who.int/data/gho/info/gho-odata-api
 */
import { baixarJson, numero } from '../lib/http.mjs';
import { NOMES, MEDIA_MUNDO, MEDIA_AMERICAS, paisesDosGrupos } from '../lib/paises.mjs';

const GRUPOS = { GLOBAL: MEDIA_MUNDO, AMR: MEDIA_AMERICAS };

export async function coletar(indicador) {
  const { indicador: codigo, filtro = '', anos = 15 } = indicador.fonte.parametros;
  if (!/^[A-Za-z0-9_]+$/.test(codigo || '')) throw new Error('parametros.indicador deve ser um código do GHO');
  if (/[;&]/.test(filtro)) throw new Error('parametros.filtro inválido');

  const nomes = { ...GRUPOS };
  for (const c of paisesDosGrupos()) nomes[c] = NOMES[c];
  const areas = Object.keys(nomes).map((c) => `'${c}'`).join(',');
  const condicao = [`SpatialDim in (${areas})`, `TimeDim ge ${new Date().getFullYear() - anos}`, filtro].filter(Boolean).join(' and ');
  const j = await baixarJson(`https://ghoapi.azureedge.net/api/${codigo}?$filter=${encodeURIComponent(condicao)}`, { tempoLimite: 120000 });

  return (j.value || [])
    .map((r) => ({ nome: nomes[r.SpatialDim], periodo: String(r.TimeDim), valor: numero(r.NumericValue) }))
    .filter((o) => o.nome && o.valor != null)
    .map((o) => ({ local: 'BR', categoria: o.nome, periodo: o.periodo, valor: Math.round(o.valor * 100) / 100 }));
}
