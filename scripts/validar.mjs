#!/usr/bin/env node
import { readdir, readFile, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { paginasDesatualizadas } from './versao.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const ID_VALIDO = /^[a-z0-9-]+$/;
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
    if (ind.id && !ID_VALIDO.test(ind.id)) falha(`${arq}: id deve usar só letras minúsculas, números e hífen`);
    if (!['ativo', 'rascunho', 'arquivado'].includes(ind.status)) falha(`${ind.id}: status inválido`);
    if (ind.fonte?.url && !/^https?:\/\//.test(ind.fonte.url)) falha(`${ind.id}: fonte.url deve começar com https://`);
    if (ind.fonte?.adaptador && !ID_VALIDO.test(ind.fonte.adaptador)) falha(`${ind.id}: nome de adaptador inválido`);
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
    if (!ID_VALIDO.test(tema.id || '')) falha(`${arq}: id de tema inválido`);
    if (tema.icone && !ID_VALIDO.test(tema.icone)) falha(`tema ${tema.id}: nome de ícone inválido`);
    for (const cartao of tema.cartoes || []) {
      if (!indicadores[cartao.indicador]) falha(`tema ${tema.id}: indicador desconhecido ${cartao.indicador}`);
      if (!cartao.visual) {
        falha(`tema ${tema.id}: cartão sem visual (${cartao.indicador})`);
      } else if (!ID_VALIDO.test(cartao.visual)) {
        falha(`tema ${tema.id}: nome de visual inválido "${cartao.visual}"`);
      } else {
        try {
          await access(join(raiz, 'assets', 'js', 'visuais', `${cartao.visual}.js`));
        } catch {
          falha(`tema ${tema.id}: visual "${cartao.visual}" não existe em assets/js/visuais/`);
        }
      }
    }
  }

  for (const pagina of (await readdir(raiz)).filter((f) => f.endsWith('.html'))) {
    const html = await readFile(join(raiz, pagina), 'utf8');
    const csp = /http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(html);
    if (!csp) {
      falha(`${pagina}: falta a meta Content-Security-Policy`);
      continue;
    }
    for (const [, codigo] of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
      const hash = `'sha256-${createHash('sha256').update(codigo).digest('base64')}'`;
      if (!csp[1].includes(hash)) falha(`${pagina}: script embutido mudou; atualize o hash na CSP para ${hash}`);
    }
  }

  const { erradas } = await paginasDesatualizadas();
  if (erradas.length) falha(`versão do CSS/JS desatualizada em ${erradas.join(', ')}: rode npm run versao`);

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
