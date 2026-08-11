const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 10;

const tentativas = new Map();

const chaveDaTentativa = (req) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const email = String(req.body?.email || '').trim().toLowerCase();
  return `${ip}:${email}`;
};

const limparExpiradas = (agora = Date.now()) => {
  for (const [chave, registro] of tentativas.entries()) {
    if (registro.resetAt <= agora) tentativas.delete(chave);
  }
};

function limitarLogin(req, res, next) {
  const agora = Date.now();
  limparExpiradas(agora);

  const chave = chaveDaTentativa(req);
  const registro = tentativas.get(chave);
  if (registro && registro.count >= MAX_FAILED_ATTEMPTS && registro.resetAt > agora) {
    const segundos = Math.ceil((registro.resetAt - agora) / 1000);
    res.set('Retry-After', String(segundos));
    return res.status(429).json({ erro: 'Muitas tentativas de login. Tente novamente em alguns minutos.' });
  }

  res.on('finish', () => {
    if (res.statusCode === 401) {
      const atual = tentativas.get(chave);
      tentativas.set(chave, {
        count: atual && atual.resetAt > agora ? atual.count + 1 : 1,
        resetAt: atual && atual.resetAt > agora ? atual.resetAt : agora + WINDOW_MS,
      });
      return;
    }

    if (res.statusCode < 400) {
      tentativas.delete(chave);
    }
  });

  return next();
}

module.exports = { limitarLogin };
