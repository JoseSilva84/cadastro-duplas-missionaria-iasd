# Backend

API REST do Programa Capacitação Missionária, construída com Node.js, Express, Prisma e PostgreSQL.

## Responsabilidades

- Autenticar usuários via JWT.
- Aplicar autorização por perfis e escopo geográfico.
- Expor endpoints para regiões, distritos, igrejas, duplas, estudos, classes, Escola Sabatina, usuários e relatórios.
- Persistir dados via Prisma Client.
- Consolidar métricas e relatórios para o frontend.

## Stack

- Node.js
- Express
- Prisma Client
- PostgreSQL
- JWT (`jsonwebtoken`)
- bcryptjs
- express-validator
- nodemon em desenvolvimento

## Estrutura

```text
backend/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── controllers/   # Entrada e saída HTTP
│   ├── lib/           # Cliente Prisma e utilidades
│   ├── middlewares/   # Autenticação e autorização
│   ├── models/        # Acesso ao banco
│   ├── routes/        # Definição de endpoints
│   ├── scripts/       # Rotinas auxiliares
│   ├── services/      # Regras de negócio e escopo
│   ├── seed.js
│   └── server.js
├── package.json
└── README.md
```

## Variáveis de Ambiente

Crie `backend/.env`:

```env
DATABASE_URL="postgresql://USUARIO:SENHA@HOST:5432/BANCO"
JWT_SECRET="troque-por-um-segredo-forte"
PORT=3001
```

Nunca coloque credenciais reais em commits.

## Instalação

```bash
cd backend
npm install
```

## Banco de Dados

Gerar o Prisma Client:

```bash
npm run db:generate
```

Sincronizar o schema com o banco:

```bash
npm run db:push
```

Criar migration em desenvolvimento:

```bash
npm run db:migrate
```

Abrir Prisma Studio:

```bash
npm run db:studio
```

Rodar seed:

```bash
npm run db:seed
```

Gerar acessos de usuários:

```bash
npm run acessos:gerar
```

## Execução

Desenvolvimento:

```bash
npm run dev
```

Produção:

```bash
npm run start
```

URL padrão:

```text
http://localhost:3001/api
```

## Scripts

| Script | Descrição |
| --- | --- |
| `npm run dev` | Inicia a API com nodemon. |
| `npm run start` | Inicia a API com Node. |
| `npm run db:generate` | Gera o Prisma Client. |
| `npm run db:migrate` | Cria/aplica migration em desenvolvimento. |
| `npm run db:push` | Sincroniza schema diretamente com o banco. |
| `npm run db:seed` | Executa `src/seed.js`. |
| `npm run db:studio` | Abre o Prisma Studio. |
| `npm run acessos:gerar` | Executa o script de geração de usuários/acessos. |

## Rotas Principais

Todas as rotas abaixo usam o prefixo `/api`.

| Prefixo | Recurso |
| --- | --- |
| `/auth` | Login e sessão atual. |
| `/regioes` | Regiões da associação. |
| `/distritos` | Distritos e dados pastorais. |
| `/igrejas` | Igrejas/congregações e lideranças locais. |
| `/duplas` | Duplas missionárias. |
| `/estudos-biblicos` | Estudantes, pontos de estudo e classes bíblicas. |
| `/evangelismos` | Registros de evangelismo. |
| `/acompanhamentos` | Saídas/acompanhamentos de coordenadores. |
| `/escola-sabatina` | Cadastros de indicadores da Escola Sabatina. |
| `/relatorios` | Resumos, dashboards e relatórios. |
| `/usuarios` | Gestão de usuários. |
| `/public/estatisticas` | Estatísticas públicas exibidas no login. |
| `/health` | Health check simples. |

## Autenticação

O login retorna um token JWT. Requisições autenticadas devem enviar:

```http
Authorization: Bearer <token>
```

O middleware principal está em `src/middlewares/auth.js`.

## Perfis

Perfis declarados no backend:

- `SUPER_ADMIN`
- `ADMINISTRADOR`
- `PASTOR_REGIONAL`
- `PASTOR_DISTRITAL`
- `COORDENADOR_REGIONAL`
- `DUPLA_MISSIONARIA`

Helpers importantes:

- `autenticar`
- `autorizar`
- `bloquear`
- `apenasAdmins`
- `apenasSuperAdmin`

## Escopo de Dados

As regras de escopo ficam em `src/services/escopo.service.js`.

Resumo:

- Admins veem tudo.
- Pastor regional e coordenador regional ficam restritos à própria região.
- Pastor distrital fica restrito ao próprio distrito.
- Dupla missionária fica restrita ao escopo da própria dupla/igreja.

## Exclusão de Cadastros

Exclusões sensíveis são restritas a `SUPER_ADMIN` e `ADMINISTRADOR`.

Cadastros com vínculos dependentes usam limpeza controlada para evitar falhas de chave estrangeira, especialmente em:

- Duplas.
- Igrejas.
- Distritos.
- Regiões.
- Escola Sabatina.
- Estudos bíblicos.
- Evangelismos.

## Modelo de Dados

O schema Prisma está em `prisma/schema.prisma`.

Principais modelos:

- `Usuario`
- `Regiao`
- `Distrito`
- `Igreja`
- `Dupla`
- `EstudoBiblico`
- `Participante`
- `Evangelismo`
- `AcompanhamentoDupla`
- `EscolaSabatinaCadastro`
- `EscolaSabatinaResumo`

## Boas Práticas

- Não acessar Prisma diretamente em rotas quando já existir service/model.
- Manter autorização no backend mesmo quando o botão estiver escondido no frontend.
- Tratar escopo em services para evitar vazamento de dados.
- Evitar remover dados vinculados fora de transações.
- Rodar `npm run db:generate` após mudanças no schema.

