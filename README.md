# 📱 FlowPDV Gestor Mobile — Companion App PWA (cliente.flowpdv.com.br)

> **Aplicativo móvel (Progressive Web App) para o dono da loja acompanhar faturamento, estoque, contas e auditoria direto do celular.**

---

## 📌 1. Visão Geral
* **Subdomínio Oficial:** `https://cliente.flowpdv.com.br`
* **Deploy:** Vercel conectado à branch `main` deste repositório (`DouglasNico/cliente-flowpdv`).
* **Autenticação:** Chave da Licença + PIN do Gerente / Dono com validação em tempo real no Firebase Firestore.
* **Recursos:**
  1. 📊 **Resumo / Dashboard:** Vendas de hoje, faturamento do mês, saldo em gaveta, ticket médio e breakdown por forma de pagamento.
  2. 📦 **Estoque & Reposição:** Busca rápida, filtros de estoque baixo/zerado, validade e cálculo de sugestão de compra.
  3. 💸 **Financeiro & Fiado:** Contas a pagar com alertas de vencimento e lista de clientes com saldo devedor com botão de cobrança no WhatsApp (`wa.me`).
  4. 🛡️ **Auditoria em Tempo Real:** Alertas de cortesias [F7], cancelamentos de vendas, sangrias e conferência de fechamento de caixa (falta/sobra).

---

## 📂 2. Estrutura de Arquivos
* `index.html`: Layout Mobile-First, PWA com safe-areas para iOS/Android e bottom tab navigation.
* `style.css`: Design System Dark Slate, cards touch-friendly e transições fluidas.
* `app.js`: Integração com Firebase Firestore (`licencas`, `backups_lojas`, `auditoria_lojas`).
* `manifest.json` & `sw.js`: Configurações de PWA e Service Worker para funcionamento offline e instalação na tela inicial.

---

## 🚀 3. Comandos Git
```bash
git add .
git commit -m "feat: melhorias no companion app"
git push origin main
```
