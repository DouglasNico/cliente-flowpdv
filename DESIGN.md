---
name: "Flow Gestor"
description: "Livro de movimento: clareza, estrutura e identidade FlowPDV."
colors:
  primary: "#b94b1b"
  primary-hover: "#953a13"
  paper: "#f5f4ef"
  surface: "#ffffff"
  ink: "#222923"
  muted: "#60665f"
  line: "#dedfd6"
  tint: "#faeee5"
  positive: "#216348"
  danger: "#b12d32"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "clamp(26px, 4vw, 38px)"
    fontWeight: 700
  body:
    fontFamily: "Plus Jakarta Sans, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "14px"
    lineHeight: 1.6
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.sm}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
---

# Design System: Flow Gestor

## Overview

**Creative North Star: "Livro de movimento"**

Uma bancada de gestão clara, organizada como um livro de movimento. Superfícies brancas sobre papel marfim, divisórias finas e números alinhados tornam a leitura diária direta. O laranja da marca orienta ações e seleção; estados operacionais conservam suas cores sem dominar a composição.

Publicação autorizada pelo usuário para esta noite; confirmação da publicação pendente. Testes funcionais completos ficam para amanhã, junto da revisão e otimização adiadas.

**Key Characteristics:**
- Listas e divisórias em vez de mosaicos decorativos.
- Valores numéricos com algarismos tabulares.
- Navegação selecionada evidente.

Extração estática de `reconstruction.css` e dos estilos-base existentes em 23/09/2026. A implementação está em reconstrução. Não houve validação renderizada nesta documentação. A expressão específica da rodada está em `.impeccable/surface-brief.md`.

## Colors

### Primary
Laranja queimado conduz a ação principal e conecta a interface aos logos existentes. Seu tom pálido sinaliza seleção sem competir com o conteúdo.

### Secondary
Verde reservado a estados positivos e operacionais; vermelho comunica erro ou ação destrutiva.

### Neutral
Marfim no fundo, branco nas superfícies, grafite para leitura e cinza quente para informação secundária. Divisórias delimitam grupos sem sombras permanentes.

**The Signal Rule.** A cor deve comunicar ação, seleção ou estado; não transformar cada dado em um bloco colorido.

## Typography

A família de corpo consta no frontmatter. Plus Jakarta Sans mantém títulos, controles e dados coerentes; JetBrains Mono existente permanece disponível para códigos técnicos.
O título principal usa o papel display. Rótulos permanecem menores e firmes. Valores comparáveis usam algarismos tabulares quando disponíveis.

## Layout

O conteúdo usa largura máxima de 1220px e margens internas de 24px. O resumo forma uma faixa contínua; listas de vendas e rankings usam linhas e divisórias. Em até 767px, a margem passa a 18px, as colunas se empilham e a navegação inferior assume as seções. Entre 768px e 1050px, a navegação superior pode ocupar uma segunda linha.

## Elevation & Depth

Superfícies de consulta permanecem planas. Sombras suaves se reservam a login e sobreposições; a separação cotidiana vem de bordas e tons de fundo.

## Shapes

Cantos discretamente arredondados suavizam campos e superfícies. Bordas finas e agrupamento espacial definem a estrutura. Os raios reutilizados estão no frontmatter; não aplicar o maior raio a todos os elementos.

## Components

### Buttons
Ação principal em laranja com texto branco. Secundárias usam superfície neutra e borda. Controles comuns preservam altura mínima de 44px; exceções existentes em ações auxiliares não definem o padrão. Foco visível recebe contorno laranja com afastamento. Transições de estado são discretas e respeitam movimento reduzido.

### Inputs / Fields
Campos brancos, borda discreta e cantos de 8px. A busca usa contêiner de 50px e cantos de 10px; no celular, seu texto chega a 16px.

### Navigation
Seções superiores em telas amplas; barra inferior fixa no celular. Seleção usa fundo laranja pálido e texto laranja escuro. Filtros selecionados usam grafite.

### Cards / Containers
Listas e registros devem ser fáceis de comparar. Agrupar indicadores em uma faixa e usar divisórias dentro dos conjuntos, evitando uma coleção de cartões flutuantes.

## Do's and Don'ts

### Do:
- **Do** preservar as marcas existentes e seus arquivos.
- **Do** tornar seleção, foco e ações primárias identificáveis.
- **Do** manter nomes, valores e estados vinculados aos dados reais.

### Don't:
- **Don't** alterar IDs, autenticação ou regras de negócio para obter um efeito visual.
- **Don't** usar verde como identidade dominante ou adicionar brilho decorativo.
- **Don't** considerar esta documentação evidência de validação renderizada.

