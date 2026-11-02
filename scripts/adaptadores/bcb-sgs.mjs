/**
 * Banco Central do Brasil — Sistema Gerenciador de Séries Temporais (SGS).
 * parametros: { serie: número da série no SGS, dias: quantos dias para trás buscar }
 * https://dadosabertos.bcb.gov.br/dataset/sgs
 */
import { baixarJson, numero } from '../lib/http.mjs';

function dataBr(d) {
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
}

export async function coletar(indicador) {
  const { serie, dias = 365 } = indicador.fonte.parametros;
  if (!Number.isInteger(serie)) throw new Error('parametros.serie deve ser o número da série do SGS');

  const hoje = new Date();
  const inicio = new Date(hoje.getTime() - dias * 86400000);
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${serie}/dados?formato=json&dataInicial=${dataBr(inicio)}&dataFinal=${dataBr(hoje)}`;
  const linhas = await baixarJson(url);
  const limite = hoje.toISOString().slice(0, 10);

  return linhas
    .map((l) => {
      const [d, m, a] = l.data.split('/');
      return { local: 'BR', periodo: `${a}-${m}-${d}`, valor: numero(l.valor) };
    })
    .filter((o) => o.valor != null && o.periodo <= limite);
}
