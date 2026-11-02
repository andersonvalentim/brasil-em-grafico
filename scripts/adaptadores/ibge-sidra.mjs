/**
 * IBGE — API de agregados do SIDRA (v3).
 * parametros:
 *   tabela         número da tabela no SIDRA
 *   variavel       número da variável
 *   niveis         ["N1"] Brasil, "N3" estados, "N6" municípios, "N7" regiões metropolitanas
 *   periodos       quantos períodos mais recentes buscar (padrão 12)
 *   classificacao  { "<id>": "<categoria>" } para uma categoria, ou
 *                  { "<id>": { "<categoria>": "Rótulo" } } para virar `categoria` em cada observação
 *   modo           "fim-de-ano": guarda dezembro de cada ano e o mês mais recente do ano atual,
 *                  com período AAAA (usado no acumulado do ano)
 *   anos           quantos anos no modo "fim-de-ano" (padrão 6)
 * https://servicodados.ibge.gov.br/api/docs/agregados?versao=3
 */
import { baixarJson, numero } from '../lib/http.mjs';

const API = 'https://servicodados.ibge.gov.br/api/v3/agregados';

function periodoSite(id, periodicidade, modo) {
  const s = String(id);
  if (modo === 'fim-de-ano') return s.slice(0, 4);
  if (periodicidade === 'mensal') return `${s.slice(0, 4)}-${s.slice(4, 6)}`;
  if (periodicidade === 'trimestral') return `${s.slice(0, 4)}-T${Number(s.slice(4, 6))}`;
  return s;
}

async function periodosFimDeAno(tabela, anos) {
  const ids = (await baixarJson(`${API}/${tabela}/periodos`)).map((p) => String(p.id)).sort();
  const ultimo = ids[ids.length - 1];
  const anoAtual = ultimo.slice(0, 4);
  const dezembros = ids.filter((id) => id.endsWith('12') && id.slice(0, 4) !== anoAtual);
  const escolhidos = ultimo.endsWith('12') ? dezembros.slice(-anos) : [...dezembros.slice(-(anos - 1)), ultimo];
  return escolhidos.join('|');
}

export async function coletar(indicador, { locais }) {
  const p = indicador.fonte.parametros;
  if (!p.tabela || !p.variavel) throw new Error('parametros.tabela e parametros.variavel são obrigatórios');

  const ufPorCodigo = new Map(locais.estados.map((e) => [String(e.codigoIbge), e.uf]));
  const niveis = (p.niveis || ['N1']).map((n) => `${n}[all]`).join('|');
  const periodos = p.modo === 'fim-de-ano' ? await periodosFimDeAno(p.tabela, p.anos || 6) : `-${p.periodos || 12}`;

  const rotulos = {};
  let filtro = '';
  if (p.classificacao) {
    filtro = '&classificacao=' + Object.entries(p.classificacao)
      .map(([id, cat]) => {
        if (typeof cat === 'object') {
          Object.assign(rotulos, cat);
          return `${id}[${Object.keys(cat).join(',')}]`;
        }
        return `${id}[${cat}]`;
      })
      .join('|');
  }

  const url = `${API}/${p.tabela}/periodos/${periodos}/variaveis/${p.variavel}?localidades=${niveis}${filtro}`;
  const resposta = await baixarJson(url, { tempoLimite: 120000 });
  const observacoes = [];

  for (const resultado of resposta[0]?.resultados || []) {
    let categoria;
    for (const c of resultado.classificacoes || []) {
      const id = Object.keys(c.categoria)[0];
      if (rotulos[id]) categoria = rotulos[id];
    }
    for (const serie of resultado.series) {
      const loc = serie.localidade;
      const local = loc.nivel.id === 'N1' ? 'BR' : ufPorCodigo.get(String(loc.id).slice(0, 2));
      if (!local) continue;
      for (const [periodo, bruto] of Object.entries(serie.serie)) {
        const valor = numero(bruto);
        if (valor == null) continue;
        const o = { local, periodo: periodoSite(periodo, indicador.periodicidade, p.modo), valor };
        if (categoria) o.categoria = categoria;
        observacoes.push(o);
      }
    }
  }
  return observacoes;
}
