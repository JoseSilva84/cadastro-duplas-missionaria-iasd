import { useState, useEffect, useMemo } from 'react';

/**
 * VersiculoHero — Exibe o versículo de Mateus 28:19 com
 * animações elegantes: partículas douradas, brilho pulsante,
 * entrada suave e efeito de destaque nas palavras-chave.
 */
export default function VersiculoHero({ visible = true }) {
  const [show, setShow] = useState(false);
  const [particlesReady, setParticlesReady] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setShow(true), 300);
    const t2 = setTimeout(() => setParticlesReady(true), 800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // Função pseudo-aleatória determinística (baseada em índice)
  const pseudo = (i, offset) => {
    const x = Math.sin(i * 9301 + offset * 49297) * 233280;
    return x - Math.floor(x);
  };

  // Partículas geradas com useMemo — estáveis entre renders
  const particles = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        size: 2 + pseudo(i, 1) * 4,
        left: pseudo(i, 2) * 100,
        delay: pseudo(i, 3) * 6,
        duration: 4 + pseudo(i, 4) * 6,
        opacity: 0.15 + pseudo(i, 5) * 0.35,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Palavras que recebem destaque dourado
  const highlightWords = ['discípulos', 'nações', 'Pai', 'Filho', 'Espírito Santo'];

  const versiculoTexto =
    'Ide, portanto, fazei discípulos de todas as nações, batizando-os em nome do Pai, e do Filho, e do Espírito Santo.';

  // Pré-processa o texto com destaques (memoizado)
  const renderedText = useMemo(() => {
    const parts = [];
    let lastIndex = 0;

    const matches = [];
    highlightWords.forEach((word) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      let m;
      while ((m = regex.exec(versiculoTexto)) !== null) {
        matches.push({ start: m.index, end: m.index + m[0].length, word: m[0] });
      }
    });

    matches.sort((a, b) => a.start - b.start);

    const filtered = [];
    let prevEnd = 0;
    matches.forEach((m) => {
      if (m.start >= prevEnd) {
        filtered.push(m);
        prevEnd = m.end;
      }
    });

    filtered.forEach((m) => {
      if (m.start > lastIndex) {
        parts.push({ text: versiculoTexto.slice(lastIndex, m.start), highlight: false });
      }
      parts.push({ text: m.word, highlight: true });
      lastIndex = m.end;
    });
    if (lastIndex < versiculoTexto.length) {
      parts.push({ text: versiculoTexto.slice(lastIndex), highlight: false });
    }

    return parts.map((part, i) =>
      part.highlight ? (
        <span
          key={i}
          className="versiculo-highlight"
          style={{ animationDelay: `${1.2 + i * 0.08}s` }}
        >
          {part.text}
        </span>
      ) : (
        <span key={i}>{part.text}</span>
      )
    );
  }, []);

  return (
    <div
      className={`versiculo-hero-container ${show ? 'versiculo-visible' : ''} ${visible ? '' : 'versiculo-hidden'}`}
    >
      {/* Partículas douradas flutuantes */}
      {particlesReady && (
        <div className="versiculo-particles">
          {particles.map((p) => (
            <div
              key={p.id}
              className="versiculo-particle"
              style={{
                width: p.size,
                height: p.size,
                left: `${p.left}%`,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.duration}s`,
                opacity: p.opacity,
              }}
            />
          ))}
        </div>
      )}

      {/* Anel de brilho pulsante atrás do card */}
      <div className="versiculo-glow-ring" />

      {/* Linha decorativa superior */}
      <div className="versiculo-line-top" />

      {/* Aspas decorativas */}
      <div className="versiculo-quote-mark versiculo-quote-open">"</div>
      <div className="versiculo-quote-mark versiculo-quote-close">"</div>

      {/* Card principal */}
      <div className="versiculo-card">
        {/* Ícone de bíblia */}
        <div className="versiculo-icon">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
        </div>

        {/* Texto do versículo */}
        <p className="versiculo-texto">{renderedText}</p>

        {/* Referência bíblica */}
        <div className="versiculo-reference">
          <span className="versiculo-ref-line" />
          <span className="versiculo-ref-text">Mateus 28:19</span>
          <span className="versiculo-ref-line" />
        </div>
      </div>

      {/* Linha decorativa inferior */}
      <div className="versiculo-line-bottom" />
    </div>
  );
}
