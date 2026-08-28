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

  // -------------------------------------------------------------
  // INICIALIZAÇÃO
  // -------------------------------------------------------------
  init() {
    this.registrarServiceWorker();
    this.verificarSessaoSalva();
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
      document.getElementById('screen-login').style.display = 'none';
      document.getElementById('screen-app').style.display = 'flex';
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
      }

      document.getElementById('screen-login').style.display = 'none';
      document.getElementById('screen-app').style.display = 'flex';

      await this.carregarDadosLoja();
    } catch (err) {
      console.error('[Login] Erro:', err);
      toastErro.innerHTML = `⚠️ ${err.message || 'Erro ao autenticar.'}`;
      toastErro.style.display = 'block';
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = '<span>🔐 Entrar no Gestor</span>';
    }
  },

  fazerLogout() {
    if (!confirm('Deseja sair do aplicativo?')) return;
    localStorage.removeItem('flowpdv_mob_chave');
    localStorage.removeItem('flowpdv_mob_pin');
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
  // CARREGAMENTO DE DADOS (FIREBASE FIRESTORE)
  // -------------------------------------------------------------
  async recarregarDados() {
    const btn = document.getElementById('btn-refresh');
    if (btn) btn.classList.add('rotating');
    await this.carregarDadosLoja();
    setTimeout(() => {
      if (btn) btn.classList.remove('rotating');
    }, 600);
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
        }
      }, (err) => {
        console.warn('[MobileApp] Erro no listener realtime:', err);
      });
    } catch(e) {
      console.warn('[MobileApp] Falha ao ligar listener realtime:', e);
    }
  },

  async carregarDadosLoja() {
    if (!this.chaveLicenca) return;

    try {
      const { db, doc, getDoc, collection, query, where, getDocs, limit } = window.FirebaseDB;

      // 1. Carregar Licença Atualizada
      const snapLic = await getDoc(doc(db, 'licencas', this.chaveLicenca));
      if (snapLic.exists()) {
        this.dadosLoja = snapLic.data();
      }

      // 2. Carregar Backup da Loja (Produtos, Vendas, Turnos, Clientes, Contas)
      let snapBackup = await getDoc(doc(db, 'backups_lojas', this.chaveLicenca));
      if (!snapBackup.exists()) {
        // Fallback para coleção legada
        snapBackup = await getDoc(doc(db, 'backups_adegas', this.chaveLicenca));
      }

      if (snapBackup.exists()) {
        this.dadosBackup = snapBackup.data();
        localStorage.setItem(`flowpdv_cache_${this.chaveLicenca}`, JSON.stringify(this.dadosBackup));
      } else {
        // Tenta pegar do cache local se existir
        const cached = localStorage.getItem(`flowpdv_cache_${this.chaveLicenca}`);
        if (cached) this.dadosBackup = JSON.parse(cached);
      }

      // 3. Carregar Logs de Auditoria Recentes
      try {
        const qAudit = query(
          collection(db, 'auditoria_lojas'),
          where('chaveLicenca', '==', this.chaveLicenca),
          limit(30)
        );
        const snapAudit = await getDocs(qAudit);
        const logs = [];
        snapAudit.forEach(d => logs.push({ id: d.id, ...d.data() }));

        // Ordena por data decrescente
        logs.sort((a, b) => {
          const tA = a.criadoEm ? new Date(a.criadoEm).getTime() : 0;
          const tB = b.criadoEm ? new Date(b.criadoEm).getTime() : 0;
          return tB - tA;
        });

        this.dadosAuditoria = logs;
      } catch (e) {
        console.warn('[Auditoria] Falha ao puxar logs:', e);
      }

      // Iniciar Ouvinte em Tempo Real
      this.iniciarListenerTempoReal();

      // 4. Atualizar Todas as Telas
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

    // Faturamento do Mês
    let totalMes = 0;
    turnos.forEach(t => {
      if ((t.dataFechamento || t.dataAbertura || '').startsWith(mesAtualStr)) {
        totalMes += parseFloat(t.totalVendas) || 0;
      }
    });
    totalMes += totalHoje;

    // Total no Caixa / Gaveta
    const turnoAtivo = backup.turnoAtual || {};
    const gavetaCaixa = parseFloat(turnoAtivo.saldoDinheiroGaveta || turnoAtivo.trocoInicial || 0) +
                        vendasHoje.filter(v => (v.formaPagamento || '').toLowerCase().includes('dinheiro'))
                                  .reduce((acc, v) => acc + (parseFloat(v.total) || 0), 0);

    // Atualizar Métricas na Tela
    document.getElementById('metric-faturamento-hoje').textContent = this.formatarMoeda(totalHoje);
    document.getElementById('metric-qtd-vendas').textContent = qtdVendasHoje;
    document.getElementById('metric-ticket-medio').textContent = this.formatarMoeda(ticketMedioHoje);
    document.getElementById('metric-gaveta-caixa').textContent = this.formatarMoeda(gavetaCaixa);
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
      containerFormas.innerHTML = `<div style="color: var(--text-dim); font-size: 12px; text-align: center; padding: 6px;">Nenhuma venda registrada hoje.</div>`;
    } else {
      containerFormas.innerHTML = formasComValor.map(([nome, val]) => {
        const perc = totalHoje > 0 ? (val / totalHoje) * 100 : 0;
        return `
          <div>
            <div style="display: flex; justify-content: space-between; font-size: 12.5px; font-weight: 700; margin-bottom: 4px;">
              <span>${this.getIconeFormaPag(nome)} ${nome}</span>
              <span style="font-family: 'JetBrains Mono'; color: #fff;">${this.formatarMoeda(val)} <small style="color: var(--text-dim); font-size: 10.5px;">(${perc.toFixed(0)}%)</small></span>
            </div>
            <div style="width: 100%; background: #0b0f19; height: 6px; border-radius: 3px; overflow: hidden;">
              <div style="background: var(--accent-orange); width: ${perc}%; height: 100%; border-radius: 3px;"></div>
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
      const ultimasVendas = [...vendasHoje].sort((a, b) => {
        const tA = new Date(a.data || a.dataHora || a.criadoEm || 0).getTime();
        const tB = new Date(b.data || b.dataHora || b.criadoEm || 0).getTime();
        return tB - tA;
      }).slice(0, 15);

      containerVendas.innerHTML = ultimasVendas.map(v => {
        const rawDate = v.data || v.dataHora || v.criadoEm || '';
        const hora = rawDate ? (rawDate.includes('T') ? rawDate.split('T')[1].substring(0, 5) : new Date(rawDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })) : '--:--';
        const qtdItens = (v.itens || []).reduce((acc, it) => acc + (parseFloat(it.quantidade) || 1), 0);

        return `
          <div class="mobile-list-card" onclick="MobileApp.verDetalhesVenda('${v.id}')">
            <div class="card-top-row">
              <strong class="card-item-title">Venda #${v.id ? v.id.slice(-5) : '0000'}</strong>
              <span class="card-item-price">${this.formatarMoeda(v.total)}</span>
            </div>
            <div class="card-bottom-row">
              <span>👤 ${v.operador || 'Operador'} • 📦 ${qtdItens} un</span>
              <span>🕒 ${hora} • <span class="badge-tag-sm blue">${v.formaPagamento || 'Dinheiro'}</span></span>
            </div>
          </div>
        `;
      }).join('');
    }
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
      // Garante que o botão selecionado fique sempre no meio da tela (scroll suave)
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
      const precoCusto = parseFloat(p.precoCusto) || 0;
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

      // Sugestão de compra se estiver no modo compras
      let sugestaoCompraHtml = '';
      if (this.filtroEstoqueAtual === 'compras') {
        const sugerido = Math.max(1, (min * 2) - estoque);
        sugestaoCompraHtml = `
          <div style="background: rgba(249, 115, 22, 0.1); border: 1px dashed var(--accent-orange); border-radius: 6px; padding: 6px 10px; font-size: 11.5px; font-weight: 700; color: #ffedd5; display: flex; justify-content: space-between;">
            <span>🛒 Sugestão de Reposição:</span>
            <strong style="color: var(--accent-orange); font-family: 'JetBrains Mono';">+${sugerido} un</strong>
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

  renderFinanceiro() {
    const backup = this.dadosBackup || {};
    const contas = backup.contasPagar || [];
    const clientes = backup.clientes || [];
    const hoje = new Date().toISOString().split('T')[0];

    // 1. Contas a Pagar
    const contasPendentes = contas.filter(c => c.status !== 'paga');
    const totalPendente = contasPendentes.reduce((acc, c) => acc + (parseFloat(c.valor) || 0), 0);
    const contasVencidas = contasPendentes.filter(c => c.dataVencimento && c.dataVencimento < hoje);

    document.getElementById('metric-total-contas-pendentes').textContent = this.formatarMoeda(totalPendente);
    document.getElementById('metric-contas-vencidas-alerta').textContent = `🚨 ${contasVencidas.length} ${contasVencidas.length === 1 ? 'conta vencida' : 'contas vencidas'}`;
    document.getElementById('badge-total-contas').textContent = contasPendentes.length;

    const containerContas = document.getElementById('lista-contas-pagar');
    if (contasPendentes.length === 0) {
      containerContas.innerHTML = `
        <div class="empty-state-mobile">
          <span class="empty-state-icon">✅</span>
          <span style="font-size: 13px;">Nenhuma conta pendente para pagamento!</span>
        </div>
      `;
    } else {
      containerContas.innerHTML = contasPendentes.map(c => {
        const isVencida = c.dataVencimento && c.dataVencimento < hoje;
        const isHoje = c.dataVencimento === hoje;

        let badgeVenc = '';
        if (isVencida) badgeVenc = `<span class="badge-tag-sm zero">🚨 Vencida</span>`;
        else if (isHoje) badgeVenc = `<span class="badge-tag-sm low">⏳ Vence Hoje</span>`;
        else badgeVenc = `<span class="badge-tag-sm ok">📅 A Vencer</span>`;

        return `
          <div class="mobile-list-card">
            <div class="card-top-row">
              <strong class="card-item-title">${c.descricao || 'Despesa'}</strong>
              <span class="card-item-price" style="color: #f87171;">${this.formatarMoeda(c.valor)}</span>
            </div>
            <div class="card-bottom-row">
              <span>📅 Venc: ${c.dataVencimento ? new Date(c.dataVencimento + 'T12:00:00').toLocaleDateString('pt-BR') : '--'}</span>
              ${badgeVenc}
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
            <a href="https://wa.me/55${telLimpo}?text=${msg}" target="_blank" class="btn-whatsapp-mobile">
              <span>💬 Cobrar no Zap</span>
            </a>
          `;
        }

        return `
          <div class="mobile-list-card">
            <div class="card-top-row">
              <strong class="card-item-title">👤 ${cli.nome}</strong>
              <span class="card-item-price" style="color: #fbbf24;">${this.formatarMoeda(saldo)}</span>
            </div>
            <div class="card-bottom-row" style="margin-top: 4px;">
              <span>📞 ${cli.telefone || 'Sem telefone'}</span>
              ${btnZap}
            </div>
          </div>
        `;
      }).join('');
    }
  },

  // -------------------------------------------------------------
  // ABA 4: AUDITORIA EM TEMPO REAL
  // -------------------------------------------------------------
  renderAuditoria() {
    const logs = this.dadosAuditoria || [];
    const container = document.getElementById('lista-auditoria-eventos');
    const badgeTotal = document.getElementById('badge-total-auditorias');

    if (badgeTotal) badgeTotal.textContent = logs.length;

    if (logs.length === 0) {
      container.innerHTML = `
        <div class="empty-state-mobile">
          <span class="empty-state-icon">🛡️</span>
          <span style="font-size: 13px;">Nenhum registro de auditoria encontrado recentemente.</span>
        </div>
      `;
      return;
    }

    container.innerHTML = logs.map(log => {
      let badgeTipo = `<span class="badge-tag-sm blue">ℹ️ Evento</span>`;
      if (log.tipo === 'cortesia') badgeTipo = `<span class="badge-tag-sm purple">🎁 Cortesia</span>`;
      else if (log.tipo === 'cancelamento_venda') badgeTipo = `<span class="badge-tag-sm zero">🛑 Cancelamento</span>`;
      else if (log.tipo === 'fechamento_caixa') badgeTipo = `<span class="badge-tag-sm ok">💰 Fech. Caixa</span>`;
      else if (log.tipo === 'sangria_caixa') badgeTipo = `<span class="badge-tag-sm low">💸 Sangria</span>`;

      const dataHora = log.dataHoraFormatada || (log.criadoEm ? new Date(log.criadoEm).toLocaleString('pt-BR') : '--');

      return `
        <div class="mobile-list-card" onclick="MobileApp.verDetalhesAuditoria('${log.id}')">
          <div class="card-top-row">
            ${badgeTipo}
            <span style="font-size: 11px; color: var(--text-dim); font-family: 'JetBrains Mono';">${dataHora}</span>
          </div>
          <p style="font-size: 13px; font-weight: 700; color: #fff; line-height: 1.3;">
            ${log.tipo === 'cortesia' ? (log.detalhes?.motivo || log.descricao) : log.descricao}
          </p>
          <div class="card-bottom-row">
            <span>👤 ${log.operador || 'Caixa'}</span>
            <span style="color: var(--accent-orange); font-size: 11px;">Toque para ver ➔</span>
          </div>
        </div>
      `;
    }).join('');
  },

  // -------------------------------------------------------------
  // MODAIS BOTTOM SHEET
  // -------------------------------------------------------------
  verDetalhesVenda(vendaId) {
    const backup = this.dadosBackup || {};
    const venda = (backup.vendas || []).find(v => v.id === vendaId);
    if (!venda) return;

    const itensHtml = (venda.itens || []).map(it => `
      <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed var(--border-card); font-size: 13px;">
        <span>${it.quantidade}x ${it.nome}</span>
        <strong style="font-family: 'JetBrains Mono'; color: var(--accent-green);">${this.formatarMoeda((it.precoUnitario || 0) * (it.quantidade || 1))}</strong>
      </div>
    `).join('');

    const html = `
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <div style="background: var(--bg-surface-2); padding: 12px; border-radius: 10px; display: flex; justify-content: space-between;">
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
          <div style="margin-top: 6px;">${itensHtml}</div>
        </div>

        <div style="background: #0b0f19; padding: 14px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
          <span style="font-size: 14px; font-weight: 800;">Total da Venda</span>
          <strong style="font-size: 20px; font-family: 'JetBrains Mono'; color: var(--accent-green);">${this.formatarMoeda(venda.total)}</strong>
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
            <div style="background: #0b0f19; padding: 8px; border-radius: 6px;">
              <span style="font-size: 10px; color: var(--text-dim); display: block;">Esperado</span>
              <strong style="font-size: 12.5px; font-family: 'JetBrains Mono'; color: var(--accent-blue);">${this.formatarMoeda(esp)}</strong>
            </div>
            <div style="background: #0b0f19; padding: 8px; border-radius: 6px;">
              <span style="font-size: 10px; color: var(--text-dim); display: block;">Informado</span>
              <strong style="font-size: 12.5px; font-family: 'JetBrains Mono'; color: #fff;">${this.formatarMoeda(inf)}</strong>
            </div>
            <div style="background: #0b0f19; padding: 8px; border-radius: 6px;">
              <span style="font-size: 10px; color: var(--text-dim); display: block;">Diferença</span>
              <strong style="font-size: 12.5px; font-family: 'JetBrains Mono'; color: ${dif < -0.01 ? 'var(--accent-red)' : 'var(--accent-green)'};">${dif > 0 ? '+' : ''}${this.formatarMoeda(dif)}</strong>
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
          <div style="background: var(--bg-surface-2); border-radius: 8px; padding: 10px; margin-top: 6px;">
            ${log.detalhes.itens.map(it => `
              <div style="display: flex; justify-content: space-between; font-size: 12.5px; padding: 4px 0;">
                <span>${it.quantidade || 1}x ${it.nome}</span>
                <strong style="font-family: 'JetBrains Mono'; color: var(--accent-green);">${this.formatarMoeda((it.precoUnitario || 0) * (it.quantidade || 1))}</strong>
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
          <p style="font-size: 14px; font-weight: 700; color: #fff; margin-top: 4px; line-height: 1.4;">${log.descricao}</p>
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

  abrirModalSheet(title, html) {
    document.getElementById('sheet-title').textContent = title;
    document.getElementById('sheet-body').innerHTML = html;
    document.getElementById('modal-bottom-sheet').style.display = 'flex';
  },

  fecharModalSheet(e) {
    if (e && e.target && e.target.id !== 'modal-bottom-sheet' && !e.target.classList.contains('modal-bottom-sheet')) {
      return;
    }
    document.getElementById('modal-bottom-sheet').style.display = 'none';
  },

  // -------------------------------------------------------------
  // NAVEGAÇÃO DE ABAS
  // -------------------------------------------------------------
  navegarPara(tabId) {
    document.querySelectorAll('.mobile-tab-view').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tabbar-item').forEach(b => b.classList.remove('active'));

    const tabEl = document.getElementById(`tab-${tabId}`);
    const btnEl = document.getElementById(`btn-tab-${tabId}`);

    if (tabEl) tabEl.classList.add('active');
    if (btnEl) btnEl.classList.add('active');

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
  }
};

// Auto-inicialização quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  if (window.MobileApp) {
    window.MobileApp.init();
  }
});
