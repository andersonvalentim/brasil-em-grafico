#!/usr/bin/env node
/**
 * Carimba a versão dos arquivos de CSS e JS nas páginas (assets/...?v=<versão>),
 * para que o navegador baixe o código novo assim que ele mudar.
 * A versão é uma impressão digital do conteúdo de assets/css e assets/js.
 *
 * Uso: npm run versao            atualiza as páginas
 *      node scripts/versao.mjs --conferir   só confere (usado pelo npm run validar)
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const REFERENCIA = /(assets\/(?:css|js)\/[\w/-]+\.(?:css|js))(?:\?v=[\w-]+)?/g;

async function arquivos(dir) {
  const saida = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const caminho = join(dir, e.name);
    if (e.isDirectory()) saida.push(...(await arquivos(caminho)));
    else if (/\.(css|js)$/.test(e.name)) saida.push(caminho);
  }
  return saida.sort();
}

export async function versaoAtual() {
  const hash = createHash('sha256');
  for (const f of [...(await arquivos(join(raiz, 'assets', 'css'))), ...(await arquivos(join(raiz, 'assets', 'js')))]) {
    hash.update(f.slice(raiz.length));
    hash.update(await readFile(f));
  }
  return hash.digest('hex').slice(0, 10);
}

export async function paginasDesatualizadas() {
  const versao = await versaoAtual();
  const erradas = [];
  for (const pagina of (await readdir(raiz)).filter((f) => f.endsWith('.html'))) {
    const html = await readFile(join(raiz, pagina), 'utf8');
    const refs = [...html.matchAll(REFERENCIA)];
    if (refs.some((m) => !m[0].endsWith(`?v=${versao}`))) erradas.push(pagina);
  }
  return { versao, erradas };
}

async function carimbar() {
  const versao = await versaoAtual();
  for (const pagina of (await readdir(raiz)).filter((f) => f.endsWith('.html'))) {
    const caminho = join(raiz, pagina);
    const html = await readFile(caminho, 'utf8');
    const novo = html.replace(REFERENCIA, `$1?v=${versao}`);
    if (novo !== html) {
      await writeFile(caminho, novo);
      console.log(`✓ ${pagina}`);
    }
  }
  console.log(`Versão dos arquivos: ${versao}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--conferir')) {
    const { versao, erradas } = await paginasDesatualizadas();
    if (erradas.length) {
      console.error(`✗ versão dos arquivos desatualizada em: ${erradas.join(', ')} (rode npm run versao)`);
      process.exit(1);
    }
    console.log(`✓ versão ${versao} em todas as páginas`);
  } else {
    await carimbar();
  }
}
