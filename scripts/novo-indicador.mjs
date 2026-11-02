#!/usr/bin/env node
import { writeFile, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, arr) => {
    if (cur.startsWith('--')) acc.push([cur.slice(2), arr[i + 1]]);
    return acc;
  }, [])
);

const id = args.id;
if (!id || !args.tema || !args.adaptador || !args.nome) {
  console.error('Uso: npm run novo-indicador -- --id <id> --tema <tema> --adaptador <nome> --nome "Pergunta"');
  process.exit(1);
}

const caminho = join(raiz, 'catalogo', 'indicadores', `${id}.json`);
try {
  await access(caminho);
  console.error(`Já existe: ${caminho}`);
  process.exit(1);
} catch {
  /* ok */
}

const ind = {
  id,
  status: 'rascunho',
  tema: args.tema,
  nome: args.nome,
  nomeTecnico: args.tecnico || args.nome,
  unidade: args.unidade || '%',
  formato: args.formato || 'pct',
  casas: Number(args.casas ?? 1),
  periodicidade: args.periodicidade || 'mensal',
  abrangencia: ['BR'],
  fonte: {
    orgao: args.orgao || '',
    nome: args.fonte || '',
    url: args.url || '',
    adaptador: args.adaptador,
    parametros: {},
  },
};

await writeFile(caminho, JSON.stringify(ind, null, 2) + '\n');
console.log(`Criado ${caminho} (status: rascunho)`);
console.log('Próximos passos: preencha fonte.parametros, rode npm run dados -- --so ' + id + ', e acrescente um cartão no tema.');
