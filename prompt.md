@/roteiro.jpeg  (O desenho na imagem é apenas um esqueleto do que deva existir no sistema)
@logo.png (este é o logo da Igreja Adventista do Sétimo Dia)

# Prompt — Sistema de Duplas Missionárias
## Associação Paulistana · Igreja Adventista do Sétimo Dia

---

**Persona:**
Atue como desenvolvedor full stack sênior especializado em sistemas para organizações religiosas, com domínio em React, Node.js, autenticação JWT, banco de dados relacional e design de interfaces institucionais (seja elegante e responsivo para mobile).

**Contexto:**
Você irá desenvolver um sistema web completo chamado **"Duplas Missionárias — Associação Paulistana"**, destinado à Igreja Adventista do Sétimo Dia, campo Associação Paulistana. O sistema deve seguir fielmente a identidade visual do site oficial (https://ap.adventistas.org/): paleta em azul royal (#1A3A6B), dourado (#C9963A) e branco, tipografia institucional com serifa, ícones e elementos visuais condizentes com o contexto religioso adventista.

---

**Arquitetura do sistema:**
O sistema deve ser dividido em frontend (React + Tailwind CSS) e backend (Node.js + Express + PostgreSQL), com autenticação JWT e controle de acesso por perfil. A estrutura de telas deve seguir este fluxo hierárquico:

```
Login
  └── Regiões (painel geral. Exemplos de regiões: Centro de São Paulo, Baixada Santista, Osasco, Cotia e ABCD)
        └── Distrito (exemplos de distrito: Cotia, São Roque, Barueri, Granja Viana e Osasco) / X-Região 
              ├── Duplas
              │     └── Dados da Dupla
              ├── Com Amigos
              └── Cadastro → Salvar
```

---

**Perfis de acesso:**
- Administrador (acesso total)
- Coordenador Regional (gerencia sua região)
- Pastor Distrital (gerencia seu distrito)
- Líder de Regiões (visualização ampla, sem edição)

---

**Regras de negócio:**
1. O sistema deve começar obrigatoriamente pela tela de login com autenticação segura
2. Cada dupla é composta por exatamente dois membros: um líder e um parceiro
3. O parceiro pode ser membro da IASD, convidado/amigo ou interessado
4. Duplas do tipo "Com Amigos" são registradas separadamente e destacadas visualmente
5. Toda dupla deve estar vinculada a uma Região → Distrito → Bairro de atuação
6. O status da dupla pode ser: Ativa, Pendente ou Inativa
7. O sistema deve registrar data de cadastro, tipo de projeto missionário e pessoas alcançadas
8. Pastores só visualizam e editam dados do próprio distrito; coordenadores, da própria região
9. O administrador tem acesso irrestrito a todas as regiões e relatórios

---

**Telas obrigatórias:**
- **Login:** campos de usuário, senha e perfil de acesso; validação com JWT
- **Painel de Regiões:** cards por região com total de distritos e duplas; indicadores gerais no topo
- **Distritos / X-Região:** lista de distritos da região selecionada com contagem de igrejas e duplas
- **Duplas:** lista das duplas do distrito com status, botão de nova dupla (+)
- **Dados da Dupla:** visualização detalhada com informações dos dois membros, localização, projeto e histórico
- **Com Amigos:** aba separada para duplas com convidados externos
- **Cadastro:** formulário completo com seções de localização, membro 1 (líder), membro 2, tipo de projeto e observações; botão salvar com feedback visual de sucesso
- **Relatórios (admin):** exportação em PDF por região/distrito/período com totais de duplas, pessoas alcançadas e projetos ativos

---

**Campos do cadastro de dupla:**
- Região, Distrito, Bairro de atuação
- Tipo de projeto (Casa a Casa, Pequenos Grupos, Ação Social, Missão com Amigos, Evangelismo Público)
- Membro 1: nome completo, telefone, e-mail, igreja/congregação
- Membro 2: tipo (membro/convidado/interessado), nome completo, telefone
- Status da dupla, observações livres, data de início

---

**Design e identidade visual:**
- Paleta: azul royal (#1A3A6B), dourado (#C9963A), branco e cinza claro (#F4F5F7)
- Tipografia: fonte com serifa para títulos (Georgia ou similar), sans-serif para campos e dados
- Símbolo da cruz como elemento visual recorrente na identidade do sistema
- Cards com faixas coloridas diferenciando regiões
- Badges de status (Ativa = verde, Pendente = dourado, Inativa = cinza)
- Interface responsiva para uso em celular por líderes em campo

---

**Stack tecnológica sugerida:**
- Frontend: React, Tailwind CSS, React Router, Axios
- Backend: Node.js, Express, JWT, bcrypt
- Banco de dados: PostgreSQL com Prisma ORM
- Relatórios: biblioteca jsPDF ou Puppeteer para exportação
- Deploy: Vercel (frontend) + Railway ou Render (backend)

---

**Saída esperada:**
Desenvolva o sistema completo, começando pela estrutura de pastas, configuração do banco de dados (schema Prisma), rotas da API REST, telas do frontend e lógica de autenticação. Priorize a tela de login e o fluxo Regiões → Distritos → Duplas → Cadastro. Comente o código em português e adote boas práticas de segurança (hash de senha, proteção de rotas, validação de campos).

**Banco de dados no Neon com PostgreSQL**
Colocar no .env:
postgresql://neondb_owner:npg_qseCtx0Yy6fB@ep-spring-shape-ac11gl83.sa-east-1.aws.neon.tech/neondb?sslmode=require

**Comando para instalação caso precisar**
npx neonctl@latest init

