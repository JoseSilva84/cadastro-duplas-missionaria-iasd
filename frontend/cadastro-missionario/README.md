# Frontend

Interface web do Programa Capacitação Missionária, construída com React, Vite, Tailwind CSS, React Router e Axios.

## Responsabilidades

- Fornecer a experiência de login e navegação.
- Consumir a API do backend via `/api`.
- Renderizar os modelos de navegação avançado e direto.
- Controlar rotas protegidas por autenticação e perfil.
- Exibir cadastros, relatórios, dashboards e formulários operacionais.

## Stack

- React
- Vite
- Tailwind CSS
- React Router
- Axios
- Sonner
- ESLint

## Estrutura

```text
frontend/cadastro-missionario/
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   ├── contexts/
│   ├── lib/
│   ├── pages/
│   │   └── direto/
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

## Instalação

```bash
cd frontend/cadastro-missionario
npm install
```

## Execução

Desenvolvimento:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Preview do build:

```bash
npm run preview
```

Lint:

```bash
npm run lint
```

No Windows com política de PowerShell restrita:

```bash
npm.cmd run dev
npm.cmd run build
```

## Integração com API

O cliente HTTP fica em:

```text
src/lib/api.js
```

Ele usa `baseURL: '/api'` e adiciona automaticamente o token JWT do `localStorage`.

Em desenvolvimento, o Vite faz proxy para o backend:

```js
server: {
  proxy: {
    '/api': 'http://localhost:3001',
  },
}
```

Portanto, mantenha o backend rodando em `http://localhost:3001`.

## Autenticação

O contexto global fica em:

```text
src/contexts/AuthContext.jsx
```

Ele gerencia:

- Usuário autenticado.
- Token JWT no `localStorage`.
- Layout selecionado (`avancado` ou `direto`).
- Helpers de perfil, como `ehAdmin`, `ehDupla` e `temPerfil`.

## Rotas

As rotas ficam em:

```text
src/App.jsx
```

Principais grupos:

- `/login`: acesso público.
- `/escolha-layout`: seleção do modelo de navegação.
- `/regioes`, `/distritos`, `/igrejas`, `/duplas`: modelo avançado.
- `/direto/...`: modelo direto em master-detail.
- `/cadastro/...`: formulários de criação.
- `/relatorios/...`: relatórios e dashboards.
- `/gestao-usuarios`: gestão administrativa.

## Modelos de Navegação

### Avançado

Modelo hierárquico tradicional, com páginas separadas para regiões, distritos, igrejas, duplas e relatórios.

### Direto

Modelo mais operacional, com navegação master-detail para alternar rapidamente entre lista e detalhe.

## Páginas Principais

| Página | Função |
| --- | --- |
| `Login.jsx` | Login e estatísticas públicas. |
| `EscolhaLayout.jsx` | Seleção entre modo avançado e direto. |
| `Regioes.jsx` | Visão de regiões. |
| `Distritos.jsx` | Distritos de uma região. |
| `ListagemDistritos.jsx` | Lista geral de distritos. |
| `ListagemIgrejas.jsx` | Lista geral de igrejas. |
| `Duplas.jsx` | Lista de duplas. |
| `DadosDupla.jsx` | Detalhe completo da dupla. |
| `Cadastro.jsx` | Cadastro/edição de dupla. |
| `CadastroAcompanhamento.jsx` | Cadastro de estudo bíblico ou ponto de estudo. |
| `CadastroClasseBiblica.jsx` | Cadastro de classe bíblica. |
| `CadastroEscolaSabatina.jsx` | Indicadores da Escola Sabatina. |
| `Relatorios.jsx` | Relatórios do modelo avançado. |
| `DashboardAssociacao.jsx` | Dashboard consolidado da associação. |
| `GestaoUsuarios.jsx` | Administração de usuários. |

## Permissões no Frontend

O frontend esconde ou bloqueia ações conforme perfil, mas a proteção real também deve existir no backend.

Exemplos:

- Botões de exclusão aparecem apenas para `SUPER_ADMIN` e `ADMINISTRADOR`.
- Gestão de usuários é restrita a `SUPER_ADMIN`.
- Cadastro de duplas é bloqueado para `DUPLA_MISSIONARIA` e `COORDENADOR_REGIONAL`.
- Rotas sensíveis usam `RotaComPerfis`.

## Estatísticas do Login

A tela de login consome:

```text
GET /api/public/estatisticas
```

E exibe:

- Regiões.
- Distritos.
- Duplas.
- Classes.
- Estudantes.

## Estilo

O projeto usa Tailwind CSS e estilos globais em:

```text
src/index.css
src/App.css
```

Componentes reutilizáveis ficam em:

```text
src/components/
```

## Build de Produção

```bash
npm run build
```

Os arquivos finais são gerados em:

```text
dist/
```

Em produção, configure o servidor para servir `dist/` e encaminhar chamadas `/api` para a API backend.

## Boas Práticas

- Usar `api` de `src/lib/api.js` para chamadas HTTP.
- Usar `useAuth()` para decisões de perfil.
- Manter validações críticas no backend.
- Evitar duplicar regras de permissão fora dos helpers.
- Rodar build antes de publicar.

