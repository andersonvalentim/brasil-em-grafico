#!/usr/bin/env node
/**
 * Coletor: para cada indicador em catalogo/indicadores/, chama o adaptador da fonte
 * (scripts/adaptadores/<nome>.mjs) e grava dados/<id>.json.
 * Se a coleta de um indicador falhar, o arquivo anterior é mantido.
 *
 * Uso: npm run dados                 todos os indicadores ativos e em rascunho
 *      npm run dados -- --so <id>    só um indicador
 */
import { readdir, readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const so = (() => {
  const i = process.argv.indexOf('--so');
  return i >= 0 ? process.argv[i + 1] : null;
})();

const PERIODO_VALIDO = /^\d{4}(-\d{2}(-\d{2})?|-T[1-4])?$/;

async function listarIndicadores() {
  const dir = join(raiz, 'catalogo', 'indicadores');
  const lista = [];
  for (const arq of (await readdir(dir)).filter((f) => f.endsWith('.json'))) {
    const ind = JSON.parse(await readFile(join(dir, arq), 'utf8'));
    if (ind.status === 'arquivado') continue;
    if (so && ind.id !== so) continue;
    lista.push(ind);
  }
  return lista;
}

async function carregarAdaptador(nome) {
  if (!/^[a-z0-9-]+$/.test(nome || '')) return null;
  const caminho = join(raiz, 'scripts', 'adaptadores', `${nome}.mjs`);
  try {
    await access(caminho);
  } catch {
    return null;
  }
  return import(pathToFileURL(caminho).href);
}

function conferir(ind, observacoes, locaisValidos) {
  if (!Array.isArray(observacoes) || !observacoes.length) throw new Error('a fonte não devolveu nenhum número');
  for (const o of observacoes) {
    if (!locaisValidos.has(o.local)) throw new Error(`local desconhecido: ${o.local}`);
    if (!PERIODO_VALIDO.test(o.periodo)) throw new Error(`período em formato inesperado: ${o.periodo}`);
    if (typeof o.valor !== 'number' || !Number.isFinite(o.valor)) throw new Error(`valor inválido em ${o.local} ${o.periodo}`);
  }
  if (!observacoes.some((o) => o.local === 'BR') && ind.abrangencia?.includes('BR')) {
    throw new Error('faltam os números do Brasil');
  }
}

async function main() {
  await mkdir(join(raiz, 'dados'), { recursive: true });
  const locais = JSON.parse(await readFile(join(raiz, 'catalogo', 'locais.json'), 'utf8'));
  const locaisValidos = new Set(['BR', ...locais.estados.map((e) => e.uf)]);
  const indicadores = await listarIndicadores();
  if (!indicadores.length) {
    console.error(so ? `Indicador não encontrado: ${so}` : 'Nenhum indicador ativo ou em rascunho.');
    process.exit(1);
  }

  let ok = 0;
  let falhas = 0;
  for (const ind of indicadores) {
    const saida = join(raiz, 'dados', `${ind.id}.json`);
    const mod = await carregarAdaptador(ind.fonte?.adaptador);
    if (!mod?.coletar) {
      console.warn(`! ${ind.id}: adaptador "${ind.fonte?.adaptador || '?'}" não existe em scripts/adaptadores/`);
      falhas++;
      continue;
    }

    try {
      const inicio = Date.now();
      const resultado = await mod.coletar(ind, { locais });
      const observacoes = Array.isArray(resultado) ? resultado : resultado?.observacoes;
      conferir(ind, observacoes, locaisValidos);
      observacoes.sort((a, b) =>
        a.periodo < b.periodo ? -1 : a.periodo > b.periodo ? 1 : a.local < b.local ? -1 : a.local > b.local ? 1 : 0
      );
      const payload = {
        id: ind.id,
        geradoEm: new Date().toISOString(),
        origem: 'api',
        fonte: ind.fonte.url,
        ultimoPeriodo: observacoes[observacoes.length - 1].periodo,
        observacoes,
      };
      if (resultado?.extras) payload.extras = resultado.extras;

      const anterior = await readFile(saida, 'utf8').then(JSON.parse, () => null);
      const mesmosNumeros = (d) => JSON.stringify([d.origem, d.observacoes, d.extras ?? null]);
      if (anterior && mesmosNumeros(anterior) === mesmosNumeros(payload)) {
        console.log(`= ${ind.id}: sem números novos (último: ${payload.ultimoPeriodo})`);
        ok++;
        continue;
      }
      await writeFile(saida, JSON.stringify(payload, null, 1) + '\n');
      console.log(`✓ ${ind.id}: ${observacoes.length} números, até ${payload.ultimoPeriodo} (${((Date.now() - inicio) / 1000).toFixed(1)}s)`);
      ok++;
    } catch (err) {
      console.error(`✗ ${ind.id}: ${err.message} — mantido o arquivo anterior`);
      falhas++;
    }
  }

  console.log(`\nPronto: ${ok} atualizado(s), ${falhas} com falha.`);
  if (!ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
