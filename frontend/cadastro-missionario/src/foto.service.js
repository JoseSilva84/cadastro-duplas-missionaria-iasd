import { firebaseConfig, firestoreRestBaseUrl } from "./firebase";

const COLLECTION_NAME = "fotos_membros";
const REF_PREFIX = `firebase:${COLLECTION_NAME}/`;

const isBase64Image = (value) => typeof value === "string" && value.startsWith("data:image/");

const criarFotoId = (duplaId, tipo) => `dupla_${duplaId}_${tipo}`;

const criarReferencia = (fotoId) => `${REF_PREFIX}${fotoId}`;

const extrairFotoId = (referencia) => (
  typeof referencia === "string" && referencia.startsWith(REF_PREFIX)
    ? referencia.slice(REF_PREFIX.length)
    : null
);

const getDocumentoUrl = (fotoId) => {
  const docId = encodeURIComponent(fotoId);
  const apiKey = encodeURIComponent(firebaseConfig.apiKey || "");
  return `${firestoreRestBaseUrl}/${COLLECTION_NAME}/${docId}?key=${apiKey}`;
};

const assertFirebaseConfig = () => {
  const valores = [firebaseConfig.apiKey, firebaseConfig.projectId];
  const temPlaceholder = valores.some((valor) => typeof valor === "string" && valor.includes("seu_"));

  if (!firebaseConfig.apiKey || !firebaseConfig.projectId || temPlaceholder) {
    throw new Error("Configuracao do Firebase incompleta. Confira VITE_FIREBASE_API_KEY e VITE_FIREBASE_PROJECT_ID.");
  }
};

const parseFirestoreError = async (response) => {
  try {
    const data = await response.json();
    return data?.error?.message || response.statusText;
  } catch {
    return response.statusText;
  }
};

export const FotoService = {
  isBase64Image,
  criarFotoId,
  criarReferencia,
  extrairFotoId,

  async salvarFoto(fotoId, base64String) {
    assertFirebaseConfig();

    const response = await fetch(getDocumentoUrl(fotoId), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: {
          foto: { stringValue: base64String },
          atualizadoEm: { timestampValue: new Date().toISOString() },
        },
      }),
    });

    if (!response.ok) {
      const message = await parseFirestoreError(response);
      throw new Error(`Erro ao salvar foto no Firebase: ${message}`);
    }
  },

  async salvarFotoDaDupla(duplaId, tipo, base64String) {
    if (!isBase64Image(base64String)) return base64String || "";

    const fotoId = criarFotoId(duplaId, tipo);
    await this.salvarFoto(fotoId, base64String);
    return criarReferencia(fotoId);
  },

  async obterFoto(fotoIdOuReferencia) {
    assertFirebaseConfig();

    const fotoId = extrairFotoId(fotoIdOuReferencia) || fotoIdOuReferencia;
    if (!fotoId) return null;

    const response = await fetch(getDocumentoUrl(fotoId));

    if (response.status === 404) return null;

    if (!response.ok) {
      const message = await parseFirestoreError(response);
      throw new Error(`Erro ao buscar foto no Firebase: ${message}`);
    }

    const data = await response.json();
    return data?.fields?.foto?.stringValue || null;
  },

  async resolverFotoParaPreview(fotoIdOuReferencia) {
    if (!fotoIdOuReferencia) return "";
    if (isBase64Image(fotoIdOuReferencia)) return fotoIdOuReferencia;

    return await this.obterFoto(fotoIdOuReferencia) || "";
  },

  async excluirFoto(fotoIdOuReferencia) {
    assertFirebaseConfig();

    const fotoId = extrairFotoId(fotoIdOuReferencia) || fotoIdOuReferencia;
    if (!fotoId) return;

    const response = await fetch(getDocumentoUrl(fotoId), { method: "DELETE" });

    if (!response.ok && response.status !== 404) {
      const message = await parseFirestoreError(response);
      throw new Error(`Erro ao excluir foto no Firebase: ${message}`);
    }
  },
};
