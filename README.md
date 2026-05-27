# Programa Capacitação Missionária

Sistema web para gestão de duplas missionárias, estudos bíblicos, classes bíblicas, Escola Sabatina, lideranças e relatórios da Associação Paulistana.

O projeto é dividido em duas aplicações:

- `backend`: API REST em Node.js, Express, Prisma e PostgreSQL.
- `frontend/cadastro-missionario`: interface React com Vite, Tailwind CSS e React Router.

## Principais Recursos

- Autenticação JWT com controle de acesso por perfil.
- Dois modelos de navegação no frontend: avançado e direto.
- Cadastro e acompanhamento de regiões, distritos, igrejas e duplas missionárias.
- Registro de estudantes bíblicos, pontos de estudo e classes bíblicas.
- Cadastro de indicadores da Escola Sabatina.
- Gestão de usuários e vínculos por região, distrito ou dupla.
- Relatórios por associação, região, distrito, igreja, estudos e coordenação regional.
- Estatísticas públicas na tela de login.
- Exclusão de cadastros com permissão restrita a administradores.

## Stack

| Camada | Tecnologias |
| --- | --- |
| Frontend | React, Vite, Tailwind CSS, React Router, Axios, Sonner |
| Backend | Node.js, Express, Prisma, PostgreSQL, JWT, bcryptjs |
| Banco | PostgreSQL |
| ORM | Prisma Client |

## Estrutura

```text
dupla-missionaria/
├── backend/
│   ├── prisma/
│   ├── src/
│   │   ├── controllers/
│   │   ├── lib/
│   │   ├── middlewares/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── scripts/
│   │   └── services/
│   └── package.json
├── frontend/
│   └── cadastro-missionario/
│       ├── public/
│       ├── src/
│       │   ├── components/
│       │   ├── contexts/
│       │   ├── lib/
│       │   └── pages/
│       └── package.json
└── README.md
```

## Perfis de Acesso

| Perfil | Uso principal |
| --- | --- |
| `SUPER_ADMIN` | Controle total técnico e operacional. |
| `ADMINISTRADOR` | Administração operacional do sistema. |
| `PASTOR_REGIONAL` | Gestão no escopo da própria região. |
| `PASTOR_DISTRITAL` | Gestão no escopo do próprio distrito. |
| `COORDENADOR_REGIONAL` | Acompanhamento de campo. |
| `DUPLA_MISSIONARIA` | Acesso ao escopo da própria dupla/igreja. |

## Pré-requisitos

- Node.js 20 ou superior.
- npm.
- PostgreSQL acessível pela aplicação.
- Variáveis de ambiente configuradas no backend.

## Configuração Rápida

### 1. Backend

```bash
cd backend
npm install
```

Crie `backend/.env`:

```env
DATABASE_URL="postgresql://USUARIO:SENHA@HOST:5432/BANCO"
JWT_SECRET="troque-por-um-segredo-forte"
PORT=3001
```

Prepare o Prisma:

```bash
npm run db:generate
npm run db:push
```

Opcionalmente, carregue dados iniciais:

```bash
npm run db:seed
npm run acessos:gerar
```

Inicie a API:

```bash
npm run dev
```

A API ficará em `http://localhost:3001/api`.

### 2. Frontend

```bash
cd frontend/cadastro-missionario
npm install
npm run dev
```

A interface ficará em `http://localhost:5173`.

Durante o desenvolvimento, o Vite encaminha `/api` para `http://localhost:3001`.

## Scripts Úteis

Backend:

```bash
npm run dev
npm run start
npm run db:generate
npm run db:push
npm run db:migrate
npm run db:seed
npm run db:studio
npm run acessos:gerar
```

Frontend:

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

No Windows com PowerShell restrito, prefira `npm.cmd run build` ou `npm.cmd run dev`.

## Fluxo de Desenvolvimento

1. Suba o banco PostgreSQL.
2. Inicie o backend em `localhost:3001`.
3. Inicie o frontend em `localhost:5173`.
4. Acesse `/login`.
5. Faça login com um usuário gerado pelo seed ou pelo script de acessos.

## Documentação Específica

- [Backend](backend/README.md)
- [Frontend](frontend/cadastro-missionario/README.md)

## Segurança

- Nunca versionar `.env` com credenciais reais.
- Usar `JWT_SECRET` forte em produção.
- Validar permissões no backend, não apenas na interface.
- Rotas de exclusão e gestão sensível devem permanecer restritas a `SUPER_ADMIN` e `ADMINISTRADOR`.

## Build de Produção

Frontend:

```bash
cd frontend/cadastro-missionario
npm run build
```

Backend:

```bash
cd backend
npm run start
```

Em produção, configure o servidor web ou plataforma de hospedagem para:

- Servir o build do frontend.
- Encaminhar chamadas `/api` para o backend.
- Definir `DATABASE_URL`, `JWT_SECRET` e `PORT`.

