# Plano de Implementação — Sistema de Cadastro e Relatórios

---

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Mudanças na Navegação](#2-mudanças-na-navegação)
3. [Tela de Cadastro — Estudos Bíblicos](#3-tela-de-cadastro--estudos-bíblicos)
4. [Tela de Cadastro — Evangelismo](#4-tela-de-cadastro--evangelismo)
5. [Submenus de Relatório](#5-submenus-de-relatório)
6. [Estrutura de Dados](#6-estrutura-de-dados)
7. [Fases de Implementação](#7-fases-de-implementação)
8. [Componentes de UI Reutilizáveis](#8-componentes-de-ui-reutilizáveis)
9. [Requisitos Técnicos](#9-requisitos-técnicos)

---

## 1. Visão Geral

O objetivo deste plano é:

- Renomear o botão **"+ Nova Dupla"** para **"Cadastro"** e transformá-lo em um menu com subopções.
- Criar telas de cadastro dedicadas para **Estudos Bíblicos** e **Evangelismo**.
- Transformar o botão **"Relatório"** em um menu com subopções: **Geral** e **Estudos Bíblicos**.

---

## 2. Mudanças na Navegação

### 2.1 Botão "Cadastro" (anteriormente "+ Nova Dupla")

O botão deve exibir um **submenu dropdown** ao passar o mouse (hover) ou tocar (touch).

```
[Cadastro ▾]
 ├── Nova Dupla
 ├── Estudos Bíblicos
 └── Evangelismo
```

**Comportamento esperado:**
- **Desktop:** submenu aparece no hover do mouse.
- **Mobile/Touch:** submenu aparece ao tocar no botão.
- O submenu fecha ao clicar/tocar fora dele ou ao selecionar uma opção.

**Itens do submenu:**

| Item | Ação |
|---|---|
| Nova Dupla | Abre o modal/tela já existente de cadastro de dupla |
| Estudos Bíblicos | Abre a nova tela de cadastro de Estudos Bíblicos |
| Evangelismo | Abre a nova tela de cadastro de Evangelismo |

---

### 2.2 Botão "Relatório"

O botão deve exibir um **submenu dropdown** ao passar o mouse ou tocar.

```
[Relatório ▾]
 ├── Geral
 └── Estudos Bíblicos
```

**Itens do submenu:**

| Item | Ação |
|---|---|
| Geral | Exibe o relatório geral já existente |
| Estudos Bíblicos | Exibe novo relatório filtrado por estudos bíblicos |

---

## 3. Tela de Cadastro — Estudos Bíblicos

### 3.1 Layout Geral

A tela deve ser um **formulário de cadastro** com seções agrupadas, acessível via modal ou página dedicada.

**Título da tela:** `Cadastro de Estudo Bíblico`

---

### 3.2 Campos do Formulário

#### Seção 1 — Dados do Estudante

| Campo | Tipo | Obrigatório |
|---|---|---|
| Nome do Estudante da Bíblia | Texto | Sim |
| Endereço | Texto | Sim |
| Cidade | Texto | Sim |
| Estado | Seleção (UF) | Sim |
| WhatsApp | Telefone (máscara) | Sim |

#### Seção 2 — Dados do Estudo

| Campo | Tipo | Obrigatório |
|---|---|---|
| Dia do Estudo | Seleção (dia da semana) ou Data | Sim |
| Dupla que está dando o estudo | Seleção (lista de duplas cadastradas) | Sim |

#### Seção 3 — Série de Estudo

| Campo | Tipo | Obrigatório |
|---|---|---|
| Série | Seleção | Sim |
| Lição/Estudo Atual | Seleção (dinâmica conforme a série) | Sim |

---

### 3.3 Séries Disponíveis e Lições

#### Série: Ouvindo a Voz de Deus (28 lições)

Ao selecionar esta série, o campo **"Lição Atual"** exibe:

```
Lição 1  — [Título]
Lição 2  — [Título]
Lição 3  — [Título]
...
Lição 28 — [Título]
```

> As lições podem ter títulos configuráveis. O seletor deve exibir o número e, opcionalmente, o nome da lição.

#### Série: Apocalipse

Ao selecionar esta série, o campo **"Estudo Atual"** exibe os estudos do livro do Apocalipse de forma numerada (ex.: Estudo 1, Estudo 2, … até o total de estudos desta série).

> O número total de estudos da série Apocalipse deve ser configurável pelo administrador ou hardcoded conforme o material utilizado.

---

### 3.4 Ações do Formulário

| Botão | Ação |
|---|---|
| Salvar | Valida e persiste o cadastro |
| Cancelar | Fecha o formulário sem salvar |
| Limpar | Reseta todos os campos |

---

### 3.5 Validações

- Todos os campos obrigatórios devem ser preenchidos.
- WhatsApp deve aceitar apenas números, com máscara `(XX) XXXXX-XXXX`.
- A lição atual não pode ser selecionada sem antes escolher a série.

---

## 4. Tela de Cadastro — Evangelismo

### 4.1 Layout Geral

**Título da tela:** `Cadastro de Evangelismo`

Segue a mesma estrutura da tela de Estudos Bíblicos, com adaptações de nomenclatura e séries.

---

### 4.2 Campos do Formulário

#### Seção 1 — Dados do Contato/Pessoa

| Campo | Tipo | Obrigatório |
|---|---|---|
| Nome da Pessoa | Texto | Sim |
| Endereço | Texto | Sim |
| Cidade | Texto | Sim |
| Estado | Seleção (UF) | Sim |
| WhatsApp | Telefone (máscara) | Sim |

#### Seção 2 — Dados do Evangelismo

| Campo | Tipo | Obrigatório |
|---|---|---|
| Dia do Evangelismo | Seleção (dia da semana) ou Data | Sim |
| Dupla responsável | Seleção (lista de duplas cadastradas) | Sim |

#### Seção 3 — Série de Evangelismo

| Campo | Tipo | Obrigatório |
|---|---|---|
| Série | Seleção | Sim |
| Estudo Atual | Seleção (dinâmica conforme a série) | Sim |

---

### 4.3 Séries Disponíveis e Estudos

#### Série: Ouvindo a Voz de Deus (28 lições)

Mesmo comportamento da tela de Estudos Bíblicos — seletor de lição 1 a 28.

#### Série: Apocalipse

Mesmo comportamento da tela de Estudos Bíblicos — seletor numerado conforme os estudos da série.

---

### 4.4 Ações do Formulário

| Botão | Ação |
|---|---|
| Salvar | Valida e persiste o cadastro |
| Cancelar | Fecha o formulário sem salvar |
| Limpar | Reseta todos os campos |

---

### 4.5 Validações

Idênticas às validações de Estudos Bíblicos.

---

## 5. Submenus de Relatório

### 5.1 Relatório Geral

Exibe o relatório já existente no sistema, sem alterações de comportamento.

### 5.2 Relatório de Estudos Bíblicos

**Novo relatório** que exibe uma visão consolidada dos estudos cadastrados.

**Filtros sugeridos:**

| Filtro | Tipo |
|---|---|
| Dupla | Seleção múltipla |
| Série | Seleção |
| Lição atual | Seleção |
| Período (data início / data fim) | Intervalo de datas |
| Cidade | Texto ou seleção |

**Informações exibidas na listagem:**

| Coluna | Descrição |
|---|---|
| Nome do Estudante | Nome completo |
| Cidade / Estado | Localização |
| WhatsApp | Contato |
| Série | Série em andamento |
| Lição Atual | Número da lição |
| Dupla | Dupla responsável |
| Dia do Estudo | Dia da semana |

**Ações disponíveis:**

- Exportar para PDF
- Exportar para Excel/CSV
- Editar registro
- Excluir registro

---

## 6. Estrutura de Dados

### 6.1 Tabela: `estudos_biblicos`

```
id                  INTEGER   PK
nome_estudante      TEXT      NOT NULL
endereco            TEXT
cidade              TEXT
estado              TEXT (2)
whatsapp            TEXT
dia_estudo          TEXT
dupla_id            INTEGER   FK → duplas.id
serie               TEXT      (ex: "ouvindo_voz_de_deus" | "apocalipse")
licao_atual         INTEGER
created_at          DATETIME
updated_at          DATETIME
```

### 6.2 Tabela: `evangelismo`

```
id                  INTEGER   PK
nome_pessoa         TEXT      NOT NULL
endereco            TEXT
cidade              TEXT
estado              TEXT (2)
whatsapp            TEXT
dia_evangelismo     TEXT
dupla_id            INTEGER   FK → duplas.id
serie               TEXT      (ex: "ouvindo_voz_de_deus" | "apocalipse")
estudo_atual        INTEGER
created_at          DATETIME
updated_at          DATETIME
```

### 6.3 Tabela de Séries e Lições (referência estática ou configurável)

```
serie_id            TEXT      PK  (ex: "ouvindo_voz_de_deus")
serie_nome          TEXT
total_licoes        INTEGER
licoes              JSON      [ { numero: 1, titulo: "..." }, ... ]
```

---

## 7. Fases de Implementação

### Fase 1 — Navegação e Submenus (1–2 dias)

- [ ] Renomear botão `+ Nova Dupla` → `Cadastro`
- [ ] Implementar componente de dropdown/submenu (hover + touch)
- [ ] Adicionar item `Nova Dupla` no submenu (aponta para fluxo existente)
- [ ] Adicionar itens `Estudos Bíblicos` e `Evangelismo` (ainda sem tela)
- [ ] Implementar submenu no botão `Relatório` com itens `Geral` e `Estudos Bíblicos`

### Fase 2 — Banco de Dados (1 dia)

- [ ] Criar tabelas `estudos_biblicos` e `evangelismo`
- [ ] Criar seed de séries e lições (`ouvindo_voz_de_deus` com 28 lições, `apocalipse`)
- [ ] Criar migrations e/ou scripts de atualização do banco

### Fase 3 — Tela de Cadastro: Estudos Bíblicos (2–3 dias)

- [ ] Criar componente de formulário
- [ ] Implementar campos da Seção 1 (dados do estudante)
- [ ] Implementar campos da Seção 2 (dados do estudo)
- [ ] Implementar seletor de série com carregamento dinâmico das lições
- [ ] Implementar validações
- [ ] Integrar com API/backend para salvar
- [ ] Feedback de sucesso/erro ao usuário

### Fase 4 — Tela de Cadastro: Evangelismo (1–2 dias)

- [ ] Reaproveitar componentes da Fase 3
- [ ] Adaptar nomenclatura (Pessoa, Evangelismo, etc.)
- [ ] Integrar com API/backend para salvar
- [ ] Feedback de sucesso/erro ao usuário

### Fase 5 — Relatório de Estudos Bíblicos (2–3 dias)

- [ ] Criar página/tela de relatório de estudos
- [ ] Implementar listagem com dados da tabela `estudos_biblicos`
- [ ] Implementar filtros (dupla, série, lição, período, cidade)
- [ ] Implementar exportação PDF e/ou CSV
- [ ] Integrar ações de editar e excluir

### Fase 6 — Testes e Ajustes (1–2 dias)

- [ ] Testes em desktop (hover nos submenus)
- [ ] Testes em mobile (touch nos submenus)
- [ ] Validação dos formulários com dados reais
- [ ] Revisão de UX e feedback dos usuários

---

## 8. Componentes de UI Reutilizáveis

### `DropdownMenu`

Componente genérico de submenu que:
- Funciona em hover (desktop) e touch (mobile)
- Recebe lista de itens com `label` e `action`
- Fecha ao clicar fora (click outside)

### `SerieSelector`

Componente de dois selects encadeados:
- Select 1: escolha da série
- Select 2: carrega as lições/estudos dinamicamente com base na série selecionada

### `PhoneInput`

Campo de telefone com máscara brasileira `(XX) XXXXX-XXXX`.

### `EstadoSelector`

Select com os 27 estados brasileiros (UF).

### `FormSection`

Wrapper visual para agrupar campos relacionados com título de seção.

---

## 9. Requisitos Técnicos

| Requisito | Detalhe |
|---|---|
| Compatibilidade mobile | Submenus devem funcionar via touch |
| Acessibilidade | Submenus navegáveis via teclado (Tab, Enter, Esc) |
| Responsividade | Formulários adaptáveis para tela pequena |
| Feedback visual | Loading, sucesso e erro nos formulários |
| Validação client-side | Antes de enviar ao servidor |
| Reutilização de componentes | Estudos e Evangelismo compartilham base comum |

---

*Plano elaborado com base na solicitação de funcionalidades. Ajuste os títulos das lições e o total de estudos do Apocalipse conforme o material oficial utilizado pela organização.*
