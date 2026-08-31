# 📱 MEMÓRIA DO PROJETO — FLOWPDV GESTÃO COMERCIAL (MOBILE PWA)

> **Documentação Técnica, Arquitetura e Histórico de Versões do Companion App Mobile**  
> *Última atualização:* 31 de Agosto de 2026  
> *Versão Oficial Atual:* **v1.4.7**  
> *Desenvolvedor:* Douglas Batista / batistadev  
> *URL Oficial:* [https://cliente.flowpdv.com.br](https://cliente.flowpdv.com.br)  
> *Repositório:* [https://github.com/DouglasNico/cliente-flowpdv](https://github.com/DouglasNico/cliente-flowpdv)

---

## 📌 1. Visão Geral da Aplicação

O **FlowPDV — Central de Gestão Comercial** (`cliente.flowpdv.com.br`) é um aplicativo web progressivo (PWA) de alto desempenho projetado especificamente para donos de lojas, gerentes e administradores acompanharem o negócio em tempo real direto do smartphone (iOS e Android) ou computador, sem necessidade de instalação em lojas de aplicativos.

### 🔑 Autenticação & Segurança:
- **Acesso Seguro:** Realizado via **Chave de Licença** da loja + **PIN do Gerente / PIN Mestre**.
- **Validação de Licença:** Consulta status ativo/bloqueado no Firebase Firestore (`licencas`).
- **Sessão Persistente:** Armazenamento seguro de credenciais via `localStorage` (`flowpdv_mob_chave` e `flowpdv_mob_pin`).
- **Auto-Logout por Inatividade (15 Minutos):** Monitoramento contínuo de eventos de interação (cliques, toques, rolagem e digitação). Após 15 minutos sem atividade ou ao retornar de aba em segundo plano expirada, o sistema desloga com aviso de segurança.

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

## 🎨 3. Design System & Identidade Visual

- **Glassmorphism Puro:** Fundos translúcidos em `rgba(30, 41, 59, 0.6)` com `backdrop-filter: blur(16px)`, bordas sutis e sem sombras pretas pesadas.
- **Paleta de Cores:**
  - Fundo Geral: `#0f172a` (Dark Slate)
  - Superfícies: `#1e293b`, `#273549`, `#334155`
  - Destaques: Azul Ciano `#38bdf8`, Violeta `#7c3aed`, Índigo `#6366f1`, Esmeralda `#10b981`, Âmbar `#f59e0b`, Vermelho `#ef4444`.
- **Barra de Rolagem Ultra-Moderna:**
  - Trilho escuro integrado (`#0b1120`).
  - Indicador de rolagem com gradiente Ciano & Índigo (`#38bdf8` -> `#6366f1`), cantos 100% arredondados e brilho *glow neon* ao passar o mouse.
  - Compatível com Safari (iOS/Mac), Chrome (Android/PC), Edge e Firefox.
- **Responsividade Total (Mobile & Desktop):**
  - **Mobile (< 768px):** Menu inferior fixo (*Bottom TabBar*) com respiro inferior seguro (`padding-bottom: calc(env(safe-area-inset-bottom) + 115px)`), impedindo corte de cards.
  - **Desktop (>= 768px):** Menu horizontal centralizado no topo com espaçamento dedicado, grid de 3 colunas para métricas e produtos, e filtros em blocos visíveis sem setas.

---

## 📊 4. Módulos e Funcionalidades

### 1. Resumo do Dia (Dashboard)
- **Faturamento Hoje & Mês:** Total de vendas diárias e acumulado mensal com ticket médio.
- **Total no Caixa Atual (Multi-Terminal):**
  - Identifica e consolida caixas abertos simultâneos (`turnosAtivos`).
  - Exibe o valor em dinheiro na gaveta em tempo real e o nome do operador ativo (ex: `🟢 Caixa: NicoBatista` ou `🟢 2 caixas abertos agora`).
- **Vendas Recentes:** Listagem de vendas com horário, forma de pagamento e valor.
- **Modal de Detalhes da Venda:**
  - Exibe operador, forma de pagamento e listagem de itens vendidos.
  - Preços com blindagem contra quebra de linha (`white-space: nowrap; flex-shrink: 0`).

### 2. Estoque & Reposição
- Listagem completa de produtos com busca rápida e filtros por status (`Todos`, `⚠️ Baixo / Zerado`, `🚨 Validade`, `🛒 Sugestão de Compra`).
- Sugestão inteligente de reposição calculada sobre o estoque mínimo.

### 3. Financeiro & Caderneta de Fiado
- **Contas a Pagar:**
  - Data de vencimento formatada no padrão brasileiro (`DD/MM/AAAA`).
  - Identificação de status inteligente: `🚨 Vencida`, `⏳ Vence Hoje`, `📅 A Vencer`.
  - Exibição de categoria completa (`🏷️ Fornecedores`, `🏷️ Aluguel`, etc.).
  - **Modal de Mais Detalhes:** Fornecedor, categoria, observações e comprovante de pagamento.
- **Clientes no Fiado (Caderneta):**
  - Total a receber e quantidade de clientes devedores.
  - **Modal de Detalhes do Cliente:** Telefone, CPF, limite fiado, endereço e botão direto de cobrança amigável via WhatsApp (`wa.me`).

### 4. Auditoria em Tempo Real
- Registro cronológico de todas as ações operacionais da loja: aberturas de caixa, fechamentos cegos com valores informados/diferenças, sangrias, suprimentos, cortesias, cancelamentos e movimentações de produtos.
- **Filtros por Categoria com Rolagem Magnética:**
  - Filtros: `Todos`, `🎁 Cortesias`, `🟢 Aberturas`, `💰 Fechamentos`, `💸 Sangrias`, `💵 Suprimentos`, `🛑 Cancelamentos`, `📦 Ajuste Estoque`, `✨ Produtos`.
  - Ao clicar em qualquer filtro, o carrossel desliza suavemente até centralizar o botão no meio da tela (`inline: 'center'`).
  - No desktop, os filtros se distribuem de forma responsiva sem cortes.

---

## 📋 5. Histórico de Versões & Melhorias

### **v1.4.7 (31/08/2026):**
- **Espaçamento Seguro Inferior:** Adicionado `padding-bottom: calc(env(safe-area-inset-bottom) + 115px)` para garantir que nenhum card fique oculto atrás da barra de navegação no iPhone e Android.
- **Categoria Completa nas Contas a Pagar:** Layout dos cards redesenhado em 3 linhas para exibir o nome da categoria por extenso sem truncamento.
- **Auto-Logout por Inatividade:** Desconexão automática de segurança após 15 minutos sem interação.
- **Modal de Detalhes Financeiro:** Modais dedicados para Contas a Pagar e Clientes Fiado.
- **Correção da Data de Vencimento:** Leitura correta do campo `vencimento` gravado pelo PDV.
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
