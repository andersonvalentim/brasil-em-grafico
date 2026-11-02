#!/usr/bin/env node
/**
 * Coletor mínimo: mantém dados/ existentes e avisa quando o adaptador ainda não existe.
 * Um coletor completo (IBGE/BCB/ANP/ANEEL) pode substituir este arquivo.
 */
import { readdir, readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const so = (() => {
  const i = process.argv.indexOf('--so');
  return i >= 0 ? process.argv[i + 1] : null;
})();

async function listarIndicadores() {
  const dir = join(raiz, 'catalogo', 'indicadores');
  const arquivos = (await readdir(dir)).filter((f) => f.endsWith('.json'));
  const lista = [];
  for (const arq of arquivos) {
    const ind = JSON.parse(await readFile(join(dir, arq), 'utf8'));
    if (ind.status === 'arquivado') continue;
    if (so && ind.id !== so) continue;
    lista.push(ind);
  }
  return lista;
}

async function carregarAdaptador(nome) {
  const caminho = join(raiz, 'scripts', 'adaptadores', `${nome}.mjs`);
  try {
    await access(caminho);
  } catch {
    return null;
  }
  return import(pathToFileURL(caminho).href);
}

async function main() {
  await mkdir(join(raiz, 'dados'), { recursive: true });
  const indicadores = await listarIndicadores();
  if (!indicadores.length) {
    console.error(so ? `Indicador não encontrado: ${so}` : 'Nenhum indicador ativo/rascunho.');
    process.exit(1);
  }

  let ok = 0;
  let pulados = 0;
  for (const ind of indicadores) {
    const saida = join(raiz, 'dados', `${ind.id}.json`);
    const adaptadorNome = ind.fonte?.adaptador;
    const mod = adaptadorNome ? await carregarAdaptador(adaptadorNome) : null;

    if (!mod?.coletar) {
      try {
        await access(saida);
        console.log(`· ${ind.id}: mantido (adaptador "${adaptadorNome || '?'}" ainda não disponível)`);
        pulados++;
        continue;
      } catch {
        console.warn(`! ${ind.id}: sem adaptador e sem dados/ — rode depois ou use origem exemplo`);
        pulados++;
        continue;
      }
    }

    try {
      const observacoes = await mod.coletar(ind);
      if (!Array.isArray(observacoes) || !observacoes.length) {
        throw new Error('adaptador devolveu lista vazia');
      }
      const periodos = observacoes.map((o) => o.periodo).filter(Boolean).sort();
      const payload = {
        id: ind.id,
        geradoEm: new Date().toISOString(),
        origem: 'api',
        ultimoPeriodo: periodos[periodos.length - 1] || null,
        observacoes,
      };
      await writeFile(saida, JSON.stringify(payload, null, 2) + '\n');
      console.log(`✓ ${ind.id}: ${observacoes.length} observações (${payload.ultimoPeriodo})`);
      ok++;
    } catch (err) {
      console.error(`✗ ${ind.id}: ${err.message}`);
      pulados++;
    }
  }

  console.log(`\nPronto: ${ok} atualizado(s), ${pulados} mantido(s)/pulado(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
