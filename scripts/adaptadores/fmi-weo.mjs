/**
 * FMI — World Economic Outlook (DataMapper API).
 * parametros: { indicador: código do WEO (ex.: "NGDP_RPCH"), anos: quantos anos para trás (padrão 12) }
 * Guarda o Brasil, a média da América Latina e Caribe, a média do mundo e os países da América Latina e do G20.
 * Os anos a partir do ano corrente são projeções do FMI e saem marcados com "projecao": true.
 * https://www.imf.org/external/datamapper/api/help
 */
import { baixarJson, numero } from '../lib/http.mjs';
import { NOMES, MEDIA_AMERICA_LATINA, MEDIA_MUNDO, paisesDosGrupos } from '../lib/paises.mjs';

const GRUPOS = { WE: MEDIA_AMERICA_LATINA, WEOWORLD: MEDIA_MUNDO };

export async function coletar(indicador) {
  const { indicador: codigo, anos = 12, projecoes = 2 } = indicador.fonte.parametros;
  if (!/^[A-Z0-9_]+$/.test(codigo || '')) throw new Error('parametros.indicador deve ser um código do WEO');

  const j = await baixarJson(`https://www.imf.org/external/datamapper/api/v1/${codigo}`, { tempoLimite: 120000 });
  const valores = j?.values?.[codigo];
  if (!valores) throw new Error(`o FMI não devolveu o indicador ${codigo}`);

  const anoAtual = new Date().getFullYear();
  const desde = anoAtual - anos;
  const ate = anoAtual + projecoes - 1;
  const nomes = { ...GRUPOS };
  for (const c of paisesDosGrupos()) nomes[c] = NOMES[c];

  const observacoes = [];
  for (const [cod, nome] of Object.entries(nomes)) {
    for (const [ano, bruto] of Object.entries(valores[cod] || {})) {
      const a = Number(ano);
      const valor = numero(bruto);
      if (valor == null || a < desde || a > ate) continue;
      const o = { local: 'BR', categoria: nome, periodo: String(a), valor };
      if (a >= anoAtual) o.projecao = true;
      observacoes.push(o);
    }
  }
  return { observacoes, notas: { projecaoDesde: String(anoAtual) } };
}
