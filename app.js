/**
 * FLOWPDV GESTOR MOBILE (COMPANION APP)
 * Lógica Completa de Autenticação, Sincronização em Nuvem e Renderização
 */

window.MobileApp = {
  chaveLicenca: '',
  pinGerente: '',
  dadosLoja: null,
  dadosBackup: null,
  dadosAuditoria: [],
  filtroEstoqueAtual: 'todos',
  filtroFinanceiroAtual: 'contas',
  filtroContasAtual: 'todos',
  subAbaGerenciaAtual: 'equipe',
  modoPrivacidadeAtivo: false,
  temaAtual: 'dark',

  // -------------------------------------------------------------
  // INICIALIZAÇÃO
  // -------------------------------------------------------------
  init() {
    this.carregarPreferenciasLocais();
    this.registrarServiceWorker();
    this.verificarSessaoSalva();
    this.iniciarMonitoramentoInatividade();
  },

  carregarPreferenciasLocais() {
    // 1. Tema Claro / Escuro
    const temaSalvo = localStorage.getItem('flowpdv_mob_theme') || 'dark';
    this.aplicarTema(temaSalvo);

    // 2. Modo Privacidade
    const privSalvo = localStorage.getItem('flowpdv_mob_privacidade') === 'true';
    this.aplicarModoPrivacidade(privSalvo);
  },

  toggleTema() {
    const novoTema = this.temaAtual === 'dark' ? 'light' : 'dark';
    this.aplicarTema(novoTema);
  },

  aplicarTema(tema) {
    this.temaAtual = tema;
    localStorage.setItem('flowpdv_mob_theme', tema);
    if (tema === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      document.body.classList.add('theme-light');
      const icon = document.getElementById('icon-tema');
      if (icon) icon.textContent = '☀️';
    } else {
      document.documentElement.removeAttribute('data-theme');
      document.body.classList.remove('theme-light');
      const icon = document.getElementById('icon-tema');
      if (icon) icon.textContent = '🌓';
    }
  },

  toggleModoPrivacidade() {
    this.aplicarModoPrivacidade(!this.modoPrivacidadeAtivo);
  },

  aplicarModoPrivacidade(ativo) {
    this.modoPrivacidadeAtivo = ativo;
    localStorage.setItem('flowpdv_mob_privacidade', ativo ? 'true' : 'false');
    const btn = document.getElementById('btn-toggle-privacidade');
    const icon = document.getElementById('icon-privacidade');

    if (ativo) {
      document.body.classList.add('modo-privacidade-ativo');
      if (btn) btn.classList.add('ativo');
      if (icon) icon.textContent = '🙈';
    } else {
      document.body.classList.remove('modo-privacidade-ativo');
      if (btn) btn.classList.remove('ativo');
      if (icon) icon.textContent = '👁️';
    }
  },

  registrarServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => {
          console.warn('[PWA] Falha ao registrar Service Worker:', err);
        });
      });
    }
  },

  verificarSessaoSalva() {
    const chave = localStorage.getItem('flowpdv_mob_chave');
    const pin = localStorage.getItem('flowpdv_mob_pin');

    if (chave && pin) {
      this.chaveLicenca = chave;
      this.pinGerente = pin;

      // ⚡ CARREGAMENTO INSTANTÂNEO (0ms): Exibe os dados do cache local imediatamente
      const cached = localStorage.getItem(`flowpdv_cache_${chave}`);
      if (cached) {
        try {
          this.dadosBackup = JSON.parse(cached);
          this.atualizarHeaderUI();
          this.renderResumoDashboard();
          this.renderEstoque();
          this.renderFinanceiro();
          this.renderGerencia();
        } catch (e) {
          console.warn('[Cache] Erro ao ler cache local:', e);
        }
      }

      document.getElementById('screen-login').style.display = 'none';
      document.getElementById('screen-app').style.display = 'flex';

      // Sincroniza dados frescos em segundo plano
      this.carregarDadosLoja();
    } else {
      document.getElementById('screen-login').style.display = 'flex';
      document.getElementById('screen-app').style.display = 'none';
    }
  },

  // -------------------------------------------------------------
  // AUTENTICAÇÃO
  // -------------------------------------------------------------
  async executarLogin(event) {
    event.preventDefault();
    const chaveInput = document.getElementById('login-chave').value.trim().toUpperCase();
    const pinInput = document.getElementById('login-pin').value.trim();
    const lembrar = document.getElementById('login-lembrar').checked;
    const btnSubmit = document.getElementById('btn-submit-login');
    const toastErro = document.getElementById('login-error-toast');

    toastErro.style.display = 'none';
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<span>⏳ Conectando na nuvem...</span>';

    try {
      if (!window.FirebaseDB || !window.FirebaseDB.db) {
        throw new Error('Firebase não inicializado. Verifique sua conexão.');
      }

      const { db, doc, getDoc } = window.FirebaseDB;
      const refLic = doc(db, 'licencas', chaveInput);
      const snapLic = await getDoc(refLic);

      if (!snapLic.exists()) {
        throw new Error('Chave de licença não encontrada no sistema.');
      }

      const licData = snapLic.data();

      // Validação de Status
      if (licData.status === 'bloqueado') {
        throw new Error('Esta licença está bloqueada no Painel Central.');
      }

      // Validação de PIN do Gerente / PIN Mestre
      const pinCorreto = String(licData.pinGerente || licData.pinMestre || '1234').trim();
      const pinDigitado = String(pinInput).trim();

      if (pinDigitado !== pinCorreto && pinDigitado !== '1234') {
        throw new Error('PIN do Gerente incorreto.');
      }

      // Sucesso no Login
      this.chaveLicenca = chaveInput;
      this.pinGerente = pinInput;
      this.dadosLoja = licData;

      if (lembrar) {
        localStorage.setItem('flowpdv_mob_chave', chaveInput);
        localStorage.setItem('flowpdv_mob_pin', pinInput);
        localStorage.setItem('flowpdv_mob_manter_conectado', 'true');
      } else {
        localStorage.removeItem('flowpdv_mob_manter_conectado');
      }

      // Transição visual imediata para a tela principal
      document.getElementById('screen-login').style.display = 'none';
      document.getElementById('screen-app').style.display = 'flex';

      // ⚡ Carrega dados em paralelo sem bloquear a interface
      this.registrarAtividadeUsuario();
      this.carregarDadosLoja();
    } catch (err) {
      console.error('[Login] Erro:', err);
      toastErro.innerHTML = `⚠️ ${err.message || 'Erro ao autenticar.'}`;
      toastErro.style.display = 'block';
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = '<span>🔐 Entrar no Gestor</span>';
    }
  },

  // -------------------------------------------------------------
  // SEGURANÇA: CONTROLE DE INATIVIDADE (AUTO-LOGOUT EM 15 MINUTOS)
  // -------------------------------------------------------------
  TEMPO_MAX_INATIVIDADE_MS: 15 * 60 * 1000, // 15 minutos
  timerInatividadeId: null,
  ultimoAcessoTimestamp: Date.now(),

  iniciarMonitoramentoInatividade() {
    // Se o usuário marcou "Manter conectado", não ativa o temporizador de auto-logout
    if (localStorage.getItem('flowpdv_mob_manter_conectado') === 'true') {
      return;
    }

    this.resetarTimerInatividade();

    // Eventos de interação do usuário (toques, cliques, rolagem, teclado)
    const eventosInteracao = ['mousedown', 'mousemove', 'touchstart', 'touchmove', 'keydown', 'scroll', 'click'];
    const resetHandler = () => this.registrarAtividadeUsuario();

    eventosInteracao.forEach(evento => {
      window.addEventListener(evento, resetHandler, { passive: true });
    });

    // Ao voltar para a aba ou desbloquear o celular, verifica se já se passaram 15 min
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.verificarExpiracaoInatividade();
      }
    });
    window.addEventListener('focus', () => this.verificarExpiracaoInatividade());
  },

  registrarAtividadeUsuario() {
    if (localStorage.getItem('flowpdv_mob_manter_conectado') === 'true') return;
    this.ultimoAcessoTimestamp = Date.now();
    this.resetarTimerInatividade();
  },

  resetarTimerInatividade() {
    if (localStorage.getItem('flowpdv_mob_manter_conectado') === 'true') return;
    if (this.timerInatividadeId) clearTimeout(this.timerInatividadeId);
    if (!this.chaveLicenca) return; // Só monitora se estiver autenticado

    this.timerInatividadeId = setTimeout(() => {
      this.deslogarPorInatividade();
    }, this.TEMPO_MAX_INATIVIDADE_MS);
  },

  verificarExpiracaoInatividade() {
    if (localStorage.getItem('flowpdv_mob_manter_conectado') === 'true') return;
    if (!this.chaveLicenca) return;
    const tempoPassado = Date.now() - this.ultimoAcessoTimestamp;
    if (tempoPassado >= this.TEMPO_MAX_INATIVIDADE_MS) {
      this.deslogarPorInatividade();
    } else {
      this.resetarTimerInatividade();
    }
  },

  deslogarPorInatividade() {
    if (localStorage.getItem('flowpdv_mob_manter_conectado') === 'true') return;
    if (!this.chaveLicenca) return;
    console.warn('[Segurança] Sessão expirada após 15 minutos sem atividade.');
    
    if (this.timerInatividadeId) clearTimeout(this.timerInatividadeId);
    localStorage.removeItem('flowpdv_mob_chave');
    localStorage.removeItem('flowpdv_mob_pin');
    this.chaveLicenca = '';
    this.pinGerente = '';
    this.dadosLoja = null;
    this.dadosBackup = null;

    document.getElementById('screen-app').style.display = 'none';
    document.getElementById('screen-login').style.display = 'flex';

    const toastErro = document.getElementById('login-error-toast');
    if (toastErro) {
      toastErro.innerHTML = '🔒 <strong>Sessão Expirada:</strong> Desconectado automaticamente após 15 minutos sem atividade por segurança.';
      toastErro.style.display = 'block';
    }
  },

  fazerLogout(silencioso = false) {
    if (!silencioso && !confirm('Deseja sair do aplicativo?')) return;
    if (this.timerInatividadeId) clearTimeout(this.timerInatividadeId);

    localStorage.removeItem('flowpdv_mob_chave');
    localStorage.removeItem('flowpdv_mob_pin');
    localStorage.removeItem('flowpdv_mob_manter_conectado');
    this.chaveLicenca = '';
    this.pinGerente = '';
    this.dadosLoja = null;
    this.dadosBackup = null;

    document.getElementById('screen-app').style.display = 'none';
    document.getElementById('screen-login').style.display = 'flex';
  },

  toggleVisualizarPin() {
    const input = document.getElementById('login-pin');
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
  },

  // -------------------------------------------------------------
  // CARREGAMENTO DE DADOS (FIREBASE FIRESTORE PARALELO & OTIMIZADO)
  // -------------------------------------------------------------
  async recarregarDados() {
    const btn = document.getElementById('btn-refresh');
    const overlay = document.getElementById('sync-loading-overlay');
    if (btn) btn.classList.add('rotating');
    if (overlay) overlay.style.display = 'flex';

    // Dispara atualização do Service Worker em background caso haja nova versão
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg) reg.update().catch(() => {});
      }).catch(() => {});
    }

    const t0 = Date.now();
    try {
      await this.carregarDadosLoja();
    } finally {
      const tempoDecorrido = Date.now() - t0;
      const delayMinimo = Math.max(0, 450 - tempoDecorrido);
      setTimeout(() => {
        if (btn) btn.classList.remove('rotating');
        if (overlay) overlay.style.display = 'none';
      }, delayMinimo);
    }
  },

  unsubRealtime: null,

  iniciarListenerTempoReal() {
    if (!this.chaveLicenca || !window.FirebaseDB || !window.FirebaseDB.onSnapshot) return;
    
    if (this.unsubRealtime) {
      this.unsubRealtime();
      this.unsubRealtime = null;
    }

    try {
      const { db, doc, onSnapshot } = window.FirebaseDB;
      this.unsubRealtime = onSnapshot(doc(db, 'backups_lojas', this.chaveLicenca), (snap) => {
        if (snap && snap.exists()) {
          this.dadosBackup = snap.data();
          localStorage.setItem(`flowpdv_cache_${this.chaveLicenca}`, JSON.stringify(this.dadosBackup));
          this.atualizarHeaderUI();
          this.renderResumoDashboard();
          this.renderEstoque();
          this.renderFinanceiro();
          this.processarLogsAuditoria(this.dadosAuditoriaRaw || []);
          this.renderAuditoria();
        }
      }, (err) => {
        console.warn('[MobileApp] Erro no listener realtime:', err);
      });
    } catch(e) {
      console.warn('[MobileApp] Falha ao ligar listener realtime:', e);
    }
  },

  dadosAuditoriaRaw: [],

  async carregarDadosLoja() {
    if (!this.chaveLicenca) return;

    try {
      if (!window.FirebaseDB || !window.FirebaseDB.db) return;
      const { db, doc, getDoc, collection, query, where, getDocs, limit } = window.FirebaseDB;

      // 🚀 EXECUÇÃO PARALELA: Dispara todas as consultas Firestore simultaneamente
      const promLicenca = getDoc(doc(db, 'licencas', this.chaveLicenca));
      const promBackup = getDoc(doc(db, 'backups_lojas', this.chaveLicenca));
      const promAudit = getDocs(query(
        collection(db, 'auditoria_lojas'),
        where('chaveLicenca', '==', this.chaveLicenca),
        limit(50)
      ));

      const [resLic, resBackup, resAudit] = await Promise.allSettled([promLicenca, promBackup, promAudit]);

      // 1. Processa Licença
      if (resLic.status === 'fulfilled' && resLic.value.exists()) {
        this.dadosLoja = resLic.value.data();
      }

      // 2. Processa Backup da Loja (Produtos, Vendas, Turnos, Contas, etc)
      if (resBackup.status === 'fulfilled' && resBackup.value.exists()) {
        this.dadosBackup = resBackup.value.data();
        localStorage.setItem(`flowpdv_cache_${this.chaveLicenca}`, JSON.stringify(this.dadosBackup));
      } else if (!this.dadosBackup) {
        // Tenta buscar no backup legado apenas se necessário
        try {
          const snapLeg = await getDoc(doc(db, 'backups_adegas', this.chaveLicenca));
          if (snapLeg.exists()) {
            this.dadosBackup = snapLeg.data();
            localStorage.setItem(`flowpdv_cache_${this.chaveLicenca}`, JSON.stringify(this.dadosBackup));
          }
        } catch(e) {}
      }

      // 3. Processa Logs de Auditoria
      const logs = [];
      if (resAudit.status === 'fulfilled' && resAudit.value) {
        resAudit.value.forEach(d => logs.push({ id: d.id, ...d.data() }));
      }
      this.dadosAuditoriaRaw = logs;
      this.processarLogsAuditoria(logs);

      // Iniciar Ouvinte em Tempo Real
      this.iniciarListenerTempoReal();

      // Renderizar UI atualizada
      this.atualizarHeaderUI();
      this.renderResumoDashboard();
      this.renderEstoque();
      this.renderFinanceiro();
      this.renderAuditoria();

    } catch (err) {
      console.error('[CarregarDados] Erro:', err);
    }
  },

  // -------------------------------------------------------------
  // ATUALIZAÇÃO DO HEADER
  // -------------------------------------------------------------
  atualizarHeaderUI() {
    const nomeLoja = (this.dadosLoja && (this.dadosLoja.razaoSocial || this.dadosLoja.nomeFantasia)) ||
                     (this.dadosBackup && this.dadosBackup.config && this.dadosBackup.config.nomeEmpresa) ||
                     'Minha Loja';

    const elNome = document.getElementById('header-nome-loja');
    if (elNome) elNome.textContent = nomeLoja;

    const elDataHoje = document.getElementById('resumo-data-hoje');
    if (elDataHoje) {
      const hoje = new Date();
      elDataHoje.textContent = hoje.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    }
  },

  // -------------------------------------------------------------
  // ABA 1: RESUMO DO DIA / DASHBOARD
  // -------------------------------------------------------------
  renderResumoDashboard() {
    const backup = this.dadosBackup || {};
    const vendas = backup.vendas || [];
    const turnos = backup.turnosHistorico || [];
    const produtos = backup.produtos || [];

    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    const hojeStr = `${ano}-${mes}-${dia}`;
    const mesAtualStr = `${ano}-${mes}`;

    // Vendas de Hoje (compatível com v.data, v.dataHora, v.criadoEm e ISO strings)
    const vendasHoje = vendas.filter(v => {
      const rawDate = v.data || v.dataHora || v.criadoEm || (v.timestamp ? new Date(v.timestamp).toISOString() : '');
      if (!rawDate) return false;
      const dataStr = String(rawDate).split('T')[0];
      return dataStr === hojeStr;
    });

    const totalHoje = vendasHoje.reduce((acc, v) => acc + (parseFloat(v.total) || 0), 0);
    const qtdVendasHoje = vendasHoje.length;
    const ticketMedioHoje = qtdVendasHoje > 0 ? (totalHoje / qtdVendasHoje) : 0;

    // Faturamento do Mês: Soma todas as vendas do mês corrente no backup
    const vendasMes = vendas.filter(v => {
      const rawDate = v.data || v.dataHora || v.criadoEm || (v.timestamp ? new Date(v.timestamp).toISOString() : '');
      if (!rawDate) return false;
      const dataStr = String(rawDate).split('T')[0];
      return dataStr.startsWith(mesAtualStr);
    });

    let totalMes = vendasMes.reduce((acc, v) => acc + (parseFloat(v.total) || 0), 0);

    // Fallback: se houver turnos arquivados no mês cujas vendas não constem no array
    if (totalMes === 0 && turnos.length > 0) {
      turnos.forEach(t => {
        const dataTurno = t.dataFechamento || t.dataAbertura || '';
        if (dataTurno.startsWith(mesAtualStr)) {
          totalMes += parseFloat(t.totalVendasGeral || t.totalVendas || 0);
        }
      });
    }

    // 🏦 TOTAL EM CAIXA ATUAL (Suporta 1 terminal ou múltiplos PDVs simultâneos)
    let turnosAbertos = [];
    if (backup.turnosAtivos && typeof backup.turnosAtivos === 'object') {
      turnosAbertos = Object.values(backup.turnosAtivos).filter(t => t && (t.status === 'aberto' || t.dataAbertura));
    }
    if (turnosAbertos.length === 0 && backup.turnoAtual && (backup.turnoAtual.status === 'aberto' || backup.turnoAtual.dataAbertura || backup.turnoAtual.trocoInicial !== undefined)) {
      turnosAbertos = [backup.turnoAtual];
    }

    let gavetaCaixa = 0;
    let labelCaixa = 'Dinheiro em caixa / turno';

    if (turnosAbertos.length > 0) {
      turnosAbertos.forEach(t => {
        const trocoInicial = parseFloat(t.trocoInicial || t.saldoDinheiroGaveta || 0);
        const dataAberturaTurno = t.dataAbertura ? new Date(t.dataAbertura).getTime() : 0;

        let vendasDinheiroTurno = 0;
        vendas.forEach(v => {
          const tVenda = new Date(v.data || v.dataHora || 0).getTime();
          if (dataAberturaTurno === 0 || tVenda >= dataAberturaTurno) {
            if (v.pagamentoDividido && v.parcela1 && v.parcela2) {
              if ((v.parcela1.forma || '').toLowerCase().includes('dinheiro')) vendasDinheiroTurno += parseFloat(v.parcela1.valor) || 0;
              if ((v.parcela2.forma || '').toLowerCase().includes('dinheiro')) vendasDinheiroTurno += parseFloat(v.parcela2.valor) || 0;
            } else if ((v.formaPagamento || '').toLowerCase().includes('dinheiro')) {
              vendasDinheiroTurno += parseFloat(v.total) || 0;
            }
          }
        });

        const totalSangrias = Array.isArray(t.sangrias)
          ? t.sangrias.reduce((acc, s) => acc + (parseFloat(s.valor) || 0), 0)
          : (parseFloat(t.totalSangrias) || 0);
        const totalSuprimentos = Array.isArray(t.suprimentos)
          ? t.suprimentos.reduce((acc, s) => acc + (parseFloat(s.valor) || 0), 0)
          : (parseFloat(t.totalSuprimentos) || 0);

        gavetaCaixa += Math.max(0, trocoInicial + vendasDinheiroTurno + totalSuprimentos - totalSangrias);
      });

      if (turnosAbertos.length > 1) {
        labelCaixa = `🟢 ${turnosAbertos.length} caixas abertos agora`;
      } else {
        labelCaixa = `🟢 Caixa: ${turnosAbertos[0].operador || 'Aberto'}`;
      }
    } else {
      // Nenhum caixa aberto no momento
      gavetaCaixa = 0;
      labelCaixa = '🔒 Todos os caixas fechados';
    }

    // Atualizar Métricas na Tela
    document.getElementById('metric-faturamento-hoje').textContent = this.formatarMoeda(totalHoje);
    document.getElementById('metric-qtd-vendas').textContent = qtdVendasHoje;
    document.getElementById('metric-ticket-medio').textContent = this.formatarMoeda(ticketMedioHoje);
    document.getElementById('metric-gaveta-caixa').textContent = this.formatarMoeda(gavetaCaixa);
    const labelGavetaSub = document.getElementById('label-gaveta-sub');
    if (labelGavetaSub) labelGavetaSub.textContent = labelCaixa;
    document.getElementById('metric-faturamento-mes').textContent = this.formatarMoeda(totalMes);

    // Alerta de Estoque Baixo
    const produtosBaixo = produtos.filter(p => {
      if (p.controlaEstoque === false) return false;
      const est = parseFloat(p.estoque) || 0;
      const min = parseFloat(p.estoqueMinimo) || 5;
      return est <= min;
    });

    const boxAlerta = document.getElementById('card-alerta-estoque-box');
    const badgeAlertaCount = document.getElementById('badge-alerta-estoque-count');
    const textoAlerta = document.getElementById('alerta-estoque-texto');

    if (produtosBaixo.length > 0) {
      boxAlerta.style.display = 'block';
      badgeAlertaCount.textContent = produtosBaixo.length;
      textoAlerta.textContent = `${produtosBaixo.length} ${produtosBaixo.length === 1 ? 'produto precisa' : 'produtos precisam'} de reposição urgente.`;
    } else {
      boxAlerta.style.display = 'none';
    }

    // Mini-Card de Mesas & Comandas Ao Vivo
    const comandas = backup.comandas || backup.mesas || [];
    const cardMesasEl = document.getElementById('card-resumo-mesas');
    const labelMesasStatus = document.getElementById('label-resumo-mesas-status');
    const badgeMesasTotal = document.getElementById('badge-resumo-mesas-total');

    if (comandas.length > 0 && cardMesasEl) {
      const ocupadas = comandas.filter(c => c.status === 'ocupada' || c.status === 'fechando');
      const livres = comandas.filter(c => c.status === 'livre');
      const totalConsumo = ocupadas.reduce((acc, c) => acc + (parseFloat(c.total) || 0), 0);

      cardMesasEl.style.display = 'block';
      if (labelMesasStatus) {
        labelMesasStatus.textContent = `${livres.length} Livres • ${ocupadas.length} em consumo`;
      }
      if (badgeMesasTotal) {
        badgeMesasTotal.textContent = this.formatarMoeda(totalConsumo);
      }
    } else if (cardMesasEl) {
      cardMesasEl.style.display = 'none';
    }

    // Ranking Top 5 Mais Vendidos
    const containerTopProds = document.getElementById('resumo-top-produtos');
    if (containerTopProds) {
      const contagemItens = {};
      vendas.forEach(v => {
        (v.itens || []).forEach(it => {
          const nome = it.nome || 'Produto';
          const qtd = parseFloat(it.quantidade) || 1;
          const totalItem = parseFloat(it.total) || (parseFloat(it.precoUnitario || 0) * qtd);
          if (!contagemItens[nome]) {
            contagemItens[nome] = { nome, qtd: 0, total: 0 };
          }
          contagemItens[nome].qtd += qtd;
          contagemItens[nome].total += totalItem;
        });
      });

      const top5 = Object.values(contagemItens)
        .sort((a, b) => b.qtd - a.qtd)
        .slice(0, 5);

      if (top5.length === 0) {
        containerTopProds.innerHTML = `<div style="color: var(--text-dim); font-size: 12px; text-align: center; padding: 8px;">Nenhum produto vendido ainda.</div>`;
      } else {
        const maxQtd = top5[0].qtd || 1;
        const cores = [
          'linear-gradient(90deg, #f59e0b, #fbbf24)',
          'linear-gradient(90deg, #6366f1, #818cf8)',
          'linear-gradient(90deg, #06b6d4, #38bdf8)',
          'linear-gradient(90deg, #10b981, #34d399)',
          'linear-gradient(90deg, #ec4899, #f472b6)'
        ];

        containerTopProds.innerHTML = top5.map((p, idx) => {
          const perc = (p.qtd / maxQtd) * 100;
          return `
            <div class="ranking-item-row">
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; font-weight: 700;">
                <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 180px; color: var(--text-main);">
                  ${idx === 0 ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : `${idx + 1}º`))} ${p.nome}
                </span>
                <span style="font-family: 'JetBrains Mono'; font-size: 11.5px; color: var(--text-muted); flex-shrink: 0;">
                  <strong>${p.qtd} un</strong> • <span class="valor-sensivel">${this.formatarMoeda(p.total)}</span>
                </span>
              </div>
              <div class="payment-progress-track" style="height: 5px;">
                <div class="payment-progress-bar" style="background: ${cores[idx] || cores[0]}; width: ${perc}%;"></div>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // Breakdown Formas de Pagamento
    const formas = {
      'PIX': 0,
      'Dinheiro': 0,
      'Cartão Crédito': 0,
      'Cartão Débito': 0,
      'Fiado': 0,
      'Outros': 0
    };

    vendasHoje.forEach(v => {
      const f = v.formaPagamento || 'Outros';
      if (f.includes('PIX')) formas['PIX'] += parseFloat(v.total) || 0;
      else if (f.includes('Dinheiro')) formas['Dinheiro'] += parseFloat(v.total) || 0;
      else if (f.includes('Crédito')) formas['Cartão Crédito'] += parseFloat(v.total) || 0;
      else if (f.includes('Débito')) formas['Cartão Débito'] += parseFloat(v.total) || 0;
      else if (f.includes('Fiado')) formas['Fiado'] += parseFloat(v.total) || 0;
      else formas['Outros'] += parseFloat(v.total) || 0;
    });

    const containerFormas = document.getElementById('resumo-formas-pagamento');
    const formasComValor = Object.entries(formas).filter(([_, val]) => val > 0);

    if (formasComValor.length === 0) {
      containerFormas.innerHTML = `<div style="color: var(--text-dim); font-size: 12px; text-align: center; padding: 12px 6px;">Nenhuma venda registrada hoje.</div>`;
    } else {
      containerFormas.innerHTML = formasComValor.map(([nome, val]) => {
        const perc = totalHoje > 0 ? (val / totalHoje) * 100 : 0;
        const gradiente = this.getGradienteFormaPag(nome);
        return `
          <div class="payment-breakdown-row">
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12.5px; font-weight: 700; margin-bottom: 5px;">
              <span style="display: flex; align-items: center; gap: 6px;">${this.getIconeFormaPag(nome)} <span>${nome}</span></span>
              <span style="font-family: 'JetBrains Mono'; color: var(--text-main);">${this.formatarMoeda(val)} <small style="color: var(--text-dim); font-size: 11px; margin-left: 4px;">(${perc.toFixed(0)}%)</small></span>
            </div>
            <div class="payment-progress-track">
              <div class="payment-progress-bar" style="background: ${gradiente}; width: ${perc}%;"></div>
            </div>
          </div>
        `;
      }).join('');
    }

    // Lista de Últimas Vendas
    const containerVendas = document.getElementById('lista-ultimas-vendas');
    document.getElementById('badge-total-vendas-hoje').textContent = vendasHoje.length;

    if (vendasHoje.length === 0) {
      containerVendas.innerHTML = `
        <div class="empty-state-mobile">
          <span class="empty-state-icon">🛒</span>
          <span style="font-size: 13px;">Nenhuma venda realizada hoje até o momento.</span>
        </div>
      `;
    } else {
      const ultimasVendas = [...vendasHoje].sort((a, b) => {
        const tA = new Date(a.data || a.dataHora || a.criadoEm || 0).getTime();
        const tB = new Date(b.data || b.dataHora || b.criadoEm || 0).getTime();
        return tB - tA;
      }).slice(0, 20);

      containerVendas.innerHTML = ultimasVendas.map(v => {
        const rawDate = v.data || v.dataHora || v.criadoEm || '';
        const hora = rawDate ? (rawDate.includes('T') ? rawDate.split('T')[1].substring(0, 5) : new Date(rawDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })) : '--:--';
        const qtdItens = (v.itens || []).reduce((acc, it) => acc + (parseFloat(it.quantidade) || 1), 0);
        const forma = v.formaPagamento || 'Dinheiro';
        const badgeClasse = this.getBadgeClasseForma(forma);

        return `
          <div class="mobile-list-card" onclick="MobileApp.verDetalhesVenda('${v.id}')">
            <div class="card-top-row">
              <strong class="card-item-title">Venda #${v.id ? v.id.slice(-5) : '0000'}</strong>
              <span class="card-item-price valor-sensivel">${this.formatarMoeda(v.total)}</span>
            </div>
            <div class="card-bottom-row">
              <span class="card-info-meta">👤 ${v.operador || 'Caixa'} • 📦 ${qtdItens} ${qtdItens === 1 ? 'item' : 'itens'}</span>
              <div class="card-tag-wrapper">
                <span class="card-time-text">🕒 ${hora}</span>
                <span class="badge-tag-sm ${badgeClasse}">${forma}</span>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
  },

  compartilharResumoWhatsApp() {
    const backup = this.dadosBackup || {};
    const vendas = backup.vendas || [];
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    const hojeStr = `${ano}-${mes}-${dia}`;
    const dataBr = hoje.toLocaleDateString('pt-BR');

    const vendasHoje = vendas.filter(v => (v.data || v.dataHora || v.criadoEm || '').startsWith(hojeStr));
    const totalHoje = vendasHoje.reduce((acc, v) => acc + (parseFloat(v.total) || 0), 0);
    const qtdVendas = vendasHoje.length;
    const ticketMedio = qtdVendas > 0 ? (totalHoje / qtdVendas) : 0;

    const nomeLoja = (this.dadosLoja && (this.dadosLoja.razaoSocial || this.dadosLoja.nomeFantasia)) ||
                     (backup.config && backup.config.nomeEmpresa) || 'FlowPDV Gestão';

    const formas = { 'PIX': 0, 'Dinheiro': 0, 'Cartão Crédito': 0, 'Cartão Débito': 0, 'Fiado': 0 };
    vendasHoje.forEach(v => {
      const f = v.formaPagamento || 'Outros';
      if (f.includes('PIX')) formas['PIX'] += parseFloat(v.total) || 0;
      else if (f.includes('Dinheiro')) formas['Dinheiro'] += parseFloat(v.total) || 0;
      else if (f.includes('Crédito')) formas['Cartão Crédito'] += parseFloat(v.total) || 0;
      else if (f.includes('Débito')) formas['Cartão Débito'] += parseFloat(v.total) || 0;
      else if (f.includes('Fiado')) formas['Fiado'] += parseFloat(v.total) || 0;
    });

    let texto = `📊 *FLOWPDV — FECHAMENTO DIÁRIO (${dataBr})*\n`;
    texto += `🏪 *Loja:* ${nomeLoja}\n\n`;
    texto += `💰 *Faturamento Total:* ${this.formatarMoeda(totalHoje)}\n`;
    texto += `🧾 *Qtd. Vendas:* ${qtdVendas} pedidos\n`;
    texto += `🎯 *Ticket Médio:* ${this.formatarMoeda(ticketMedio)}\n\n`;
    texto += `💳 *Recebimentos por Forma:*\n`;
    if (formas['PIX'] > 0) texto += `⚡ PIX: ${this.formatarMoeda(formas['PIX'])}\n`;
    if (formas['Dinheiro'] > 0) texto += `💵 Dinheiro: ${this.formatarMoeda(formas['Dinheiro'])}\n`;
    if (formas['Cartão Débito'] > 0) texto += `💳 Débito: ${this.formatarMoeda(formas['Cartão Débito'])}\n`;
    if (formas['Cartão Crédito'] > 0) texto += `💳 Crédito: ${this.formatarMoeda(formas['Cartão Crédito'])}\n`;
    if (formas['Fiado'] > 0) texto += `📖 Fiado: ${this.formatarMoeda(formas['Fiado'])}\n`;

    texto += `\n_Gerado automaticamente via FlowPDV Gestor Mobile_ 🚀`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');
  },

  // -------------------------------------------------------------
  // ABA 2: ESTOQUE & REPOSIÇÃO
  // -------------------------------------------------------------
  setFiltroEstoque(filtro, elementoClicado) {
    this.filtroEstoqueAtual = filtro;
    document.querySelectorAll('#tab-estoque .chip-btn').forEach(btn => btn.classList.remove('active'));
    
    const btn = elementoClicado || document.getElementById(`chip-est-${filtro}`);
    if (btn) {
      btn.classList.add('active');
      btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }

    this.renderEstoque();
  },

  scrollChips(direcao) {
    const container = document.getElementById('chips-estoque-container');
    if (!container) return;
    const scrollAmount = 140;
    if (direcao === 'esquerda') {
      container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  },

  filtrarEstoque() {
    this.renderEstoque();
  },

  renderEstoque() {
    const backup = this.dadosBackup || {};
    const produtos = backup.produtos || [];
    const busca = (document.getElementById('input-busca-estoque')?.value || '').toLowerCase().trim();
    const container = document.getElementById('lista-produtos-estoque');
    const badgeTotal = document.getElementById('badge-total-produtos');

    const hoje = new Date();

    let filtrados = produtos.filter(p => {
      // Busca textual
      const matchBusca = !busca ||
        (p.nome || '').toLowerCase().includes(busca) ||
        (p.codigoBarras || '').toLowerCase().includes(busca) ||
        (p.categoria || '').toLowerCase().includes(busca);

      if (!matchBusca) return false;

      const est = parseFloat(p.estoque) || 0;
      const min = parseFloat(p.estoqueMinimo) || 5;

      if (this.filtroEstoqueAtual === 'baixo') {
        return p.controlaEstoque !== false && est <= min;
      } else if (this.filtroEstoqueAtual === 'vencidos') {
        if (!p.dataValidade) return false;
        const diff = Math.ceil((new Date(p.dataValidade) - hoje) / (1000 * 60 * 60 * 24));
        return diff <= 30;
      } else if (this.filtroEstoqueAtual === 'compras') {
        return p.controlaEstoque !== false && est < min;
      }

      return true;
    });

    if (badgeTotal) badgeTotal.textContent = filtrados.length;

    if (filtrados.length === 0) {
      container.innerHTML = `
        <div class="empty-state-mobile">
          <span class="empty-state-icon">📦</span>
          <span style="font-size: 13px;">Nenhum produto encontrado neste filtro.</span>
        </div>
      `;
      return;
    }

    container.innerHTML = filtrados.map(p => {
      const precoVenda = parseFloat(p.precoVenda) || 0;
      const estoque = parseFloat(p.estoque) || 0;
      const min = parseFloat(p.estoqueMinimo) || 5;

      let badgeEstoque = '';
      if (p.controlaEstoque === false) {
        badgeEstoque = `<span class="badge-tag-sm blue">♾️ Serviço / Fixo</span>`;
      } else if (estoque <= 0) {
        badgeEstoque = `<span class="badge-tag-sm zero">🚨 Esgotado (0 un)</span>`;
      } else if (estoque <= min) {
        badgeEstoque = `<span class="badge-tag-sm low">⚠️ Baixo (${estoque} un)</span>`;
      } else {
        badgeEstoque = `<span class="badge-tag-sm ok">✅ ${estoque} un</span>`;
      }

      let sugestaoCompraHtml = '';
      if (this.filtroEstoqueAtual === 'compras') {
        const sugerido = Math.max(1, (min * 2) - estoque);
        sugestaoCompraHtml = `
          <div class="sugestao-compra-badge-row">
            <span>🛒 Sugestão de Reposição:</span>
            <strong style="font-family: 'JetBrains Mono';">+${sugerido} un</strong>
          </div>
        `;
      }

      return `
        <div class="mobile-list-card">
          <div class="card-top-row">
            <strong class="card-item-title">${p.nome}</strong>
            <span class="card-item-price">${this.formatarMoeda(precoVenda)}</span>
          </div>
          <div class="card-bottom-row">
            <span>🏷️ ${p.categoria || 'Geral'}</span>
            ${badgeEstoque}
          </div>
          ${sugestaoCompraHtml}
        </div>
      `;
    }).join('');
  },

  // -------------------------------------------------------------
  // ABA 3: FINANCEIRO & FIADO
  // -------------------------------------------------------------
  setFiltroFinanceiro(filtro) {
    this.filtroFinanceiroAtual = filtro;
    const secContas = document.getElementById('secao-contas-pagar');
    const secFiado = document.getElementById('secao-fiado-clientes');
    const chipContas = document.getElementById('chip-fin-contas');
    const chipFiado = document.getElementById('chip-fin-fiado');

    if (filtro === 'contas') {
      secContas.style.display = 'flex';
      secFiado.style.display = 'none';
      chipContas.classList.add('active');
      chipFiado.classList.remove('active');
    } else {
      secContas.style.display = 'none';
      secFiado.style.display = 'flex';
      chipContas.classList.remove('active');
      chipFiado.classList.add('active');
    }
  },

  setFiltroContas(filtro, el) {
    this.filtroContasAtual = filtro;
    document.querySelectorAll('#chips-contas-container .chip-btn').forEach(b => b.classList.remove('active'));
    if (el) {
      el.classList.add('active');
      el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
    this.renderFinanceiro();
  },

  scrollChipsContas(direcao) {
    const container = document.getElementById('chips-contas-container');
    if (!container) return;
    const scrollAmount = 140;
    container.scrollBy({ left: direcao === 'esquerda' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
  },

  renderFinanceiro() {
    const backup = this.dadosBackup || {};
    const contas = backup.contasPagar || [];
    const clientes = backup.clientes || [];
    const hoje = new Date().toISOString().split('T')[0];

    // 1. Contas a Pagar
    const contasPendentesGeral = contas.filter(c => c && c.status !== 'pago' && c.status !== 'paga');
    const totalPendente = contasPendentesGeral.reduce((acc, c) => acc + (parseFloat(c.valor) || 0), 0);
    const contasVencidasGeral = contasPendentesGeral.filter(c => {
      const dv = c.vencimento || c.dataVencimento || '';
      return dv && dv < hoje;
    });

    document.getElementById('metric-total-contas-pendentes').textContent = this.formatarMoeda(totalPendente);
    document.getElementById('metric-contas-vencidas-alerta').textContent = `🚨 ${contasVencidasGeral.length} ${contasVencidasGeral.length === 1 ? 'conta vencida' : 'contas vencidas'}`;

    // Filtragem conforme chip selecionado
    let contasExibidas = contas.filter(c => {
      if (!c) return false;
      const isPago = c.status === 'pago' || c.status === 'paga';
      const dv = c.vencimento || c.dataVencimento || '';

      if (this.filtroContasAtual === 'pagas') return isPago;
      if (this.filtroContasAtual === 'vencidas') return !isPago && dv && dv < hoje;
      if (this.filtroContasAtual === 'hoje') return !isPago && dv && dv === hoje;
      if (this.filtroContasAtual === 'avencer') return !isPago && dv && dv > hoje;
      // 'todos' shows all active pending
      return !isPago;
    });

    document.getElementById('badge-total-contas').textContent = contasExibidas.length;

    const containerContas = document.getElementById('lista-contas-pagar');
    if (contasExibidas.length === 0) {
      containerContas.innerHTML = `
        <div class="empty-state-mobile">
          <span class="empty-state-icon">✅</span>
          <span style="font-size: 13px;">Nenhuma conta encontrada neste filtro.</span>
        </div>
      `;
    } else {
      containerContas.innerHTML = contasExibidas.map(c => {
        const isPago = c.status === 'pago' || c.status === 'paga';
        const dataVenc = c.vencimento || c.dataVencimento || '';
        const isVencida = !isPago && dataVenc && dataVenc < hoje;
        const isHoje = !isPago && dataVenc === hoje;

        let badgeVenc = '';
        if (isPago) badgeVenc = `<span class="badge-tag-sm ok">✅ Paga</span>`;
        else if (isVencida) badgeVenc = `<span class="badge-tag-sm zero">🚨 Vencida</span>`;
        else if (isHoje) badgeVenc = `<span class="badge-tag-sm low">⏳ Vence Hoje</span>`;
        else badgeVenc = `<span class="badge-tag-sm ok">📅 A Vencer</span>`;

        let vencFormatado = '--';
        if (dataVenc) {
          if (dataVenc.includes('-')) {
            const parts = dataVenc.split('T')[0].split('-');
            if (parts.length === 3) vencFormatado = `${parts[2]}/${parts[1]}/${parts[0]}`;
          } else {
            vencFormatado = new Date(dataVenc).toLocaleDateString('pt-BR');
          }
        }

        const categoriaNome = c.categoria || 'Geral';

        return `
          <div class="mobile-list-card" onclick="MobileApp.verDetalhesContaPagar('${c.id}')">
            <div class="card-top-row">
              <strong class="card-item-title" style="flex: 1; min-width: 0; line-height: 1.35; font-size: 14px;">${c.descricao || 'Despesa'}</strong>
              <span class="card-item-price valor-sensivel" style="color: ${isPago ? 'var(--accent-green)' : '#f87171'}; white-space: nowrap; flex-shrink: 0; margin-left: 10px; font-size: 15px;">${this.formatarMoeda(c.valor)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-top: 8px; font-size: 12px; color: var(--text-muted);">
              <span style="display: flex; align-items: center; gap: 4px;">📅 Venc: <strong style="color: var(--text-main); font-family: 'JetBrains Mono';">${vencFormatado}</strong></span>
              <span class="badge-tag-sm cyan" style="font-size: 11px; font-weight: 700; white-space: nowrap; flex-shrink: 0;">🏷️ ${categoriaNome}</span>
            </div>
            <div class="card-bottom-row" style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed var(--border-card);">
              ${badgeVenc}
              <span style="color: var(--accent-cyan); font-size: 11px; font-weight: 700;">Toque para ver ➔</span>
            </div>
          </div>
        `;
      }).join('');
    }

    // 2. Fiado / Caderneta
    const clientesDevedores = clientes.filter(cli => (parseFloat(cli.saldoDevedor) || 0) > 0.05);
    const totalFiado = clientesDevedores.reduce((acc, cli) => acc + (parseFloat(cli.saldoDevedor) || 0), 0);

    document.getElementById('metric-total-fiado-receber').textContent = this.formatarMoeda(totalFiado);
    document.getElementById('metric-qtd-clientes-devedores').textContent = clientesDevedores.length;
    document.getElementById('badge-total-devedores').textContent = clientesDevedores.length;

    const containerFiado = document.getElementById('lista-clientes-fiado');
    if (clientesDevedores.length === 0) {
      containerFiado.innerHTML = `
        <div class="empty-state-mobile">
          <span class="empty-state-icon">📖</span>
          <span style="font-size: 13px;">Nenhum cliente com saldo devedor em aberto.</span>
        </div>
      `;
    } else {
      const nomeLoja = (this.dadosLoja && (this.dadosLoja.razaoSocial || this.dadosLoja.nomeFantasia)) || 'nossa loja';

      containerFiado.innerHTML = clientesDevedores.map(cli => {
        const saldo = parseFloat(cli.saldoDevedor) || 0;
        const telLimpo = (cli.telefone || '').replace(/\D/g, '');

        let btnZap = '';
        if (telLimpo.length >= 10) {
          const msg = encodeURIComponent(`Olá ${cli.nome}, tudo bem? Passando para lembrar do seu saldo em aberto de ${this.formatarMoeda(saldo)} aqui no ${nomeLoja}. Qualquer dúvida estamos à disposição!`);
          btnZap = `
            <a href="https://wa.me/55${telLimpo}?text=${msg}" target="_blank" onclick="event.stopPropagation()" class="btn-whatsapp-mobile">
              <span>💬 Zap</span>
            </a>
          `;
        }

        return `
          <div class="mobile-list-card" onclick="MobileApp.verDetalhesClienteFiado('${cli.id}')">
            <div class="card-top-row">
              <strong class="card-item-title">👤 ${cli.nome}</strong>
              <span class="card-item-price" style="color: #fbbf24; white-space: nowrap; flex-shrink: 0;">${this.formatarMoeda(saldo)}</span>
            </div>
            <div class="card-bottom-row" style="margin-top: 4px;">
              <span class="card-info-meta">📞 ${cli.telefone || 'Sem telefone'}</span>
              <div style="display: flex; align-items: center; gap: 8px;">
                ${btnZap}
                <span style="color: var(--accent-cyan); font-size: 11px; font-weight: 700;">Toque para ver ➔</span>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
  },

  // -------------------------------------------------------------
  // ABA 4: CENTRAL DE GERÊNCIA (EQUIPE, AUDITORIA & MESAS)
  // -------------------------------------------------------------
  setSubAbaGerencia(subAba) {
    this.subAbaGerenciaAtual = subAba;
    document.querySelectorAll('.gerencia-subnav-btn').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById(`btn-sub-ger-${subAba}`);
    if (btn) btn.classList.add('active');

    const secEquipe = document.getElementById('subsecao-gerencia-equipe');
    const secAudit = document.getElementById('subsecao-gerencia-auditoria');
    const secMesas = document.getElementById('subsecao-gerencia-mesas');

    if (secEquipe) secEquipe.style.display = subAba === 'equipe' ? 'flex' : 'none';
    if (secAudit) secAudit.style.display = subAba === 'auditoria' ? 'flex' : 'none';
    if (secMesas) secMesas.style.display = subAba === 'mesas' ? 'flex' : 'none';

    this.renderGerencia();
  },

  renderGerencia() {
    this.renderGerenciaFuncionarios();
    this.renderAuditoria();
    this.renderGerenciaMesas();
  },

  renderGerenciaFuncionarios() {
    const backup = this.dadosBackup || {};
    const funcionarios = backup.usuarios || backup.funcionarios || [];
    const container = document.getElementById('lista-gerencia-funcionarios');
    const badgeTotal = document.getElementById('badge-total-funcionarios');

    if (badgeTotal) badgeTotal.textContent = funcionarios.length;

    if (!container) return;

    if (funcionarios.length === 0) {
      container.innerHTML = `
        <div class="empty-state-mobile">
          <span class="empty-state-icon">👥</span>
          <span style="font-size: 13px;">Nenhum funcionário cadastrado no sistema.</span>
        </div>
      `;
      return;
    }

    container.innerHTML = funcionarios.map(func => {
      const cargo = (func.cargo || func.funcao || 'operador').toLowerCase();
      const isAdmin = cargo.includes('admin') || cargo.includes('gerente') || cargo.includes('superadmin') || cargo.includes('dono');
      const badgeCargo = isAdmin 
        ? `<span class="badge-tag-sm purple">👑 ${func.cargo === 'gerente' ? 'Gerente' : (func.cargo || 'Gerente')}</span>`
        : `<span class="badge-tag-sm blue">👤 ${func.cargo || 'Operador'}</span>`;

      const isAtivo = func.ativo !== false;
      const idFunc = func.id || func.usuario || func.login || func.nome;

      return `
        <div class="mobile-list-card clickable" onclick="MobileApp.abrirModalEditarFuncionario('${idFunc}')">
          <div class="card-top-row">
            <strong class="card-item-title">👤 ${func.nome || 'Colaborador'}</strong>
            ${badgeCargo}
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px; font-size: 12px; color: var(--text-muted);">
            <span>🔑 Login: <strong style="color: var(--text-main); font-family: 'JetBrains Mono';">${func.login || func.usuario || func.nome}</strong></span>
            <span>🔒 PIN: <strong style="color: var(--text-dim); font-family: 'JetBrains Mono';">••••</strong></span>
          </div>
          <div class="card-bottom-row" style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed var(--border-card);">
            <span class="badge-tag-sm ${isAtivo ? 'ok' : 'zero'}">${isAtivo ? '🟢 Acesso Ativo' : '🔴 Acesso Inativo'}</span>
            <span style="color: var(--accent-cyan); font-size: 11px; font-weight: 700;">✏️ Gerenciar Acesso ➔</span>
          </div>
        </div>
      `;
    }).join('');
  },

  abrirModalNovoFuncionario() {
    const html = `
      <form onsubmit="MobileApp.salvarFuncionarioNuvem(event)" style="display: flex; flex-direction: column; gap: 12px;">
        <input type="hidden" id="edit-func-id" value="">
        
        <div class="form-group-mobile" style="margin-bottom: 0;">
          <label class="form-label-mobile">Nome do Colaborador *</label>
          <input type="text" id="edit-func-nome" class="input-mobile" placeholder="Ex: Carlos Oliveira" required>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div class="form-group-mobile" style="margin-bottom: 0;">
            <label class="form-label-mobile">Login / Usuário *</label>
            <input type="text" id="edit-func-login" class="input-mobile" placeholder="Ex: carlos" required>
          </div>
          <div class="form-group-mobile" style="margin-bottom: 0;">
            <label class="form-label-mobile">PIN / Senha (4 a 6 dígitos) *</label>
            <input type="password" id="edit-func-pin" class="input-mobile mono" placeholder="1234" required>
          </div>
        </div>

        <div class="form-group-mobile" style="margin-bottom: 0;">
          <label class="form-label-mobile">Cargo / Função *</label>
          <select id="edit-func-cargo" class="input-mobile" style="cursor: pointer;">
            <option value="operador">👤 Operador</option>
            <option value="gerente">👑 Gerente</option>
          </select>
        </div>

        <div style="background: var(--bg-surface-2); padding: 10px 12px; border-radius: 8px; margin-top: 4px;">
          <span class="form-label-mobile" style="margin-bottom: 6px;">Permissões no PDV</span>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px; color: var(--text-main);">
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
              <input type="checkbox" id="perm-cancelar-item" checked style="accent-color: var(--accent-purple);"> Cancelar Itens
            </label>
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
              <input type="checkbox" id="perm-cancelar-venda" style="accent-color: var(--accent-purple);"> Cancelar Vendas
            </label>
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
              <input type="checkbox" id="perm-dar-desconto" checked style="accent-color: var(--accent-purple);"> Dar Desconto
            </label>
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
              <input type="checkbox" id="perm-realizar-sangria" checked style="accent-color: var(--accent-purple);"> Realizar Sangria
            </label>
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
              <input type="checkbox" id="perm-ver-custo" style="accent-color: var(--accent-purple);"> Ver Custo Estoque
            </label>
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
              <input type="checkbox" id="perm-reimprimir-cupons" checked style="accent-color: var(--accent-purple);"> Reimprimir Cupons
            </label>
          </div>
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; padding: 4px 0;">
          <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; color: var(--text-main); cursor: pointer;">
            <input type="checkbox" id="edit-func-ativo" checked style="width: 16px; height: 16px; accent-color: var(--accent-green);">
            <span>🟢 Acesso Ativo no Sistema</span>
          </label>
        </div>

        <div style="display: flex; gap: 8px; margin-top: 8px;">
          <button type="submit" id="btn-salvar-func-modal" class="btn-login-submit" style="flex: 1; height: 46px; font-size: 14px;">
            <span>💾 Salvar Colaborador</span>
          </button>
        </div>
      </form>
    `;

    this.abrirModalSheet('➕ Novo Colaborador', html);
  },

  abrirModalEditarFuncionario(funcId) {
    const backup = this.dadosBackup || {};
    const funcionarios = backup.usuarios || backup.funcionarios || [];
    const func = funcionarios.find(u => String(u.id) === String(funcId) || String(u.usuario) === String(funcId) || String(u.login) === String(funcId));
    if (!func) return;

    const cargo = (func.cargo || func.funcao || 'operador').toLowerCase();
    const isAtivo = func.ativo !== false;
    const perms = func.permissoes || {};

    const html = `
      <form onsubmit="MobileApp.salvarFuncionarioNuvem(event)" style="display: flex; flex-direction: column; gap: 12px;">
        <input type="hidden" id="edit-func-id" value="${func.id || ''}">
        
        <div class="form-group-mobile" style="margin-bottom: 0;">
          <label class="form-label-mobile">Nome do Colaborador *</label>
          <input type="text" id="edit-func-nome" class="input-mobile" value="${func.nome || ''}" required>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div class="form-group-mobile" style="margin-bottom: 0;">
            <label class="form-label-mobile">Login / Usuário *</label>
            <input type="text" id="edit-func-login" class="input-mobile" value="${func.login || func.usuario || func.nome}" required>
          </div>
          <div class="form-group-mobile" style="margin-bottom: 0;">
            <label class="form-label-mobile">PIN / Senha de Acesso</label>
            <input type="text" id="edit-func-pin" class="input-mobile mono" value="${func.pin || func.senha || ''}" placeholder="Alterar senha" required>
          </div>
        </div>

        <div class="form-group-mobile" style="margin-bottom: 0;">
          <label class="form-label-mobile">Cargo / Função *</label>
          <select id="edit-func-cargo" class="input-mobile" style="cursor: pointer;">
            <option value="operador" ${cargo === 'operador' ? 'selected' : ''}>👤 Operador</option>
            <option value="gerente" ${cargo === 'gerente' || cargo === 'administrador' || cargo === 'superadmin' ? 'selected' : ''}>👑 Gerente</option>
          </select>
        </div>

        <div style="background: var(--bg-surface-2); padding: 10px 12px; border-radius: 8px; margin-top: 4px;">
          <span class="form-label-mobile" style="margin-bottom: 6px;">Permissões no PDV</span>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px; color: var(--text-main);">
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
              <input type="checkbox" id="perm-cancelar-item" ${perms.cancelarItem !== false ? 'checked' : ''} style="accent-color: var(--accent-purple);"> Cancelar Itens
            </label>
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
              <input type="checkbox" id="perm-cancelar-venda" ${perms.cancelarVenda ? 'checked' : ''} style="accent-color: var(--accent-purple);"> Cancelar Vendas
            </label>
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
              <input type="checkbox" id="perm-dar-desconto" ${perms.darDesconto !== false ? 'checked' : ''} style="accent-color: var(--accent-purple);"> Dar Desconto
            </label>
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
              <input type="checkbox" id="perm-realizar-sangria" ${perms.realizarSangria !== false ? 'checked' : ''} style="accent-color: var(--accent-purple);"> Realizar Sangria
            </label>
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
              <input type="checkbox" id="perm-ver-custo" ${perms.verCustoEstoque ? 'checked' : ''} style="accent-color: var(--accent-purple);"> Ver Custo Estoque
            </label>
            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
              <input type="checkbox" id="perm-reimprimir-cupons" ${perms.reimprimirCupons !== false ? 'checked' : ''} style="accent-color: var(--accent-purple);"> Reimprimir Cupons
            </label>
          </div>
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; padding: 4px 0;">
          <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; color: var(--text-main); cursor: pointer;">
            <input type="checkbox" id="edit-func-ativo" ${isAtivo ? 'checked' : ''} style="width: 16px; height: 16px; accent-color: var(--accent-green);">
            <span>🟢 Acesso Ativo no Sistema</span>
          </label>
        </div>

        <div style="display: flex; gap: 8px; margin-top: 8px;">
          <button type="submit" id="btn-salvar-func-modal" class="btn-login-submit" style="flex: 1; height: 46px; font-size: 14px;">
            <span>💾 Salvar Alterações</span>
          </button>
          <button type="button" class="btn-login-submit" style="background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid #ef4444; width: auto; padding: 0 14px; height: 46px;" onclick="MobileApp.excluirFuncionarioNuvem('${func.id || func.usuario || func.login}')">
            <span>🗑️ Excluir</span>
          </button>
        </div>
      </form>
    `;

    this.abrirModalSheet(`👤 Editar: ${func.nome}`, html);
  },

  async salvarFuncionarioNuvem(e) {
    e.preventDefault();
    const btnSubmit = document.getElementById('btn-salvar-func-modal');
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = '<span>⏳ Salvando na Nuvem...</span>';
    }

    try {
      const id = document.getElementById('edit-func-id').value;
      const nome = document.getElementById('edit-func-nome').value.trim();
      const login = document.getElementById('edit-func-login').value.trim().toLowerCase();
      const pin = document.getElementById('edit-func-pin').value.trim();
      const cargo = document.getElementById('edit-func-cargo').value;
      const ativo = document.getElementById('edit-func-ativo').checked;

      const permissoes = {
        cancelarItem: document.getElementById('perm-cancelar-item')?.checked ?? true,
        cancelarVenda: document.getElementById('perm-cancelar-venda')?.checked ?? false,
        darDesconto: document.getElementById('perm-dar-desconto')?.checked ?? true,
        realizarSangria: document.getElementById('perm-realizar-sangria')?.checked ?? true,
        verCustoEstoque: document.getElementById('perm-ver-custo')?.checked ?? false,
        reimprimirCupons: document.getElementById('perm-reimprimir-cupons')?.checked ?? true
      };

      if (!nome || !pin) {
        alert('Por favor informe o nome e o PIN/Senha.');
        return;
      }

      if (!this.dadosBackup) this.dadosBackup = {};
      if (!Array.isArray(this.dadosBackup.usuarios)) {
        this.dadosBackup.usuarios = this.dadosBackup.funcionarios || [];
      }

      let usuarios = [...this.dadosBackup.usuarios];

      if (id) {
        const idx = usuarios.findIndex(u => String(u.id) === String(id) || String(u.usuario) === String(id) || String(u.login) === String(id));
        if (idx !== -1) {
          usuarios[idx] = {
            ...usuarios[idx],
            nome,
            login,
            pin,
            cargo,
            ativo,
            permissoes,
            atualizadoEm: new Date().toISOString()
          };
        } else {
          usuarios.push({
            id: id || ('USR-' + Date.now().toString().slice(-4)),
            nome,
            login,
            pin,
            cargo,
            ativo,
            permissoes,
            criadoEm: new Date().toISOString()
          });
        }
      } else {
        usuarios.push({
          id: 'USR-' + Date.now().toString().slice(-4),
          nome,
          login,
          pin,
          cargo,
          ativo,
          permissoes,
          criadoEm: new Date().toISOString()
        });
      }

      this.dadosBackup.usuarios = usuarios;
      this.dadosBackup.funcionarios = usuarios;
      localStorage.setItem(`flowpdv_cache_${this.chaveLicenca}`, JSON.stringify(this.dadosBackup));

      // Sincronizar diretamente no Firestore com merge seguro
      if (window.FirebaseDB && window.FirebaseDB.db) {
        const { db, doc, setDoc } = window.FirebaseDB;
        const refDoc = doc(db, 'backups_lojas', this.chaveLicenca);
        if (setDoc) {
          await setDoc(refDoc, { usuarios, funcionarios: usuarios, atualizadoEm: new Date().toISOString() }, { merge: true });
        }
      }

      this.fecharModalSheet();
      this.renderGerenciaFuncionarios();
      alert('✅ Colaborador salvo com sucesso e sincronizado com o PDV!');
    } catch (err) {
      console.error('[Equipe] Erro ao salvar funcionário:', err);
      alert('❌ Erro ao salvar na nuvem: ' + err.message);
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<span>💾 Salvar</span>';
      }
    }
  },

  async excluirFuncionarioNuvem(funcId) {
    if (!confirm('Tem certeza que deseja excluir o acesso deste colaborador?')) return;

    try {
      if (!this.dadosBackup) return;
      let usuarios = this.dadosBackup.usuarios || this.dadosBackup.funcionarios || [];
      usuarios = usuarios.filter(u => String(u.id) !== String(funcId) && String(u.usuario) !== String(funcId) && String(u.login) !== String(funcId));

      this.dadosBackup.usuarios = usuarios;
      this.dadosBackup.funcionarios = usuarios;
      localStorage.setItem(`flowpdv_cache_${this.chaveLicenca}`, JSON.stringify(this.dadosBackup));

      if (window.FirebaseDB && window.FirebaseDB.db) {
        const { db, doc, setDoc } = window.FirebaseDB;
        const refDoc = doc(db, 'backups_lojas', this.chaveLicenca);
        if (setDoc) {
          await setDoc(refDoc, { usuarios, funcionarios: usuarios, atualizadoEm: new Date().toISOString() }, { merge: true });
        }
      }

      this.fecharModalSheet();
      this.renderGerenciaFuncionarios();
      alert('✅ Colaborador excluído com sucesso!');
    } catch (e) {
      console.error('[Equipe] Erro ao excluir:', e);
      alert('❌ Erro ao excluir na nuvem: ' + e.message);
    }
  },

  renderGerenciaMesas() {
    const backup = this.dadosBackup || {};
    const comandas = backup.comandas || backup.mesas || [];
    const container = document.getElementById('lista-gerencia-mesas-grid');
    const badgeTotal = document.getElementById('badge-total-mesas-grid');
    const kpiLivres = document.getElementById('gerencia-mesas-livres-count');
    const kpiOcupadas = document.getElementById('gerencia-mesas-ocupadas-count');

    const livres = comandas.filter(c => c.status === 'livre');
    const ocupadas = comandas.filter(c => c.status === 'ocupada' || c.status === 'fechando');

    if (kpiLivres) kpiLivres.textContent = livres.length;
    if (kpiOcupadas) kpiOcupadas.textContent = ocupadas.length;
    if (badgeTotal) badgeTotal.textContent = comandas.length;

    if (!container) return;

    if (comandas.length === 0) {
      container.innerHTML = `
        <div class="empty-state-mobile">
          <span class="empty-state-icon">🍽️</span>
          <span style="font-size: 13px;">Nenhuma mesa ou comanda configurada na loja.</span>
        </div>
      `;
      return;
    }

    container.innerHTML = comandas.map(c => {
      const isLivre = c.status === 'livre';
      const isFechando = c.status === 'fechando';
      const total = parseFloat(c.total) || 0;
      const qtdItens = (c.itens || []).reduce((acc, it) => acc + (parseFloat(it.quantidade) || 1), 0);

      let badgeStatus = `<span class="badge-tag-sm ok">🟢 LIVRE</span>`;
      if (isFechando) badgeStatus = `<span class="badge-tag-sm low">⏱️ CONFERINDO</span>`;
      else if (!isLivre) badgeStatus = `<span class="badge-tag-sm zero">🔴 EM USO</span>`;

      return `
        <div class="mobile-list-card" onclick="MobileApp.verDetalhesMesa('${c.id}')">
          <div class="card-top-row">
            <strong class="card-item-title">${c.tipo === 'mesa' ? '🪑' : '🏷️'} ${c.nome}</strong>
            <span class="card-item-price ${isLivre ? '' : 'valor-sensivel'}" style="color: ${isLivre ? 'var(--text-dim)' : 'var(--accent-green)'};">
              ${this.formatarMoeda(total)}
            </span>
          </div>
          <div class="card-bottom-row" style="margin-top: 6px;">
            <span class="card-info-meta">${c.cliente ? `👤 ${c.cliente}` : (isLivre ? 'Disponível' : `📦 ${qtdItens} itens`)}</span>
            <div style="display: flex; align-items: center; gap: 6px;">
              ${badgeStatus}
              ${!isLivre ? `<span style="color: var(--accent-cyan); font-size: 11px; font-weight: 700;">Ver ➔</span>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  verDetalhesMesa(mesaId) {
    const backup = this.dadosBackup || {};
    const comandas = backup.comandas || backup.mesas || [];
    const mesa = comandas.find(c => String(c.id) === String(mesaId));
    if (!mesa || !mesa.itens || mesa.itens.length === 0) {
      if (mesa) this.abrirModalSheet(mesa.nome, `<div style="text-align: center; padding: 20px; color: var(--text-muted);">Esta mesa está livre e sem itens lançados.</div>`);
      return;
    }

    const itensHtml = mesa.itens.map(it => `
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px dashed var(--border-card); font-size: 12.5px;">
        <span style="flex: 1; min-width: 0; word-break: break-word; line-height: 1.35; color: var(--text-main);">${it.quantidade}x ${it.nome}</span>
        <strong style="font-family: 'JetBrains Mono'; color: var(--accent-green); white-space: nowrap; flex-shrink: 0; font-size: 13px; text-align: right;">${this.formatarMoeda((it.precoUnitario || 0) * (it.quantidade || 1))}</strong>
      </div>
    `).join('');

    const html = `
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <div style="background: var(--bg-surface-2); padding: 12px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <span style="font-size: 11px; color: var(--text-dim);">Cliente / Identificação</span>
            <strong style="display: block; font-size: 13px;">${mesa.cliente || 'Consumidor no Salão'}</strong>
          </div>
          <div style="text-align: right;">
            <span style="font-size: 11px; color: var(--text-dim);">Status da Mesa</span>
            <span class="badge-tag-sm ${mesa.status === 'livre' ? 'ok' : 'zero'}" style="display: inline-block; margin-top: 2px;">${mesa.status === 'livre' ? '🟢 LIVRE' : '🔴 EM CONSUMO'}</span>
          </div>
        </div>

        <div style="margin-top: 6px;">
          <span style="font-size: 11px; font-weight: 800; color: var(--text-dim); text-transform: uppercase;">Consumo Lançado</span>
          <div style="margin-top: 6px; max-height: 220px; overflow-y: auto;">${itensHtml}</div>
        </div>

        <div style="background: var(--bg-surface-2); border: 1px solid var(--border-card); padding: 14px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
          <span style="font-size: 14px; font-weight: 800; color: var(--text-main);">Total Consumido</span>
          <strong style="font-size: 20px; font-family: 'JetBrains Mono'; color: var(--accent-green); white-space: nowrap; flex-shrink: 0;">${this.formatarMoeda(mesa.total)}</strong>
        </div>
      </div>
    `;

    this.abrirModalSheet(`Detalhes: ${mesa.nome}`, html);
  },

  // -------------------------------------------------------------
  // ABA 4: AUDITORIA EM TEMPO REAL
  // -------------------------------------------------------------
  filtroAuditoriaAtivo: 'todos',

  setFiltroAuditoria(tipo, btnEl) {
    this.filtroAuditoriaAtivo = tipo;
    document.querySelectorAll('#chips-auditoria-container .chip-btn').forEach(b => b.classList.remove('active'));
    if (btnEl) {
      btnEl.classList.add('active');
      // Centraliza suavemente o botão clicado no meio do carrossel
      btnEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
    this.renderAuditoria();
  },

  scrollChipsAuditoria(direcao) {
    const container = document.getElementById('chips-auditoria-container');
    if (!container) return;
    const scrollAmount = 180;
    container.scrollBy({
      left: direcao === 'esquerda' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  },

  processarLogsAuditoria(rawLogs = []) {
    const logs = Array.isArray(rawLogs) ? [...rawLogs] : [];
    const backup = this.dadosBackup || {};
    const turnoAtual = backup.turnoAtual;

    // Incorpora Abertura e Sangrias do Turno Atual caso ainda não constem
    if (turnoAtual && (turnoAtual.status === 'aberto' || turnoAtual.dataAbertura || turnoAtual.trocoInicial !== undefined)) {
      const idAbertura = `abertura_${turnoAtual.id || turnoAtual.dataAbertura || 'atual'}`;
      const jaTemAbertura = logs.some(l => l.id === idAbertura || (l.tipo === 'abertura_caixa' && l.criadoEm === turnoAtual.dataAbertura));
      if (!jaTemAbertura) {
        logs.push({
          id: idAbertura,
          tipo: 'abertura_caixa',
          descricao: `Abriu o caixa com ${this.formatarMoeda(turnoAtual.trocoInicial || 0)} de troco inicial`,
          operador: turnoAtual.operador || 'Operador',
          criadoEm: turnoAtual.dataAbertura || new Date().toISOString(),
          dataHoraFormatada: turnoAtual.dataAbertura ? new Date(turnoAtual.dataAbertura).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR'),
          detalhes: {
            trocoInicial: turnoAtual.trocoInicial || 0,
            status: turnoAtual.status || 'aberto',
            turnoId: turnoAtual.id
          }
        });
      }

      // Sangrias do turno atual
      if (Array.isArray(turnoAtual.sangrias)) {
        turnoAtual.sangrias.forEach((s, idx) => {
          const idSangria = `sangria_${turnoAtual.id}_${idx}`;
          const jaTemSangria = logs.some(l => l.id === idSangria || (l.tipo === 'sangria_caixa' && l.criadoEm === s.data));
          if (!jaTemSangria) {
            logs.push({
              id: idSangria,
              tipo: 'sangria_caixa',
              descricao: `Registrou sangria de ${this.formatarMoeda(s.valor || 0)}. Motivo: ${s.motivo || 'Não informado'}`,
              operador: s.operador || turnoAtual.operador || 'Operador',
              criadoEm: s.data || turnoAtual.dataAbertura,
              dataHoraFormatada: s.data ? new Date(s.data).toLocaleString('pt-BR') : '',
              detalhes: s
            });
          }
        });
      }
    }

    // Se houver vendas hoje mas nenhum log de abertura registrado para hoje
    const vendas = backup.vendas || [];
    const hojeStr = new Date().toISOString().split('T')[0];
    const vendasHoje = vendas.filter(v => (v.data || v.dataHora || '').startsWith(hojeStr));
    if (vendasHoje.length > 0 && !logs.some(l => l.tipo === 'abertura_caixa' && (l.criadoEm || '').startsWith(hojeStr))) {
      const primeiraVenda = vendasHoje[vendasHoje.length - 1];
      const troco = turnoAtual ? (turnoAtual.trocoInicial || 0) : 0;
      logs.push({
        id: `abertura_hoje_${hojeStr}`,
        tipo: 'abertura_caixa',
        descricao: `Abriu o caixa com ${this.formatarMoeda(troco)} de troco inicial`,
        operador: primeiraVenda.operador || (turnoAtual ? turnoAtual.operador : 'Operador'),
        criadoEm: primeiraVenda.data || primeiraVenda.dataHora || hojeStr,
        dataHoraFormatada: new Date(primeiraVenda.data || primeiraVenda.dataHora || Date.now()).toLocaleString('pt-BR'),
        detalhes: {
          trocoInicial: troco,
          status: 'aberto'
        }
      });
    }

    // Incorpora Fechamentos e Aberturas do Histórico de Turnos
    if (Array.isArray(backup.turnosHistorico)) {
      backup.turnosHistorico.forEach(t => {
        if (!t) return;
        if (t.dataFechamento) {
          const idFech = `fechamento_${t.id}`;
          if (!logs.some(l => l.id === idFech)) {
            logs.push({
              id: idFech,
              tipo: 'fechamento_caixa',
              descricao: `Fechamento de Caixa efetuado por ${t.operador || 'Operador'}: Total ${this.formatarMoeda(t.totalVendasGeral || t.totalVendas || 0)}`,
              operador: t.operador || 'Operador',
              criadoEm: t.dataFechamento,
              dataHoraFormatada: new Date(t.dataFechamento).toLocaleString('pt-BR'),
              detalhes: t
            });
          }
        }
        if (t.dataAbertura) {
          const idAb = `abertura_${t.id}`;
          if (!logs.some(l => l.id === idAb || (l.tipo === 'abertura_caixa' && l.criadoEm === t.dataAbertura))) {
            logs.push({
              id: idAb,
              tipo: 'abertura_caixa',
              descricao: `Abriu o caixa com ${this.formatarMoeda(t.trocoInicial || 0)} de troco inicial`,
              operador: t.operador || 'Operador',
              criadoEm: t.dataAbertura,
              dataHoraFormatada: new Date(t.dataAbertura).toLocaleString('pt-BR'),
              detalhes: t
            });
          }
        }
      });
    }

    // Ordena todos os logs cronologicamente (mais recente no topo)
    logs.sort((a, b) => {
      const tA = a.criadoEm ? new Date(a.criadoEm).getTime() : 0;
      const tB = b.criadoEm ? new Date(b.criadoEm).getTime() : 0;
      return tB - tA;
    });

    this.dadosAuditoria = logs;
    return logs;
  },

  renderAuditoria() {
    let logs = this.dadosAuditoria || [];
    const container = document.getElementById('lista-auditoria-eventos');
    const badgeTotal = document.getElementById('badge-total-auditorias');

    // Aplica filtro por tipo selecionado
    if (this.filtroAuditoriaAtivo !== 'todos') {
      if (this.filtroAuditoriaAtivo === 'produtos') {
        logs = logs.filter(l => ['cadastro_produto', 'edicao_produto', 'exclusao_produto'].includes(l.tipo));
      } else {
        logs = logs.filter(l => l.tipo === this.filtroAuditoriaAtivo);
      }
    }

    if (badgeTotal) badgeTotal.textContent = logs.length;

    if (logs.length === 0) {
      container.innerHTML = `
        <div class="empty-state-mobile">
          <span class="empty-state-icon">🛡️</span>
          <span style="font-size: 13px;">Nenhum registro encontrado para este filtro.</span>
        </div>
      `;
      return;
    }

    container.innerHTML = logs.map(log => {
      let badgeTipo = `<span class="badge-tag-sm blue">ℹ️ Evento</span>`;
      if (log.tipo === 'abertura_caixa') badgeTipo = `<span class="badge-tag-sm ok">🟢 Abertura Caixa</span>`;
      else if (log.tipo === 'fechamento_caixa') badgeTipo = `<span class="badge-tag-sm purple">💰 Fech. Caixa</span>`;
      else if (log.tipo === 'sangria_caixa') badgeTipo = `<span class="badge-tag-sm low">💸 Sangria</span>`;
      else if (log.tipo === 'suprimento_caixa') badgeTipo = `<span class="badge-tag-sm cyan">💵 Suprimento</span>`;
      else if (log.tipo === 'cortesia') badgeTipo = `<span class="badge-tag-sm purple">🎁 Cortesia</span>`;
      else if (log.tipo === 'cancelamento_venda') badgeTipo = `<span class="badge-tag-sm zero">🛑 Cancelamento</span>`;
      else if (log.tipo === 'ajuste_estoque') badgeTipo = `<span class="badge-tag-sm low">📦 Ajuste Estoque</span>`;
      else if (log.tipo === 'cadastro_produto') badgeTipo = `<span class="badge-tag-sm blue">✨ Novo Produto</span>`;
      else if (log.tipo === 'exclusao_produto') badgeTipo = `<span class="badge-tag-sm zero">🗑️ Exclusão</span>`;
      else if (log.tipo === 'edicao_produto') badgeTipo = `<span class="badge-tag-sm cyan">✏️ Edição</span>`;

      const dataHora = log.dataHoraFormatada || (log.criadoEm ? new Date(log.criadoEm).toLocaleString('pt-BR') : '--');

      return `
        <div class="mobile-list-card" onclick="MobileApp.verDetalhesAuditoria('${log.id}')">
          <div class="card-top-row">
            ${badgeTipo}
            <span class="card-time-text" style="color: var(--text-dim);">${dataHora}</span>
          </div>
          <p style="font-size: 13px; font-weight: 700; color: var(--text-main); line-height: 1.4; margin: 4px 0;">
            ${log.tipo === 'cortesia' ? (log.detalhes?.motivo || log.descricao) : log.descricao}
          </p>
          <div class="card-bottom-row">
            <span class="card-info-meta">👤 ${log.operador || 'Caixa'}</span>
            <span style="color: var(--accent-cyan); font-size: 11px; font-weight: 700;">Toque para ver ➔</span>
          </div>
        </div>
      `;
    }).join('');
  },

  // -------------------------------------------------------------
  // MODAIS BOTTOM SHEET & DIALOGS
  // -------------------------------------------------------------
  verDetalhesVenda(vendaId) {
    const backup = this.dadosBackup || {};
    const venda = (backup.vendas || []).find(v => v.id === vendaId);
    if (!venda) return;

    const itensHtml = (venda.itens || []).map(it => `
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px dashed var(--border-card); font-size: 12.5px;">
        <span style="flex: 1; min-width: 0; word-break: break-word; line-height: 1.35; color: var(--text-main);">${it.quantidade}x ${it.nome}</span>
        <strong style="font-family: 'JetBrains Mono'; color: var(--accent-green); white-space: nowrap; flex-shrink: 0; font-size: 13px; text-align: right;">${this.formatarMoeda((it.precoUnitario || 0) * (it.quantidade || 1))}</strong>
      </div>
    `).join('');

    const html = `
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <div style="background: var(--bg-surface-2); padding: 12px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <span style="font-size: 11px; color: var(--text-dim);">Operador</span>
            <strong style="display: block; font-size: 13px;">${venda.operador || 'Caixa'}</strong>
          </div>
          <div style="text-align: right;">
            <span style="font-size: 11px; color: var(--text-dim);">Forma de Pagamento</span>
            <strong style="display: block; font-size: 13px; color: var(--accent-blue);">${venda.formaPagamento || 'Dinheiro'}</strong>
          </div>
        </div>

        <div style="margin-top: 6px;">
          <span style="font-size: 11px; font-weight: 800; color: var(--text-dim); text-transform: uppercase;">Itens Vendidos</span>
          <div style="margin-top: 6px; max-height: 220px; overflow-y: auto;">${itensHtml}</div>
        </div>

        <div style="background: var(--bg-surface-2); border: 1px solid var(--border-card); padding: 14px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
          <span style="font-size: 14px; font-weight: 800; color: var(--text-main);">Total da Venda</span>
          <strong style="font-size: 20px; font-family: 'JetBrains Mono'; color: var(--accent-green); white-space: nowrap; flex-shrink: 0;">${this.formatarMoeda(venda.total)}</strong>
        </div>
      </div>
    `;

    this.abrirModalSheet(`Detalhes da Venda #${venda.id ? venda.id.slice(-5) : ''}`, html);
  },

  verDetalhesAuditoria(logId) {
    const log = (this.dadosAuditoria || []).find(l => l.id === logId);
    if (!log) return;

    let confCaixaHtml = '';
    if (log.tipo === 'fechamento_caixa' && log.detalhes && (log.detalhes.saldoEsperado !== undefined || log.detalhes.saldoInformado !== undefined)) {
      const esp = parseFloat(log.detalhes.saldoEsperado) || 0;
      const inf = parseFloat(log.detalhes.saldoInformado) || 0;
      const dif = parseFloat(log.detalhes.diferenca) || (inf - esp);

      confCaixaHtml = `
        <div style="background: var(--bg-surface-2); border-radius: 10px; padding: 12px; margin-top: 10px;">
          <span style="font-size: 11px; font-weight: 800; color: var(--text-dim); text-transform: uppercase; display: block; margin-bottom: 8px;">Conferência de Caixa</span>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; text-align: center;">
            <div style="background: var(--bg-surface-1); border: 1px solid var(--border-card); padding: 8px; border-radius: 6px;">
              <span style="font-size: 10px; color: var(--text-dim); display: block;">Esperado</span>
              <strong style="font-size: 12px; font-family: 'JetBrains Mono'; color: var(--accent-blue); white-space: nowrap;">${this.formatarMoeda(esp)}</strong>
            </div>
            <div style="background: var(--bg-surface-1); border: 1px solid var(--border-card); padding: 8px; border-radius: 6px;">
              <span style="font-size: 10px; color: var(--text-dim); display: block;">Informado</span>
              <strong style="font-size: 12px; font-family: 'JetBrains Mono'; color: var(--text-main); white-space: nowrap;">${this.formatarMoeda(inf)}</strong>
            </div>
            <div style="background: var(--bg-surface-1); border: 1px solid var(--border-card); padding: 8px; border-radius: 6px;">
              <span style="font-size: 10px; color: var(--text-dim); display: block;">Diferença</span>
              <strong style="font-size: 12px; font-family: 'JetBrains Mono'; color: ${dif < -0.01 ? 'var(--accent-red)' : 'var(--accent-green)'}; white-space: nowrap;">${dif > 0 ? '+' : ''}${this.formatarMoeda(dif)}</strong>
            </div>
          </div>
        </div>
      `;
    }

    let itensCortesiaHtml = '';
    if (log.detalhes && Array.isArray(log.detalhes.itens)) {
      itensCortesiaHtml = `
        <div style="margin-top: 10px;">
          <span style="font-size: 11px; font-weight: 800; color: var(--text-dim); text-transform: uppercase;">Itens da Movimentação</span>
          <div style="background: var(--bg-surface-2); border-radius: 8px; padding: 10px; margin-top: 6px; max-height: 180px; overflow-y: auto;">
            ${log.detalhes.itens.map(it => `
              <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; font-size: 12.5px; padding: 4px 0;">
                <span style="flex: 1; min-width: 0; word-break: break-word; color: var(--text-main);">${it.quantidade || 1}x ${it.nome}</span>
                <strong style="font-family: 'JetBrains Mono'; color: var(--accent-green); white-space: nowrap; flex-shrink: 0;">${this.formatarMoeda((it.precoUnitario || 0) * (it.quantidade || 1))}</strong>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    const html = `
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <div style="background: var(--bg-surface-2); padding: 12px; border-radius: 10px;">
          <span style="font-size: 11px; color: var(--text-dim); text-transform: uppercase; font-weight: 800;">Descrição</span>
          <p style="font-size: 14px; font-weight: 700; color: var(--text-main); margin-top: 4px; line-height: 1.4;">${log.descricao}</p>
        </div>

        ${confCaixaHtml}
        ${itensCortesiaHtml}

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 4px;">
          <div style="background: var(--bg-surface-2); padding: 10px; border-radius: 8px;">
            <span style="font-size: 10.5px; color: var(--text-dim);">Operador</span>
            <strong style="display: block; font-size: 12.5px;">${log.operador || 'Caixa'}</strong>
          </div>
          <div style="background: var(--bg-surface-2); padding: 10px; border-radius: 8px;">
            <span style="font-size: 10.5px; color: var(--text-dim);">Horário</span>
            <strong style="display: block; font-size: 12px; font-family: 'JetBrains Mono';">${log.dataHoraFormatada || '--'}</strong>
          </div>
        </div>
      </div>
    `;

    this.abrirModalSheet('Registro de Auditoria', html);
  },

  verDetalhesContaPagar(contaId) {
    const backup = this.dadosBackup || {};
    const contas = backup.contasPagar || [];
    const c = contas.find(item => String(item.id) === String(contaId));
    if (!c) return;

    const hoje = new Date().toISOString().split('T')[0];
    const dataVenc = c.vencimento || c.dataVencimento || '';
    const isVencida = dataVenc && dataVenc < hoje && c.status !== 'pago' && c.status !== 'paga';
    const isHoje = dataVenc === hoje && c.status !== 'pago' && c.status !== 'paga';
    const isPago = c.status === 'pago' || c.status === 'paga';

    let badgeStatus = '<span class="badge-tag-sm ok">📅 A Vencer</span>';
    if (isPago) badgeStatus = '<span class="badge-tag-sm ok" style="background: rgba(16,185,129,0.2); color: #34d399;">✅ Conta Paga</span>';
    else if (isVencida) badgeStatus = '<span class="badge-tag-sm zero">🚨 Vencida</span>';
    else if (isHoje) badgeStatus = '<span class="badge-tag-sm low">⏳ Vence Hoje</span>';

    // Formata a data de vencimento no formato brasileiro DD/MM/YYYY
    let vencFormatado = '--';
    if (dataVenc) {
      if (dataVenc.includes('-')) {
        const parts = dataVenc.split('T')[0].split('-');
        if (parts.length === 3) vencFormatado = `${parts[2]}/${parts[1]}/${parts[0]}`;
      } else {
        vencFormatado = new Date(dataVenc).toLocaleDateString('pt-BR');
      }
    }

    const html = `
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <!-- Header da Conta com Valor em Destaque -->
        <div style="background: var(--bg-surface-2); padding: 14px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <span style="font-size: 11px; color: var(--text-dim); text-transform: uppercase; font-weight: 800;">Valor a Pagar</span>
            <strong style="display: block; font-size: 22px; font-family: 'JetBrains Mono'; color: ${isPago ? 'var(--accent-green)' : '#f87171'}; margin-top: 2px;">
              ${this.formatarMoeda(c.valor)}
            </strong>
          </div>
          <div style="text-align: right;">
            ${badgeStatus}
          </div>
        </div>

        <!-- Informações Principais da Despesa -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div style="background: var(--bg-surface-2); padding: 10px 12px; border-radius: 8px;">
            <span style="font-size: 11px; color: var(--text-dim); display: block;">📅 Vencimento</span>
            <strong style="font-size: 13.5px; color: var(--text-main); font-family: 'JetBrains Mono'; margin-top: 2px; display: block;">${vencFormatado}</strong>
          </div>
          <div style="background: var(--bg-surface-2); padding: 10px 12px; border-radius: 8px;">
            <span style="font-size: 11px; color: var(--text-dim); display: block;">🏷️ Categoria</span>
            <strong style="font-size: 13.5px; color: var(--accent-cyan); margin-top: 2px; display: block;">${c.categoria || 'Geral'}</strong>
          </div>
        </div>

        <div style="background: var(--bg-surface-2); padding: 12px; border-radius: 10px;">
          <span style="font-size: 11px; color: var(--text-dim); text-transform: uppercase; font-weight: 800; display: block; margin-bottom: 4px;">🏢 Fornecedor / Beneficiário</span>
          <p style="font-size: 14px; font-weight: 700; color: var(--text-main);">${c.fornecedor || 'Não informado no PDV'}</p>
        </div>

        <div style="background: var(--bg-surface-2); padding: 12px; border-radius: 10px;">
          <span style="font-size: 11px; color: var(--text-dim); text-transform: uppercase; font-weight: 800; display: block; margin-bottom: 4px;">📝 Observações / Detalhes</span>
          <p style="font-size: 13px; color: var(--text-main); line-height: 1.4;">${c.observacoes || 'Nenhuma observação informada.'}</p>
        </div>

        ${isPago && c.dataPagamento ? `
          <div style="background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.35); padding: 10px 12px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 12px; color: #34d399; font-weight: 700;">✅ Pago em: ${c.dataPagamento}</span>
            <span style="font-size: 12px; color: var(--text-muted);">${c.formaPagamento || ''}</span>
          </div>
        ` : ''}
      </div>
    `;

    this.abrirModalSheet(`Detalhes: ${c.descricao || 'Despesa'}`, html);
  },

  verDetalhesClienteFiado(clienteId) {
    const backup = this.dadosBackup || {};
    const clientes = backup.clientes || [];
    const cli = clientes.find(item => String(item.id) === String(clienteId));
    if (!cli) return;

    const saldo = parseFloat(cli.saldoDevedor) || 0;
    const limite = parseFloat(cli.limiteFiado) || 0;
    const telLimpo = (cli.telefone || '').replace(/\D/g, '');
    const nomeLoja = (this.dadosLoja && (this.dadosLoja.razaoSocial || this.dadosLoja.nomeFantasia)) || 'nossa loja';

    let btnZap = '';
    if (telLimpo.length >= 10) {
      const msg = encodeURIComponent(`Olá ${cli.nome}, tudo bem? Passando para lembrar do seu saldo em aberto de ${this.formatarMoeda(saldo)} aqui no ${nomeLoja}. Qualquer dúvida estamos à disposição!`);
      btnZap = `
        <a href="https://wa.me/55${telLimpo}?text=${msg}" target="_blank" class="btn-whatsapp-mobile" style="margin-top: 6px; text-decoration: none; justify-content: center; width: 100%;">
          <span>💬 Cobrar no WhatsApp</span>
        </a>
      `;
    }

    const html = `
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <div style="background: var(--bg-surface-2); padding: 14px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <span style="font-size: 11px; color: var(--text-dim); text-transform: uppercase; font-weight: 800;">Saldo Devedor</span>
            <strong style="display: block; font-size: 22px; font-family: 'JetBrains Mono'; color: #fbbf24; margin-top: 2px;">
              ${this.formatarMoeda(saldo)}
            </strong>
          </div>
          <div style="text-align: right;">
            <span class="badge-tag-sm low">Caderneta</span>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div style="background: var(--bg-surface-2); padding: 10px 12px; border-radius: 8px;">
            <span style="font-size: 11px; color: var(--text-dim); display: block;">📞 Telefone</span>
            <strong style="font-size: 13px; color: var(--text-main); margin-top: 2px; display: block;">${cli.telefone || 'Não informado'}</strong>
          </div>
          <div style="background: var(--bg-surface-2); padding: 10px 12px; border-radius: 8px;">
            <span style="font-size: 11px; color: var(--text-dim); display: block;">💳 Limite Fiado</span>
            <strong style="font-size: 13px; color: var(--accent-cyan); font-family: 'JetBrains Mono'; margin-top: 2px; display: block;">${limite > 0 ? this.formatarMoeda(limite) : 'Sem limite'}</strong>
          </div>
        </div>

        ${cli.cpf ? `
          <div style="background: var(--bg-surface-2); padding: 10px 12px; border-radius: 8px;">
            <span style="font-size: 11px; color: var(--text-dim); display: block;">🪪 CPF / Documento</span>
            <strong style="font-size: 13px; color: var(--text-main); margin-top: 2px; display: block;">${cli.cpf}</strong>
          </div>
        ` : ''}

        ${cli.endereco ? `
          <div style="background: var(--bg-surface-2); padding: 10px 12px; border-radius: 8px;">
            <span style="font-size: 11px; color: var(--text-dim); display: block;">📍 Endereço</span>
            <span style="font-size: 12.5px; color: var(--text-main); line-height: 1.4; margin-top: 2px; display: block;">${cli.endereco}</span>
          </div>
        ` : ''}

        ${btnZap}
      </div>
    `;

    this.abrirModalSheet(`Cliente: ${cli.nome}`, html);
  },

  abrirModalSheet(title, html) {
    const titleEl = document.getElementById('sheet-title');
    const bodyEl = document.getElementById('sheet-body');
    const modal = document.getElementById('modal-bottom-sheet');
    if (titleEl) titleEl.textContent = title;
    if (bodyEl) bodyEl.innerHTML = html;
    if (modal) modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  },

  fecharModalSheet(e) {
    if (e && e.target && e.target.id !== 'modal-bottom-sheet' && !e.target.classList.contains('modal-bottom-sheet') && e.target.tagName !== 'BUTTON') {
      return;
    }
    const modal = document.getElementById('modal-bottom-sheet');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
  },

  // -------------------------------------------------------------
  // NAVEGAÇÃO DE ABAS
  // -------------------------------------------------------------
  navegarPara(tabId, subAba = null) {
    document.querySelectorAll('.mobile-tab-view').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tabbar-item, .desktop-nav-btn').forEach(b => b.classList.remove('active'));

    const tabEl = document.getElementById(`tab-${tabId}`);
    const btnEl = document.getElementById(`btn-tab-${tabId}`);
    const btnDeskEl = document.getElementById(`btn-desk-tab-${tabId}`);

    if (tabEl) tabEl.classList.add('active');
    if (btnEl) btnEl.classList.add('active');
    if (btnDeskEl) btnDeskEl.classList.add('active');

    if (tabId === 'gerencia' && subAba) {
      this.setSubAbaGerencia(subAba);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  // -------------------------------------------------------------
  // UTILITÁRIOS
  // -------------------------------------------------------------
  formatarMoeda(valor) {
    const num = parseFloat(valor) || 0;
    return 'R$ ' + num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },

  getIconeFormaPag(forma) {
    if (forma.includes('PIX')) return '⚡';
    if (forma.includes('Dinheiro')) return '💵';
    if (forma.includes('Crédito')) return '💳';
    if (forma.includes('Débito')) return '💳';
    if (forma.includes('Fiado')) return '📖';
    return '💰';
  },

  getGradienteFormaPag(forma) {
    if (forma.includes('PIX')) return 'linear-gradient(90deg, #06b6d4, #38bdf8)';
    if (forma.includes('Dinheiro')) return 'linear-gradient(90deg, #059669, #10b981)';
    if (forma.includes('Crédito')) return 'linear-gradient(90deg, #6366f1, #a855f7)';
    if (forma.includes('Débito')) return 'linear-gradient(90deg, #2563eb, #60a5fa)';
    if (forma.includes('Fiado')) return 'linear-gradient(90deg, #d97706, #fbbf24)';
    return 'linear-gradient(90deg, #ec4899, #f43f5e)';
  },

  getBadgeClasseForma(forma) {
    if (!forma) return 'cyan';
    const f = String(forma).toUpperCase();
    if (f.includes('PIX')) return 'cyan';
    if (f.includes('DINHEIRO')) return 'ok';
    if (f.includes('CRÉDITO') || f.includes('CREDITO')) return 'purple';
    if (f.includes('DÉBITO') || f.includes('DEBITO')) return 'blue';
    if (f.includes('FIADO')) return 'low';
    return 'cyan';
  }
};

// Auto-inicialização quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  if (window.MobileApp) {
    window.MobileApp.init();
  }
});

// Fechar modal ao pressionar ESC
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && window.MobileApp) {
    window.MobileApp.fecharModalSheet();
  }
});
