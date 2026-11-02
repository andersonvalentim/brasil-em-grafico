#!/usr/bin/env node
import { readdir, readFile, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
let erros = 0;

function falha(msg) {
  console.error('✗', msg);
  erros++;
}

async function main() {
  const indDir = join(raiz, 'catalogo', 'indicadores');
  const temaDir = join(raiz, 'catalogo', 'temas');
  const site = JSON.parse(await readFile(join(raiz, 'catalogo', 'site.json'), 'utf8'));
  const indicadores = {};

  for (const arq of (await readdir(indDir)).filter((f) => f.endsWith('.json'))) {
    const ind = JSON.parse(await readFile(join(indDir, arq), 'utf8'));
    if (!ind.id) falha(`${arq}: falta id`);
    if (ind.id && arq !== `${ind.id}.json`) falha(`${arq}: nome do arquivo ≠ id`);
    if (!['ativo', 'rascunho', 'arquivado'].includes(ind.status)) falha(`${ind.id}: status inválido`);
    indicadores[ind.id] = ind;
    if (ind.status === 'ativo') {
      try {
        await access(join(raiz, 'dados', `${ind.id}.json`));
      } catch {
        falha(`${ind.id}: ativo sem dados/${ind.id}.json`);
      }
    }
  }

  for (const id of site.temas || []) {
    try {
      await access(join(temaDir, `${id}.json`));
    } catch {
      falha(`site.json referencia tema inexistente: ${id}`);
    }
  }

  for (const arq of (await readdir(temaDir)).filter((f) => f.endsWith('.json'))) {
    const tema = JSON.parse(await readFile(join(temaDir, arq), 'utf8'));
    for (const cartao of tema.cartoes || []) {
      if (!indicadores[cartao.indicador]) falha(`tema ${tema.id}: indicador desconhecido ${cartao.indicador}`);
      if (!cartao.visual) falha(`tema ${tema.id}: cartão sem visual (${cartao.indicador})`);
    }
  }

  if (erros) {
    console.error(`\n${erros} problema(s).`);
    process.exit(1);
  }
  console.log('✓ catálogo e dados ok');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
