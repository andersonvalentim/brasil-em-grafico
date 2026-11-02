const AGENTE = 'BrasilEmGrafico/1.0 (+https://github.com/andersonvalentim/brasil-em-grafico)';

async function baixar(url, { tentativas = 3, tempoLimite = 60000 } = {}) {
  let ultimoErro;
  for (let i = 1; i <= tentativas; i++) {
    try {
      const resposta = await fetch(url, {
        headers: { 'User-Agent': AGENTE, Accept: '*/*' },
        redirect: 'follow',
        signal: AbortSignal.timeout(tempoLimite),
      });
      if (!resposta.ok) throw new Error(`HTTP ${resposta.status} em ${url}`);
      return resposta;
    } catch (err) {
      ultimoErro = err;
      if (i < tentativas) await new Promise((r) => setTimeout(r, 2000 * i));
    }
  }
  throw ultimoErro;
}

export async function baixarJson(url, opcoes) {
  return (await baixar(url, opcoes)).json();
}

export async function baixarBinario(url, opcoes) {
  return Buffer.from(await (await baixar(url, opcoes)).arrayBuffer());
}

/** "1.234,56" ou "1234.56" → número; vazio, "-" ou "..." → null. */
export function numero(texto) {
  if (typeof texto === 'number') return Number.isFinite(texto) ? texto : null;
  const t = String(texto ?? '').trim();
  if (!t || /^[-.x…]+$/i.test(t)) return null;
  const n = Number(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t);
  return Number.isFinite(n) ? n : null;
}

export function semAcento(texto) {
  return String(texto).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
}
