**Requisitos de Responsividade (Mobile e Tablet) e Modelos de Visualização:**

Atue como um especialista em UX/UI Mobile e Desenvolvedor Frontend Sênior. O sistema deve ser rigorosamente "Mobile-First", garantindo uma experiência impecável em smartphones e tablets, não apenas adaptando a tela, mas otimizando a usabilidade para o toque. Aplique as seguintes diretrizes no desenvolvimento do frontend (React + Tailwind CSS):

1. **Responsividade e Ergonomia (Mobile & Tablet):**
   - **Smartphones (Mobile):** Adote navegação otimizada para o polegar, utilizando uma *Bottom Navigation Bar* (Barra de navegação inferior) ou um menu Hambúrguer *Off-canvas*. Os formulários devem ter inputs de largura total (`w-full`) e teclados virtuais apropriados (ex: `type="tel"`, `type="email"`).
   - **Tablets:** Aproveite o espaço extra alterando o layout para grid (ex: `grid-cols-2` ou `grid-cols-3` para cards) e exiba menus laterais (Sidebars) colapsáveis.
   - **Áreas de Toque (Touch Targets):** Todo botão, ícone clicável ou link deve ter uma área de toque mínima de 44x44 pixels para evitar erros de clique.
   - **Componentes Nativos-like:** Substitua modais centrais (que são ruins no celular) por *Bottom Sheets* (gavetas que sobem do fundo da tela) para filtros, edições rápidas e visualização de detalhes.

2. **Modelos de Visualização (Direto vs. Avançado):**
   O sistema deve oferecer dois modos de exibição de dados para lidar com o volume de informações (especialmente nas listas de Duplas e Membros). O usuário (como o Pastor ou Coordenador) deve poder alternar entre eles (através de um toggle/botão):

   - **Modelo de Visualização Direta (Simples/Essencial):**
     - **Foco:** Ação rápida e acompanhamento no campo.
     - **Layout:** Baseado em *Cards* limpos e com respiro (white space).
     - **Conteúdo:** Exibe estritamente o necessário para identificação (Ex: Nome da dupla, Status colorido (badge) e Distrito/Bairro).
     - **Interação:** O clique no card abre a visualização avançada ou permite um contato rápido (ex: botão de WhatsApp direto para o líder da dupla).

   - **Modelo de Visualização Avançada (Detalhada/Gestão):**
     - **Foco:** Análise de dados, relatórios e auditoria.
     - **Layout em Mobile:** Mantém os cards, mas expande as informações em formato de *Accordion* (sanfona) ou abre uma tela de detalhamento completa, evitando rolagem horizontal infinita.
     - **Layout em Tablet/Desktop:** Transforma-se em *Data Tables* (Tabelas de dados) robustas, permitindo ordenação de colunas e exibindo todos os campos (Membros, Contatos, Projetos, Datas de Cadastro e Pessoas Alcançadas).

3. **Micro-interações e Feedback Visual:**
   - Adicione feedback imediato ao toque do usuário utilizando classes utilitárias (ex: `active:scale-95`, `active:opacity-80`).
   - Carregamentos longos devem exibir *Skeleton Loaders* (esqueletos de carregamento) que imitam o formato do conteúdo, ao invés de simples spinners.
   - Ações de sucesso (ex: "Dupla salva com sucesso") devem disparar *Toasts* (notificações flutuantes) não intrusivos.