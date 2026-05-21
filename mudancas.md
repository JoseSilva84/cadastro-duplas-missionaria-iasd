# Mudanças Desejadas — Descrição do Planejamento

> Documento elaborado a partir dos desenhos manuais do mentor da ideia (PDF com 8 páginas).
> Cada seção descreve, em texto, o que foi esboçado graficamente.

---

## Página 1 — Visão Geral da Associação Paulistana

O mentor desenhou o cabeçalho **"ASSOCIAÇÃO PAULISTANA"** e, abaixo, dividiu a tela em dois painéis separados por uma linha vertical:

### Painel Esquerdo — Ministério Pessoal

Lista de métricas/dados que devem aparecer em alguma visão de resumo:

- **Atas duplas** — quantidade de atas geradas pelas duplas
- **Qtidade estudos** — quantidade de estudos bíblicos registrados
- **Qtidade classes** — número de classes bíblicas
- **Qtidade pontos estudos bíblicos** — pontos de estudos bíblicos cadastrados
- **Qtidade de pessoas estudando** — total de pessoas em estudo ativo
- Sub-classificações de classes:
  - **Classe A**
  - **Classe B**
  - **Classe C**

### Painel Direito — Escola Sabatina

Dados da Escola Sabatina a serem visualizados:

- **Unidades de ação**
- **Classe dos professores**
- **Classe de interessados**
- **Visitas realizadas** — detalhado por:
  - Realizadas pelos **diretores**
  - Realizadas pelos **professores**
  - Realizadas pelos **alunos**
- **Quantidade de Pequenos Grupos**

---

## Página 2 — Regiões Administrativas
Essa parte das regiões já foram implementadas no banco de dados do postegreSQL, com as respetivas regiões e distritos.

O mentor desenhou 7 blocos/cards, cada um representando uma **Região Administrativa**:

- **R1** (Região 1)
- **R2** (Região 2)
- **R3** (Região 3)
- **R4** (Região 4)
- **R5** (Região 5)
- **R6** (Região 6)
- **R7** (Região 7)

Cada região é representada visualmente como um card retangular. Ao clicar em um card de região, o sistema deve navegar para os detalhes daquela região (seus distritos).

---

## Página 3 — Detalhe da Região Administrativa 5

Ao entrar na Região 5, o layout deve mostrar:

- **Foto + identificação do Pr. Departamental / Conselheiro** (um card com foto no canto superior esquerdo)
- Abaixo, os **Distritos** que compõem essa região, exibidos como cards:
  - **Distrito Alphaville**
  - **Distrito Barueri**

---

## Página 4 — Distrito Pastoral — exemplo do distrito de Barueri

Ao entrar no Distrito de Barueri, o layout deve exibir:

- **Sempre mostrar a raiz do site** (breadcrumb de navegação sempre visível, indicando o caminho: Associação > Região > Distrito)
- Cards das **Igrejas** pertencentes ao distrito:
  - **Igreja Barueri**
  - **Igreja Engenho Novo**
  - **Jd. Belval**
  - **Jd. São Silvestre**
- Abaixo dos cards de igrejas: um card especial com a **foto do pastor** responsável pelo distrito

---

## Página 5 — Capa / Visão de Igreja

Ao selecionar uma Igreja, exibir uma tela de **capa da igreja** com 4 colunas de informações:

### Coluna 1 — Diretor de Ministério Pessoal
- Foto do diretor de ministério pessoal (todas as fotos devem ser salvas no banco de dados do firebase)
- Nome
- Endereço
- WhatsApp
- Data de nascimento

### Coluna 2 — Pastor
- Foto do pastor
- Dados (linhas de informação — não totalmente legíveis, mas segue o padrão de nome, contato, etc.)

### Coluna 3 — Coordenado Missionário
- Foto do coordenado missionário
- Dados (nome, contato, etc.)

### Coluna 4 — Dados da Igreja
- Foto da igreja (imagem do prédio/templo)
- **Dados:**
  - Quantidade de membros (já tem no banco de dados do postgresql)
  - Endereço da igreja
  - Quantidade de duplas missionárias
  - Quantidade de estudos
  - Quantidade de pontos de estudos
  - Quantidade de classes bíblicas
- **Estudos por classe:**
  - Estudos Classe A — ex.: 150
  - Estudos Classe B — ex.: 67
  - Estudos Classe C — ex.: 28

### Botão
- **Botão "Gerar Relatório"** — gera um relatório completo da igreja

---

## Página 6 — Cadastro de Dupla (com Classificação)

### Classificação da Dupla

O sistema deve classificar cada dupla em uma de três categorias:

- **(A) Já levou pessoa ao batismo**
- **(B) Já deu estudo, mas não levou ao batismo**
- **(C) Nunca deu estudo bíblico**

> informações adicionais laterais:
> - `# Está estudando com alguém` — indica dupla ativa em estudo
> - `# Não está dando estudo` — indica dupla sem atividade

---

### Cadastro da Dupla — Membro 1

Campos do **primeiro membro** da dupla:

- Foto
- Nome
- Igreja (a que pertence)
- Distrito
- Data de nascimento
- WhatsApp
- Endereço de correspondência
- Data em que foi batizado

### Cadastro da Dupla — Membro 2

Campos do **segundo membro** da dupla (mesmos campos do membro 1):

- Foto
- Nome
- Igreja
- Distrito
- Data de nascimento
- WhatsApp
- Endereço de correspondência
- Data em que foi batizado

---

### Cadastro dos Estudos (vinculado à dupla)

Seção dentro do cadastro da dupla para registrar os estudos bíblicos conduzidos:

- **Estudo único** (identificador único de estudo)
- **Ponto de estudo** *(ver Anexo 1 — Página 7)*
- **Classe bíblica**

---

## Página 7 — Anexo 1: Detalhes dos Estudos

### Cadastro de Estudo Único

Campos do formulário de **estudo individual** (estudo com uma única pessoa):

| Campo | Descrição |
|---|---|
| Nome | Nome do estudante |
| Endereço | Endereço do estudante |
| WhatsApp | Contato do estudante |
| Sexo | Sexo do estudante |
| Classificação do estudante | A, B ou C |

**Série de Estudo** — campo "Estudo":
- Sub-opção: **Ouvindo a Voz de Deus** (série com múltiplas lições)
- Sub-opção: **Através de Nós** (série com múltiplas lições)
- ... (outras séries)

**Lições disponíveis (exemplos):**
- A Bíblia
- A volta de Jesus
- A Lei de Deus
- ... (demais lições)

**Campos adicionais do estudante (relacionados aos estudos):**
- Está indo à igreja?
- Lê a Bíblia?
- Estuda a lição?
- Devolve os dízimos?
- Faz o culto familiar?

---

### Cadastro de Ponto de Estudo

O **ponto de estudo** é um local onde múltiplas pessoas são estudadas simultaneamente (até ~5 pessoas por vez).

Campos:

| Campo | Descrição |
|---|---|
| Nome 1 | Nome do 1º participante → WhatsApp, Sexo, Endereço, Classificação (A/B/C) |
| Nome 2 | Nome do 2º participante → mesmos campos |
| Nome 3 | Nome do 3º participante → mesmos campos |
| Nome 4 | Nome do 4º participante → mesmos campos |
| Nome 5 | Nome do 5º participante → mesmos campos |

**Série de Estudo** — mesmo formato do estudo único:
- Ouvindo a voz (de Deus)
- Através de (Nós)

**Lições** — mesma estrutura.

**OBS.** — campo de observação livre.

---

## Página 8 — Classe Bíblica

A **Classe Bíblica** é uma reunião com múltiplos participantes (até ~10 nomes).

Campos:

| Campo | Descrição |
|---|---|
| Nome 1 | Classificação do estudante |
| Nome 2 | Classificação |
| Nome 3 | Classificação |
| ... | ... |
| Nome 10 | Classificação |

**Estudo/Série:**
- Estudo: **Ouvindo** (Ouvindo A Voz De Deus)
- Estudo: **Através de** (Através de Nós)

**Lições:** (As lições estão no arquivo temas_ouvindo_a_voz_de_deus.md)
1. A Bíblia Sagrada
2. A Beleza da Criação Divina
3. A Origem do Mal
4. O Plano da Salvação
5. Fé, Arrependimento e Confissão
6. Sinais da Volta de Cristo
7. A Segunda Vinda de Cristo
8. O Milênio
9. A Verdade Sobre a Morte
10. A Nova Terra
11. Salvação pela Graça
12. O Santuário de Deus
13. O Juízo
14. As Leis na Bíblia
15. A Lei Moral
16. O Mandamento Esquecido
17. Do Sábado para o Domingo
18. Princípios de Saúde
19. O Dom de Profecia
20. O Dízimo
21. Ofertar, um Ato de Adoração
22. Como Identificar a Igreja Verdadeira
23. Por Que Devo Ser Batizado
24. Princípios de Vida Cristã
25. Educação Cristã
26. A Vida no Espírito
27. Um Ministério para Todos

**Regra especial:**
> Quando a classificação for **B ou C**, o sistema deve **abrir um campo adicional** para que o usuário explique o motivo da classificação.

---

## Resumo das Funcionalidades Novas Desejadas

| # | Funcionalidade | Status |
|---|---|---|
| 1 | Dashboard com métricas de Ministério Pessoal e Escola Sabatina | 🆕 Novo |
| 2 | Tela de Regiões Administrativas (7 regiões em cards) | ✅ Existente |
| 3 | Tela de Detalhe de Região — foto do conselheiro + cards de distritos | 🔄 Melhoria |
| 4 | Tela de Detalhe de Distrito — breadcrumb + cards de igrejas + foto do pastor | 🔄 Melhoria |
| 5 | Tela de Capa da Igreja — fotos dos líderes + estatísticas + botão de relatório | 🆕 Novo |
| 6 | Classificação da dupla (A/B/C) no cadastro | 🔄 Melhoria |
| 7 | Campos adicionais no cadastro: data de batismo, fotos dos dois membros | 🔄 Melhoria |
| 8 | Cadastro de Estudo Único — com série, lição, observações do estudante | 🔄 Melhoria |
| 9 | Cadastro de Ponto de Estudo — múltiplos participantes (até 5) | 🆕 Novo |
| 10 | Cadastro de Classe Bíblica — múltiplos participantes (até 10+) com campo de motivo B/C | 🆕 Novo |
| 11 | Campos de perfil: sexo do estudante, "está indo à igreja?", lê a Bíblia?, faz culto familiar?, etc. | 🆕 Novo |
| 12 | Foto do pastor no detalhe do distrito | 🆕 Novo |
| 13 | Foto e dados do coordenado missionário e diretor de ministério pessoal na capa da Igreja | 🆕 Novo |

**Importante**: Não altere o UI e layout já feito, a não ser que seja uma boa melhoria. Mantenha os dois tipos de visualização (modo avançado e o modo direto). Não use ícones padronizadas de IA. Use no lugar, ícones do tailwind (os mais bonitos elegantes). Tarabalhe sempre com boa responsividade. Quero na tela de Todas Duplas, as fotos que aparecm de cada pessoa da dupla sejam separadas, porque estava a primeira foto do primeiro da dupla com a foto maior, mas preciso que ao lado de cada pessoa da dupla, na parte de pesquisa, apareça a foto ao lado da pessoa. E quando o mouse passar por cima do ietm selecionado, que a cor da medalha em que aparece no primeor nome que também que aparece no segundo nome. Não pode haver distinção entres até no UI. O que for para um, deve ser para o outro.