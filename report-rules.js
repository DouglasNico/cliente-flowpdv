(function(root) {
  function dateKey(value) {
    if (!value) return '';
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const date = new Date(value.seconds != null ? value.seconds * 1000 : value);
    if (!Number.isFinite(date.getTime())) return '';
    const parts = new Intl.DateTimeFormat('en-CA', {timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
    const field = type => parts.find(p => p.type === type).value;
    return `${field('year')}-${field('month')}-${field('day')}`;
  }
  function pagamentos(vendas) {
    const totals = {'PIX':0,'Dinheiro':0,'Cartão Crédito':0,'Cartão Débito':0,'Fiado':0,'Outros':0};
    const group = name => {
      const text = String(name || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
      if(text.includes('pix'))return 'PIX';
      if(text.includes('dinheiro'))return 'Dinheiro';
      if(text.includes('credito'))return 'Cartão Crédito';
      if(text.includes('debito'))return 'Cartão Débito';
      if(text.includes('fiado'))return 'Fiado';
      return 'Outros';
    };
    for (const venda of vendas) {
      const parts = venda.pagamentoDividido
        ? (Array.isArray(venda.pagamentos) ? venda.pagamentos : [venda.parcela1,venda.parcela2].filter(Boolean)) : [];
      if (!parts.length) { totals[group(venda.formaPagamento)] += Number(venda.total) || 0; continue; }
      for (const part of parts) if (group(part.forma) !== 'Dinheiro') totals[group(part.forma)] += Number(part.valor) || 0;
      totals.Dinheiro += root.FlowCaixaRules.dinheiroLiquidoVenda(venda);
    }
    return totals;
  }
  root.FlowReportRules = {dateKey,pagamentos};
})(typeof window === 'undefined' ? globalThis : window);
