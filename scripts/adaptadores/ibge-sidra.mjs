/**
 * IBGE — API de valores do SIDRA (apisidra.ibge.gov.br).
 * A API v3 (servicodados) não responde fora do Brasil, então a automação no GitHub usa esta.
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
 *   escala         multiplica cada valor (ex.: 1000 para tabelas em "mil pessoas")
 *   trimestresFechados  em tabelas de trimestre móvel (mês final AAAAMM), guarda só março, junho,
 *                  setembro e dezembro, como trimestres do calendário (AAAA-Tn)
 *   consultas      lista de consultas a juntar num só indicador; cada item traz "categoria" (o rótulo)
 *                  e os campos acima que mudam (tabela, variavel, classificacao, escala...)
 * https://apisidra.ibge.gov.br/home/ajuda
 */
import { baixarJson, numero } from '../lib/http.mjs';

const API = 'https://apisidra.ibge.gov.br/values';

function periodoSite(id, periodicidade) {
  const s = String(id);
  if (periodicidade === 'mensal') return `${s.slice(0, 4)}-${s.slice(4, 6)}`;
  if (periodicidade === 'trimestral') return `${s.slice(0, 4)}-T${Number(s.slice(4, 6))}`;
  return s;
}

function fimDeAno(observacoes, anos) {
  const ultimo = observacoes.reduce((m, o) => (o.periodo > m ? o.periodo : m), '');
  const anoAtual = ultimo.slice(0, 4);
  const guardar = (o) => o.periodo === ultimo || (o.periodo.endsWith('12') && o.periodo.slice(0, 4) !== anoAtual);
  const escolhidas = observacoes.filter(guardar).map((o) => ({ ...o, periodo: o.periodo.slice(0, 4) }));
  const manter = new Set([...new Set(escolhidas.map((o) => o.periodo))].sort().slice(-anos));
  const resultado = { observacoes: escolhidas.filter((o) => manter.has(o.periodo)) };
  if (!ultimo.endsWith('12')) resultado.notas = { anoParcialAte: `${ultimo.slice(0, 4)}-${ultimo.slice(4, 6)}` };
  return resultado;
}

export async function coletar(indicador, { locais }) {
  const p = indicador.fonte.parametros;
  const ufPorCodigo = new Map(locais.estados.map((e) => [String(e.codigoIbge), e.uf]));
  if (!Array.isArray(p.consultas)) return consultar(p, indicador, ufPorCodigo);

  const observacoes = [];
  for (const c of p.consultas) {
    if (!c.categoria) throw new Error('cada item de parametros.consultas precisa de "categoria"');
    const parcial = await consultar({ ...p, consultas: undefined, ...c }, indicador, ufPorCodigo);
    for (const o of Array.isArray(parcial) ? parcial : parcial.observacoes) observacoes.push({ ...o, categoria: c.categoria });
  }
  return observacoes;
}

async function consultar(p, indicador, ufPorCodigo) {
  if (!p.tabela || !p.variavel) throw new Error('parametros.tabela e parametros.variavel são obrigatórios');

  const niveis = (p.niveis || ['N1']).map((n) => `${n.toLowerCase()}/all`).join('/');
  const quantos = (p.periodos || 12) * (p.trimestresFechados ? 3 : 1);
  const periodos = p.modo === 'fim-de-ano' ? 'all' : `last%20${quantos}`;
  const escala = Number(p.escala || 1);

  const rotulos = {};
  let filtro = '';
  for (const [id, cat] of Object.entries(p.classificacao || {})) {
    if (typeof cat === 'object') {
      Object.assign(rotulos, cat);
      filtro += `/c${id}/${Object.keys(cat).join(',')}`;
    } else {
      filtro += `/c${id}/${cat}`;
    }
  }

  const url = `${API}/t/${p.tabela}/${niveis}/v/${p.variavel}/p/${periodos}${filtro}`;
  const [, ...linhas] = await baixarJson(url, { tempoLimite: 120000 });
  const observacoes = [];

  for (const l of linhas) {
    const local = l.NC === '1' ? 'BR' : ufPorCodigo.get(String(l.D1C).slice(0, 2));
    const bruto = numero(l.V);
    if (!local || bruto == null) continue;
    const o = { local, periodo: String(l.D3C), valor: escala === 1 ? bruto : Math.round(bruto * escala) };
    if (rotulos[l.D4C]) o.categoria = rotulos[l.D4C];
    observacoes.push(o);
  }

  if (p.modo === 'fim-de-ano') return fimDeAno(observacoes, p.anos || 6);
  if (p.trimestresFechados) {
    const fechados = trimestresFechados(observacoes);
    const manter = new Set([...new Set(fechados.map((o) => o.periodo))].slice(-(p.periodos || 12)));
    return fechados.filter((o) => manter.has(o.periodo));
  }
  return observacoes.map((o) => ({ ...o, periodo: periodoSite(o.periodo, indicador.periodicidade) }));
}

/** Séries mensais de trimestre móvel (AAAAMM = mês final): guarda só os trimestres do calendário. */
function trimestresFechados(observacoes) {
  return observacoes
    .filter((o) => ['03', '06', '09', '12'].includes(o.periodo.slice(4, 6)))
    .map((o) => ({ ...o, periodo: `${o.periodo.slice(0, 4)}-T${Number(o.periodo.slice(4, 6)) / 3}` }))
    .sort((a, b) => (a.periodo < b.periodo ? -1 : a.periodo > b.periodo ? 1 : 0));
}
