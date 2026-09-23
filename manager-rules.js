(function (root) {
  const permissionFields = {
    cancelarItem: 'perm-cancelar-item', cancelarVenda: 'perm-cancelar-venda',
    darDesconto: 'perm-dar-desconto', realizarSangria: 'perm-realizar-sangria',
    verCustoEstoque: 'perm-ver-custo', reimprimirCupons: 'perm-reimprimir-cupons'
  };
  function isManager(role) {
    return ['gerente', 'gestor', 'admin', 'administrador', 'superadmin', 'dono'].includes(String(role || '').trim().toLowerCase());
  }
  function permissions(role, current = {}) {
    const result = {...current};
    for (const key of Object.keys(permissionFields)) {
      result[key] = isManager(role) || (key === 'cancelarVenda' || key === 'verCustoEstoque' ? current[key] === true : current[key] !== false);
    }
    return result;
  }
  function curvaABC(vendas, produtos, filters = {}) {
    const byId = new Map(), byCode = new Map(), items = new Map();
    for (const p of produtos) {
      if (p.id != null) byId.set(String(p.id), p);
      if (p.codigoBarras) byCode.set(String(p.codigoBarras), p);
    }
    for (const venda of vendas) {
      const status = String(venda.status || '').toLowerCase();
      if (venda.cancelada || venda.cancelado || status === 'cancelada' || status === 'cancelado') continue;
      const day = root.FlowReportRules.dateKey(venda.data || venda.dataHora || venda.criadoEm || venda.timestamp);
      if ((filters.inicio && (!day || day < filters.inicio)) || (filters.fim && (!day || day > filters.fim))) continue;
      for (const item of venda.itens || []) {
        if (!item) continue;
        const id = item.produtoId ?? item.id;
        const p = byId.get(String(id)) || byCode.get(String(item.codigoBarras ?? id));
        const categoria = String(p?.categoria || item.categoria || 'Geral');
        if (filters.categoria && categoria !== filters.categoria) continue;
        const qtd = Number(item.quantidade ?? 1);
        const total = Number(item.total ?? (Number(item.precoUnitario || 0) * qtd));
        if (!Number.isFinite(qtd) || !Number.isFinite(total) || qtd <= 0 || total <= 0) continue;
        const nome = item.nome || p?.nome || 'Produto';
        const key = String(p?.id ?? id ?? item.codigoBarras ?? nome);
        const row = items.get(key) || {key, nome, categoria, qtd: 0, total: 0};
        row.qtd += qtd; row.total += total; items.set(key, row);
      }
    }
    const rows = [...items.values()].sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome));
    const total = rows.reduce((sum, p) => sum + p.total, 0);
    let accumulated = 0;
    const classified = rows.map((row, index) => {
      // The item crossing a boundary remains in the class it completes.
      const classe = accumulated < 80 ? 'A' : accumulated < 95 ? 'B' : 'C';
      const percentual = total ? row.total / total * 100 : 0;
      accumulated += percentual;
      return {...row, classe, percentual, posicao: index + 1};
    });
    const busca = String(filters.busca || '').trim().toLocaleLowerCase('pt-BR');
    return {total, totalItens: rows.length, rows: classified.filter(row =>
      (!filters.classe || row.classe === filters.classe) && (!busca || row.nome.toLocaleLowerCase('pt-BR').includes(busca)))};
  }
  function storeProfile(license = {}, config = {}) {
    const first = (...values) => values.map(v => String(v ?? '').trim()).find(Boolean) || '';
    return {nome:first(config.nomeEmpresa,config.nomeLoja,license.razaoSocial,license.nomeFantasia)||'Minha Loja',cnpj:first(config.cnpj,license.cnpj),pix:first(config.chavePix),telefone:first(config.telefone)};
  }
  root.FlowManagerRules = {permissionFields, isManager, permissions, curvaABC, storeProfile};
})(typeof window === 'undefined' ? globalThis : window);
