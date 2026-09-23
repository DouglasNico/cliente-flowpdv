# Entrada do Cliente Mobile — 23/09/2026

Pedido: adotar a composição do login do cardápio e, após ajuste do usuário, o mesmo azul da entrada do PDV.

- index.html: marca à esquerda e formulário à direita; textos mantêm o contexto de gestão. IDs, formulário, handlers e campos de licença/senha/manter conectado preservados; labels associados aos inputs.
- login.css: estilos limitados ao login, composição 57,5%/42,5%, formulário branco, ação laranja #ff8120; fundo idêntico a .login-screen-brand em adega-pdv-gestao/src/css/style.css (radial azul e degradê #0f172a/#0b1220/#082f49). No celular, cabeçalho compacto e formulário abaixo, com safe area.
- sw.js: nova versão do cache e inclusão de login.css para a futura atualização do PWA. app.js e autenticação não alterados.
- Cardápio: src/pages/login.css atualizado para esse mesmo azul.

Verificação local em Chrome: 1440x900, 390x844 e 320x568 sem transbordamento horizontal; mostrar senha funciona; display:none continua ocultando a tela após login. Capturas em flowpdv-sistema/output/migracao-v2-20260923/mobile-login-*.png. Build do cardápio aprovado. Sem login real ou publicação.
