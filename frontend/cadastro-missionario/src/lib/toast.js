import { toast } from 'sonner';

/**
 * Helper padronizado para toasts no projeto
 * Cores e estilos alinhados com o tema do sistema
 */
export const toastSuccess = (mensagem, opcoes = {}) => {
  return toast.success(mensagem, {
    description: opcoes.descricao,
    duration: opcoes.duracao ?? 4000,
    ...opcoes,
  });
};

export const toastError = (mensagem, opcoes = {}) => {
  return toast.error(mensagem, {
    description: opcoes.descricao,
    duration: opcoes.duracao ?? 5000,
    ...opcoes,
  });
};

export const toastInfo = (mensagem, opcoes = {}) => {
  return toast.info(mensagem, {
    description: opcoes.descricao,
    duration: opcoes.duracao ?? 4000,
    ...opcoes,
  });
};

export const toastWarning = (mensagem, opcoes = {}) => {
  return toast.warning(mensagem, {
    description: opcoes.descricao,
    duration: opcoes.duracao ?? 4500,
    ...opcoes,
  });
};

/**
 * Toast com promise - ideal para operações assíncronas
 * Exemplo:
 *   toastPromise(
 *     api.post('/duplas', dados),
 *     'Cadastrando...',
 *     'Cadastro realizado!',
 *     'Erro ao cadastrar'
 *   )
 */
export const toastPromise = (promise, loadingMsg, successMsg, errorMsg) => {
  return toast.promise(promise, {
    loading: loadingMsg,
    success: successMsg,
    error: errorMsg,
  });
};

// Exporta o toast padrão para casos especiais
export { toast };
