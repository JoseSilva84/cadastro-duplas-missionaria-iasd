const NOME_BANCO = 'pcm-pwa';
const VERSAO_BANCO = 1;
const LOJA_RESPOSTAS = 'respostas';
const RETENCAO_PADRAO_MS = 30 * 24 * 60 * 60 * 1000;

let bancoPromise = null;

function abrirBanco() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  if (bancoPromise) return bancoPromise;

  bancoPromise = new Promise((resolve, reject) => {
    const requisicao = indexedDB.open(NOME_BANCO, VERSAO_BANCO);
    requisicao.onupgradeneeded = () => {
      const banco = requisicao.result;
      if (!banco.objectStoreNames.contains(LOJA_RESPOSTAS)) {
        const loja = banco.createObjectStore(LOJA_RESPOSTAS, { keyPath: 'chave' });
        loja.createIndex('usuarioId', 'usuarioId', { unique: false });
        loja.createIndex('salvoEm', 'salvoEm', { unique: false });
      }
    };
    requisicao.onsuccess = () => resolve(requisicao.result);
    requisicao.onerror = () => reject(requisicao.error);
  }).catch((erro) => {
    console.warn('[PWA] O cache local não pôde ser aberto.', erro);
    bancoPromise = null;
    return null;
  });

  return bancoPromise;
}

function executarNaLoja(modo, operacao) {
  return abrirBanco().then((banco) => {
    if (!banco) return null;
    return new Promise((resolve, reject) => {
      const transacao = banco.transaction(LOJA_RESPOSTAS, modo);
      const loja = transacao.objectStore(LOJA_RESPOSTAS);
      const requisicao = operacao(loja);
      requisicao.onsuccess = () => resolve(requisicao.result ?? null);
      requisicao.onerror = () => reject(requisicao.error);
    });
  }).catch((erro) => {
    console.warn('[PWA] Falha ao acessar o cache local.', erro);
    return null;
  });
}

export function chaveCacheUsuario(usuario, recurso) {
  const identidade = usuario?.id || usuario?.email || 'anonimo';
  return `usuario:${identidade}:${recurso}`;
}

export async function lerCacheLocal(chave, retencaoMs = RETENCAO_PADRAO_MS) {
  const registro = await executarNaLoja('readonly', (loja) => loja.get(chave));
  if (!registro) return null;
  if (retencaoMs > 0 && Date.now() - Number(registro.salvoEm || 0) > retencaoMs) {
    await removerCacheLocal(chave);
    return null;
  }
  return registro;
}

export function salvarCacheLocal(chave, dados, usuario) {
  return executarNaLoja('readwrite', (loja) => loja.put({
    chave,
    usuarioId: String(usuario?.id || usuario?.email || 'anonimo'),
    salvoEm: Date.now(),
    dados,
  }));
}

export function removerCacheLocal(chave) {
  return executarNaLoja('readwrite', (loja) => loja.delete(chave));
}

export async function limparCacheDoUsuario(usuario) {
  const usuarioId = String(usuario?.id || usuario?.email || 'anonimo');
  const banco = await abrirBanco();
  if (!banco) return;

  await new Promise((resolve, reject) => {
    const transacao = banco.transaction(LOJA_RESPOSTAS, 'readwrite');
    const indice = transacao.objectStore(LOJA_RESPOSTAS).index('usuarioId');
    const cursor = indice.openCursor(IDBKeyRange.only(usuarioId));
    cursor.onsuccess = () => {
      const atual = cursor.result;
      if (!atual) return;
      atual.delete();
      atual.continue();
    };
    transacao.oncomplete = resolve;
    transacao.onerror = () => reject(transacao.error);
  }).catch((erro) => console.warn('[PWA] Falha ao limpar dados locais.', erro));
}

export async function resumoCacheLocal(usuario) {
  const usuarioId = String(usuario?.id || usuario?.email || 'anonimo');
  const banco = await abrirBanco();
  if (!banco) return { itens: 0, salvoEm: null };

  return new Promise((resolve, reject) => {
    let itens = 0;
    let salvoEm = null;
    const transacao = banco.transaction(LOJA_RESPOSTAS, 'readonly');
    const indice = transacao.objectStore(LOJA_RESPOSTAS).index('usuarioId');
    const cursor = indice.openCursor(IDBKeyRange.only(usuarioId));
    cursor.onsuccess = () => {
      const atual = cursor.result;
      if (!atual) return;
      itens += 1;
      salvoEm = Math.max(salvoEm || 0, Number(atual.value.salvoEm || 0));
      atual.continue();
    };
    transacao.oncomplete = () => resolve({ itens, salvoEm });
    transacao.onerror = () => reject(transacao.error);
  }).catch(() => ({ itens: 0, salvoEm: null }));
}
