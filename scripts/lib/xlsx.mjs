/**
 * Leitor mínimo de planilhas .xlsx, sem dependências: lê o ZIP, a tabela de textos
 * compartilhados e a primeira aba. Suficiente para as planilhas tabulares das fontes oficiais.
 */
import { inflateRawSync } from 'node:zlib';

function lerZip(buffer) {
  let fim = buffer.length - 22;
  while (fim >= 0 && buffer.readUInt32LE(fim) !== 0x06054b50) fim--;
  if (fim < 0) throw new Error('arquivo não é um .xlsx válido');
  const total = buffer.readUInt16LE(fim + 10);
  let p = buffer.readUInt32LE(fim + 16);
  const entradas = new Map();
  for (let i = 0; i < total; i++) {
    if (buffer.readUInt32LE(p) !== 0x02014b50) throw new Error('diretório do ZIP corrompido');
    const metodo = buffer.readUInt16LE(p + 10);
    const tamanho = buffer.readUInt32LE(p + 20);
    const nomeLen = buffer.readUInt16LE(p + 28);
    const extraLen = buffer.readUInt16LE(p + 30);
    const comentarioLen = buffer.readUInt16LE(p + 32);
    const local = buffer.readUInt32LE(p + 42);
    const nome = buffer.toString('utf8', p + 46, p + 46 + nomeLen);
    entradas.set(nome, { metodo, tamanho, local });
    p += 46 + nomeLen + extraLen + comentarioLen;
  }
  return (nome) => {
    const e = entradas.get(nome);
    if (!e) return null;
    const inicio = e.local + 30 + buffer.readUInt16LE(e.local + 26) + buffer.readUInt16LE(e.local + 28);
    const dados = buffer.subarray(inicio, inicio + e.tamanho);
    return (e.metodo === 8 ? inflateRawSync(dados) : dados).toString('utf8');
  };
}

const ENTIDADES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
function texto(xml) {
  return xml
    .replace(/<[^>]+>/g, '')
    .replace(/&(amp|lt|gt|quot|apos);/g, (_, e) => ENTIDADES[e])
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function coluna(ref) {
  let n = 0;
  for (const ch of ref.replace(/\d+/g, '')) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

/** Devolve as linhas da primeira aba como listas de valores (texto ou número). */
export function lerPlanilha(buffer) {
  const abrir = lerZip(buffer);
  const compartilhados = [];
  const sst = abrir('xl/sharedStrings.xml');
  if (sst) for (const m of sst.matchAll(/<si>([\s\S]*?)<\/si>/g)) compartilhados.push(texto(m[1]));

  const aba = abrir('xl/worksheets/sheet1.xml');
  if (!aba) throw new Error('planilha sem a primeira aba');
  const linhas = [];
  for (const linha of aba.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const valores = [];
    for (const c of linha[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = c[1];
      const ref = /\br="([A-Z]+\d+)"/.exec(attrs);
      const tipo = (/\bt="(\w+)"/.exec(attrs) || [])[1];
      const corpo = c[2] || '';
      const v = (/<v>([\s\S]*?)<\/v>/.exec(corpo) || [])[1];
      let valor = null;
      if (tipo === 's' && v != null) valor = compartilhados[Number(v)];
      else if (tipo === 'inlineStr') valor = texto(corpo);
      else if (tipo === 'str' && v != null) valor = texto(v);
      else if (v != null) valor = Number(v);
      valores[ref ? coluna(ref[1]) : valores.length] = valor;
    }
    linhas.push(valores);
  }
  return linhas;
}

/** Converte o número de série de data do Excel para AAAA-MM-DD. */
export function dataExcel(serie) {
  const ms = Math.round((Number(serie) - 25569) * 86400000);
  return new Date(ms).toISOString().slice(0, 10);
}
