// Regras compatíveis com merge-core.js do PDV.
(function(root){
function vendaPertenceAoTurno(venda, turno) {
  if (!venda || !turno) return false;
  if ((turno.vendasIds || []).some(id => String(id) === String(venda.id))) return true;
  if (venda.turnoId) return String(venda.turnoId) === String(turno.id);

  const t = Date.parse(venda.data);
  if (!Number.isFinite(t)) return false;
  const inicio = Date.parse(turno.dataAbertura);
  const fim = turno.dataFechamento ? Date.parse(turno.dataFechamento) : Date.now();
  return t >= inicio && t <= fim;
}

/**
 * Quanto de dinheiro entrou de fato na gaveta com esta venda.
 * Pagamento novo já grava `valor` líquido (com `valorEntregue` ao lado):
 * o troco não pode ser descontado de novo. Venda antiga (sem valorEntregue)
 * gravava o bruto e aí sim o troco sai.
 */
function dinheiroLiquidoVenda(venda) {
  if (!venda) return 0;
  const troco = parseFloat(venda.troco) || 0;

  if (venda.pagamentoDividido && Array.isArray(venda.pagamentos)) {
    let dinheiro = 0;
    let jaLiquido = false;
    venda.pagamentos.forEach(p => {
      if (!p || p.forma !== 'Dinheiro') return;
      dinheiro += parseFloat(p.valor) || 0;
      if (p.valorEntregue != null) jaLiquido = true;
    });
    return Math.max(0, jaLiquido ? dinheiro : dinheiro - troco);
  }

  if (venda.pagamentoDividido && (venda.parcela1 || venda.parcela2)) {
    let dinheiro = 0;
    [venda.parcela1, venda.parcela2].forEach(p => {
      if (p && p.forma === 'Dinheiro') dinheiro += parseFloat(p.valor) || 0;
    });
    return Math.max(0, dinheiro - troco);
  }

  return venda.formaPagamento === 'Dinheiro' ? (parseFloat(venda.total) || 0) : 0;
}


root.FlowCaixaRules={vendaPertenceAoTurno,dinheiroLiquidoVenda};
})(typeof window==='undefined'?globalThis:window);
