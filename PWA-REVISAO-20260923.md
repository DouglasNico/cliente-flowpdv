# Gestor PWA — revisão dos prints de 23/09/2026

## Alterações

- `index.html`, `app.js`: olho da senha em SVG, com estado e nome acessíveis. Login sem o filtro de sombra do logo em `reconstruction.css`.
- `reconstruction.css`: cabeçalho respeita safe-area superior/lateral do PWA; navegação inferior distribui as quatro ações mesmo em 320 px. Estoque deixa de impor altura de 100% aos cartões, permitindo acomodar categoria e validade.
- Modais compartilhados: removido padding duplicado do contêiner; cabeçalho e corpo têm um único espaçamento de 16 px. Título longo quebra, fechar não encolhe, corpo rola independentemente em telas baixas. Campo de data sem largura mínima intrínseca excedente; permissões, status, exclusão e categorias adaptados ao tema claro.
- `manager-rules.js`, `app.js`: gerente/administrador aparece com todas as seis permissões marcadas e bloqueadas para edição individual. Selecionar operador restaura as escolhas anteriores do formulário. Ao salvar gerente, o payload também força todas as permissões verdadeiras; autenticação existente permanece obrigatória. Não há migração automática nem escrita de usuários só por abrir o modal. O PDV já concede acesso total ao cargo gerente em `src/js/auth.js`.
- Curva ABC: datas inicial/final inclusivas, categoria, classe, busca e limpar. Datas/categoria recalculam a base; busca/classe apenas selecionam resultados sem adulterar participação. A origem é o backup já sincronizado, sem novas leituras Firebase. Não afirma cobrir vendas ausentes desse backup. Intervalo invertido e nenhum resultado têm feedback.
- `manager-rules.js`: exclui vendas canceladas; mantém total explicitamente zero; o produto que cruza 80%/95% completa a classe anterior, evitando classificar um único líder como C. Quantidade exibida com até três casas decimais em pt-BR. Removido corte silencioso nos primeiros 30 itens.
- `sw.js`: nova versão do cache e inclusão de `manager-rules.js` e logo claro do login. Referências versionadas em `index.html`.

## Verificação

- `node --test manager-rules.test.cjs auth-rules.test.mjs`: 6 testes aprovados, incluindo payload de gerente, preservação de operador, datas/timestamp, cancelamento, classes, busca, categorias e zero explícito.
- Sintaxe JavaScript e `git diff --check` aprovados.
- Harness local com dados sintéticos e Firebase bloqueado: 320×568, 390×844, 844×390, 768×1024, 1366×768; estoque, equipe, categorias, ABC e cinco tipos de modal; 50 registros, sem overflow/controles fora das bordas/erros JS. Botão Salvar alcançável por rolagem em paisagem; toggle da senha e erro de intervalo exercitados.
- Evidências: `flowpdv-sistema/output/reconstrucao-web-20260923/gestor-pwa/`, harness `gestor-pwa-check.cjs` no diretório pai.
- Detector Impeccable executado uma vez; apontou regras legadas, cores/fontes e padrões estáticos. Corrigidos os problemas aplicáveis ao escopo e confirmados no resultado renderizado, sem afirmar ausência total de avisos.
- Validação local Chromium não substitui validação no iPhone instalado. Safe-area e controle nativo de data precisam da confirmação visual do aparelho do usuário.
- Documentos de design já modificados antes da rodada foram preservados, sem incluí-los neste commit.

Publicação: commit e correspondência HTTP registrados em `gestor-pwa/publicacao.json` após o push.
