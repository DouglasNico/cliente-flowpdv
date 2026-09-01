# 📱 MEMÓRIA DO PROJETO — FLOWPDV GESTÃO COMERCIAL (MOBILE PWA)

> **Documentação Técnica, Arquitetura e Histórico de Versões do Companion App Mobile**  
> *Última atualização:* 01 de Setembro de 2026  
> *Versão Oficial Atual:* **v2.0.0**  
> *Desenvolvedor:* Douglas Batista / batistadev  
> *URL Oficial:* [https://cliente.flowpdv.com.br](https://cliente.flowpdv.com.br)  
> *Repositório:* [https://github.com/DouglasNico/cliente-flowpdv](https://github.com/DouglasNico/cliente-flowpdv)

---

## 📌 1. Visão Geral da Aplicação

O **FlowPDV — Central de Gestão Comercial** (`cliente.flowpdv.com.br`) é um aplicativo web progressivo (PWA) de alto desempenho projetado especificamente para donos de lojas, gerentes e administradores acompanharem o negócio em tempo real direto do smartphone (iOS e Android) ou computador, sem necessidade de instalação em lojas de aplicativos.

### 🔑 Autenticação & Sessão:
- **Acesso Seguro:** Realizado via **Chave de Licença** da loja + **PIN do Gerente / PIN Mestre**.
- **Opção "Manter Conectado":** Se marcada no login, a sessão do usuário é permanente e desativa o auto-logout por inatividade.
- **Auto-Logout por Inatividade (15 Minutos):** Ativo apenas se a opção "Manter Conectado" for desmarcada.
- **Validação de Licença:** Consulta status ativo/bloqueado no Firebase Firestore (`licencas`).

---

## ⚡ 2. Arquitetura de Performance & Tempo Real

1. **Carregamento Instantâneo em 0ms (Cache-First):**
   - Ao abrir o app ou recarregar, o dashboard é renderizado instantaneamente com os dados em cache local (`flowpdv_cache_{chave}`), sem tela de bloqueio.
2. **Consultas Paralelas (`Promise.allSettled`):**
   - Na sincronização com a nuvem, as consultas de `licencas`, `backups_lojas` e `auditoria_lojas` são disparadas simultaneamente.
3. **Listener em Tempo Real (`onSnapshot`):**
   - Ouvinte ativo no documento de backup da loja (`backups_lojas/{chaveLicenca}`): qualquer venda, abertura ou movimentação no caixa do PDV desktop reflete no painel com **0ms de atraso**.
4. **Service Worker Stale-While-Revalidate (`sw.js`):**
   - Arquivos estáticos servidos diretamente do cache local, com verificação de nova versão em background e ativação instantânea (`skipWaiting()` e `clients.claim()`).
5. **Anti-Zoom em Smartphones:**
   - Desativação do zoom duplo clique e gestos de pinça via `touch-action: manipulation` e listeners no `touchend`.

---

## 🎨 3. Design System & Alternância de Temas (Claro & Escuro)

- **Alternância de Tema (☀️ Claro / 🌓 Escuro):**
  - **Tema Escuro (Padrão):** Fundo `#0f172a`, cards `rgba(30, 41, 59, 0.6)` translúcidos com blur, contrastes neon esmeralda/ciano.
  - **Tema Claro (Premium):** Fundo slate suave `#f1f5f9`, cards `#ffffff` com sombras delicadas, contrastes nítidos e alta legibilidade.
- **Modo Privacidade (👁️ / 🙈):**
  - Botão no topo para mascarar valores sensíveis monetários (Faturamento, Total em Gaveta, Contas, Saldo Fiado) com efeito blur `filter: blur(8px)`.
- **Barra de Rolagem Ultra-Moderna:**
  - Trilho integrado e indicador com gradiente Ciano & Índigo (`#38bdf8` -> `#6366f1`).
- **Responsividade Total (Mobile & Desktop):**
  - **Mobile (< 768px):** Menu inferior fixo (*Bottom TabBar*) com respiro seguro (`padding-bottom: calc(env(safe-area-inset-bottom) + 115px)`).
  - **Desktop (>= 768px):** Menu horizontal centralizado no topo (`📊 Resumo`, `📦 Estoque`, `💸 Financeiro`, `🏢 Gerência`), grid multi-colunas para métricas e cards.

---

## 📊 4. Módulos e Funcionalidades

### 1. Resumo do Dia (Dashboard)
- **Faturamento Hoje & Mês:** Total de vendas diárias e acumulado mensal com ticket médio.
- **Compartilhamento no WhatsApp:** Botão direto no hero card para gerar texto formatado com o fechamento do dia (faturamento, quantidade de vendas, ticket médio e breakdown por forma de pagamento).
- **Total no Caixa Atual (Multi-Terminal):** Dinheiro na gaveta em tempo real e operadores ativos.
- **🏆 Top 5 Mais Vendidos:** Ranking dos 5 produtos com maior saída no dia com barras de progresso proporcionais.
- **🍽️ Mesas & Comandas Ao Vivo:** Card de status rápido do salão com valor total em consumo e quantidade de mesas ocupadas.
- **Vendas Recentes:** Listagem de vendas com modal de detalhes completo.

### 2. Estoque & Reposição
- Listagem completa de produtos com busca rápida e filtros por status (`Todos`, `⚠️ Baixo / Zerado`, `🚨 Validade`, `🛒 Sugestão de Compra`).

### 3. Financeiro & Caderneta de Fiado
- **Contas a Pagar:**
  - **Filtros por Status:** `Todos`, `🚨 Vencidas`, `⏳ Vencem Hoje`, `📅 A Vencer`, `✅ Pagas`.
  - Exibição de categoria completa, fornecedor, observações e data de pagamento.
- **Clientes no Fiado (Caderneta):**
  - Total a receber, lista de clientes devedores, dados cadastrais e botão de cobrança via WhatsApp.

### 4. Central de Gerência (`tab-gerencia`)
Sub-dividida em 3 abas essenciais:
- **👥 Equipe & Cargos:** Lista de funcionários cadastrados no PDV com cargos/funções, logins, limite de desconto e status ativo.
- **🛡️ Auditoria em Tempo Real:** Logs cronológicos de todas as operações críticas com filtros por categoria (cortesias, sangrias, fechamentos com quebra de caixa, cancelamentos, aberturas).
- **🍽️ Mesas & Salão Ao Vivo:** Grid com acompanhamento ao vivo de cada mesa/comanda aberta, itens consumidos e valor acumulado.

---

## 📋 5. Histórico de Versões & Melhorias

### **v2.0.0 (01/09/2026):**
- **🏢 Módulo Central de Gerência:** Migração completa da gerência do PDV Desktop para o Mobile (Equipe, Auditoria e Mesas ao vivo).
- **☀️ Tema Claro Premium:** Adicionado seletor de tema claro/escuro com paleta Slate/White profissional.
- **👁️ Modo Privacidade:** Botão no topo para mascarar dados financeiros confidenciais ao usar o app em público.
- **📲 Envio de Fechamento via WhatsApp:** Botão para compartilhamento instantâneo do resumo diário no WhatsApp.
- **🏆 Top 5 Mais Vendidos:** Gráfico de ranking dos produtos líderes de venda no dashboard.
- **💸 Filtros de Contas a Pagar:** Adicionados chips `Todos`, `🚨 Vencidas`, `⏳ Vencem Hoje`, `📅 A Vencer`, `✅ Pagas`.
- **🔐 Manter Conectado:** Opção no login para manter o app sempre logado sem expirar por inatividade.
- **Barra de Rolagem Personalizada:** Estilização global com gradiente Ciano/Índigo e suporte cross-browser.
- **Status do Cabeçalho:** Atualizado para `🟢 Sincronizado` com animação de pulso luminoso.
- **Filtros Inteligentes na Auditoria:** Adicionadas tags de filtro por tipo de evento com rolagem centralizada magnética.
- **Multi-Terminal Cash Drawer:** Consolidação de saldo em dinheiro para múltiplos PDVs simultâneos.
- **Modais Centralizados:** Transição de bottom-sheet para dialog centralizado com bloqueio de rolagem do fundo (`overflow: hidden`).
- **Botões Compactos no Topo:** `🔄 Atualizar` e `🚪 Sair` com dimensionamento responsivo.

### **v1.0.2 - v1.4.0 (28/08/2026 - 31/08/2026):**
- Implementação inicial da auditoria em tempo real conectada ao Firestore.
- Carregamento 0ms via Cache-First e consultas paralelas.
- Bloqueio definitivo do zoom por duplo clique em navegadores mobile.
