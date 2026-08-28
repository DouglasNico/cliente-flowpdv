# 📱 MEMÓRIA DO PROJETO — FLOWPDV GESTÃO COMERCIAL (MOBILE PWA)

> **Documentação Técnica, Arquitetura e Histórico de Versões do Companion App Mobile**  
> *Última atualização:* 28 de Agosto de 2026  
> *Versão Oficial Atual:* **v1.9.1**  
> *Desenvolvedor:* Douglas Batista / batistadev  
> *URL Oficial:* [https://cliente.flowpdv.com.br](https://cliente.flowpdv.com.br)  
> *Repositório:* [https://github.com/DouglasNico/cliente-flowpdv](https://github.com/DouglasNico/cliente-flowpdv)

---

## 📌 1. Visão Geral da Aplicação
O **FlowPDV — Central de Gestão Comercial** (`cliente.flowpdv.com.br`) é um aplicativo web progressivo (PWA) de alto desempenho projetado especificamente para donos de lojas, gerentes e administradores acompanharem o negócio em tempo real direto do smartphone (iOS e Android), sem precisar instalar aplicativos pesados da PlayStore ou App Store.

### 🔑 Autenticação & Segurança:
- **Acesso Seguro:** Realizado via **Chave de Licença** da loja + **PIN do Gerente / PIN Mestre**.
- **Validação de Licença:** Verifica status ativo/bloqueado no Firebase Firestore (`licencas`).
- **Sessão Persistente:** Opção *"Lembrar minhas credenciais"* armazena a sessão de forma segura no `localStorage`.

---

## ⚡ 2. Arquitetura de Performance & Tempo Real

1. **Carregamento Instantâneo em 0ms (Cache-First):**
   - Ao abrir o app ou recarregar, o dashboard é renderizado instantaneamente com os dados salvos localmente, sem tela de bloqueio ou espera de rede.
2. **Consultas Paralelas (`Promise.allSettled`):**
   - Ao sincronizar com a nuvem, as consultas de `licencas`, `backups_lojas` e `auditoria_lojas` são disparadas simultaneamente, reduzindo o tempo de resposta em mais de 75%.
3. **Listener em Tempo Real (`onSnapshot`):**
   - Ouvinte ativo no documento de backup da loja (`backups_lojas/{chaveLicenca}`): qualquer venda realizada no caixa do PDV desktop reflete no celular com **0ms de atraso**.
4. **Service Worker Stale-While-Revalidate (`sw.js`):**
   - Todos os arquivos estáticos (`index.html`, `style.css`, `app.js`, ícones) são servidos diretamente do cache local, atualizando em background.
5. **Anti-Zoom em Smartphones:**
   - Desativação do zoom duplo clique e gestos de pinça via `touch-action: manipulation` e listeners no `touchend` e `gesturestart`.

---

## 📊 3. Módulos e Funcionalidades

1. **Resumo do Dia (Dashboard):**
   - Faturamento total do dia com contagem de vendas realizadas.
   - Saldo estimado em dinheiro na gaveta do caixa.
   - Indicador de produtos com estoque baixo ou esgotados.
   - Contas a pagar vencidas ou a vencer hoje.
   - Lista das últimas vendas com produtos, horário, valor e forma de pagamento.

2. **Estoque & Reposição:**
   - Listagem completa de produtos com busca rápida e filtros por status (`Todos`, `Em Dia`, `Estoque Baixo`, `Esgotados`).
   - Sugestão inteligente de reposição em quantidade de fardos e unidades.

3. **Financeiro & Caderneta de Fiado:**
   - **Contas a Pagar:** Gestão de despesas com status (Pagas, Pendentes, Vencidas).
   - **Clientes no Fiado:** Lista de clientes com saldo devedor e botão direto de cobrança amigável no WhatsApp (`wa.me`).

4. **Auditoria em Tempo Real:**
   - Registro detalhado de eventos críticos da loja: aberturas de caixa, sangrias, suprimentos, cortesias, cancelamentos e fechamentos cegos com valores informados e diferenças.

---

## 📋 4. Histórico de Versões & Melhorias

- **v1.9.1 (28/08/2026):**
  - Renomeação do título para **`FlowPDV — Central de Gestão Comercial`**.
  - Otimização completa de performance: carregamento 0ms via Cache-First, queries Firestore paralelas e Service Worker Stale-While-Revalidate.
  - Bloqueio definitivo do zoom por duplo clique.
  - Adicionado `favicon.ico` para eliminar erros 404 de ícone.
- **v1.8.8 (28/08/2026):**
  - Listener `onSnapshot` do Firestore para sincronização ao vivo de vendas.
  - Unificação de filtros de data diária para `v.data`, `v.dataHora` e `v.criadoEm`.
