/**
 * ANP — Levantamento de Preços de Combustíveis (série histórica semanal).
 * parametros: { produto: nome do produto na planilha (ex.: "GASOLINA COMUM"), semanas: quantas semanas guardar }
 * https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/precos-revenda-e-de-distribuicao-combustiveis/serie-historica-do-levantamento-de-precos
 */
import { baixarBinario, numero, semAcento } from '../lib/http.mjs';
import { lerPlanilha, dataExcel } from '../lib/xlsx.mjs';

const BASE = 'https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/precos-revenda-e-de-distribuicao-combustiveis/shlp/semanal';

function tabela(linhas) {
  const i = linhas.findIndex((l) => l[0] === 'DATA INICIAL');
  if (i < 0) throw new Error('cabeçalho não encontrado na planilha da ANP');
  const cab = linhas[i];
  const col = (nome) => {
    const c = cab.indexOf(nome);
    if (c < 0) throw new Error(`coluna "${nome}" não encontrada na planilha da ANP`);
    return c;
  };
  return { linhas: linhas.slice(i + 1), col };
}

export async function coletar(indicador, { locais }) {
  const { produto, semanas = 60 } = indicador.fonte.parametros;
  if (!produto) throw new Error('parametros.produto é obrigatório');

  const ufPorNome = new Map(locais.estados.map((e) => [semAcento(e.nome), e.uf]));
  const [estados, brasil] = await Promise.all([
    baixarBinario(`${BASE}/semanal-estados-desde-2013.xlsx`, { tempoLimite: 180000 }),
    baixarBinario(`${BASE}/semanal-brasil-desde-2013.xlsx`, { tempoLimite: 120000 }),
  ]);

  const observacoes = [];
  const fontes = [
    [brasil, () => 'BR'],
    [estados, (l, col) => ufPorNome.get(semAcento(l[col('ESTADO')] || ''))],
  ];
  for (const [arquivo, localDe] of fontes) {
    const { linhas, col } = tabela(lerPlanilha(arquivo));
    const cFim = col('DATA FINAL');
    const cProduto = col('PRODUTO');
    const cPreco = col('PREÇO MÉDIO REVENDA');
    for (const l of linhas) {
      if (l[cProduto] !== produto || typeof l[cFim] !== 'number') continue;
      const local = localDe(l, col);
      const valor = numero(l[cPreco]);
      if (local && valor != null) observacoes.push({ local, periodo: dataExcel(l[cFim]), valor });
    }
  }

  const periodos = [...new Set(observacoes.map((o) => o.periodo))].sort().slice(-semanas);
  const manter = new Set(periodos);
  return observacoes.filter((o) => manter.has(o.periodo));
}
