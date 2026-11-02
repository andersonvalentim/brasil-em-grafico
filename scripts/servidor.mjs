#!/usr/bin/env node
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, normalize, extname, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const porta = Number(process.env.PORTA || 8642);
const host = '127.0.0.1';

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

const servidor = createServer(async (req, res) => {
  try {
    const caminhoUrl = decodeURIComponent(new URL(req.url, `http://${host}`).pathname);
    let arquivo = normalize(join(raiz, caminhoUrl));
    if (arquivo !== raiz && !arquivo.startsWith(raiz + sep)) {
      res.writeHead(403).end('Proibido');
      return;
    }
    if (arquivo.split(sep).some((parte) => parte.startsWith('.') && parte !== '.')) {
      res.writeHead(404).end('Não encontrado');
      return;
    }
    if ((await stat(arquivo)).isDirectory()) arquivo = join(arquivo, 'index.html');
    const corpo = await readFile(arquivo);
    res.writeHead(200, {
      'Content-Type': TIPOS[extname(arquivo)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(corpo);
  } catch {
    res.writeHead(404).end('Não encontrado');
  }
});

servidor.listen(porta, host, () => {
  console.log(`Brasil em Gráfico em http://${host}:${porta}`);
});
