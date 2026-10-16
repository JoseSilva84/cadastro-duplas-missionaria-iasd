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
SEVENFLOW_API_URL="https://backend-leadsnt.sevenflowia.tech"
# Opção temporária: token retornado pelo login do Amigos NT.
SEVENFLOW_API_TOKEN="token-bearer-do-amigos-nt"
# Opção recomendada: conta exclusiva de integração; renova o token automaticamente.
SEVENFLOW_API_EMAIL="integracao-pcm@exemplo.com"
SEVENFLOW_API_PASSWORD="senha-forte-da-conta-de-integracao"
```

Para habilitar a tela **Interessados NT**, use uma conta autorizada do sistema Amigos Novo Tempo. O backend autentica em `POST /api/auth/login` e sincroniza `GET /api/dashboard` em segundo plano para tabelas locais do PCM. A lista de distritos e as páginas de até 100 contatos são consultadas no banco do PCM; abrir a tela não faz uma chamada ao Amigos NT. Administradores veem toda a associação; pastor e coordenador regional veem sua região; pastor distrital e diretor missionário veem seu distrito. A credencial nunca deve ser colocada no frontend.

Configuração opcional da integração:

```env
# Intervalo minimo entre sincronizacoes automaticas (milissegundos; minimo de 60000).
SEVENFLOW_CACHE_TTL_MS=300000
```

Prepare o Prisma:

```bash
npm run db:generate
npm run db:deploy
```

Em uma instalação existente, aplique a migração `20261016120000_espelho_interessados_nt` **antes** de iniciar a nova versão do backend. Se o banco anterior foi criado com `db:push` sem histórico de migrações, alinhe esse histórico antes de usar `migrate deploy`. A primeira sincronização começa no início do servidor e publica o lote somente após importar todos os contatos. Se o Amigos NT falhar, a última versão publicada permanece disponível; novas tentativas usam intervalo crescente. O botão **Atualizar dados** apenas solicita uma sincronização em segundo plano e é limitado a uma tentativa por minuto. Sem acesso ao banco do Amigos NT, a fonte continua sendo sua API; as credenciais do site não dão acesso direto ao banco.

No Coolify, após publicar esta versão, execute `cd /app/backend` e `npm run db:deploy` no terminal do container. O pacote `prisma` faz parte das dependências de produção, e o script chama a CLI diretamente pelo Node para evitar erros de permissão no executável. Mantenha somente uma variável `SEVENFLOW_API_URL`, apontando para `https://backend-leadsnt.sevenflowia.tech`, junto com `SEVENFLOW_API_EMAIL` e `SEVENFLOW_API_PASSWORD` disponíveis em runtime. Consulte os logs do backend para a causa exata de uma falha de sincronização; a tela permanece acessível enquanto o espelho local aguarda os dados.

A rota autenticada `GET /api/interessados-nt/status` informa se há dados, se uma sincronização está em andamento, a data da última atualização e a próxima tentativa. A lista principal é paginada no banco; as telas de análise e filtragem continuam calculando seus gráficos e facetas sobre a cópia local completa.

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
