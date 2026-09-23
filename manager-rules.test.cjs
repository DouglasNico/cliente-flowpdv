const {test} = require('node:test');
const assert = require('node:assert/strict');
require('./report-rules.js');
require('./manager-rules.js');
const rules = globalThis.FlowManagerRules;
test('store profile reads PDV config first and never uses support phone as store phone', () => {
  assert.deepEqual(rules.storeProfile({razaoSocial:'Cadastro antigo',cnpj:'antigo',whatsappSuporte:'suporte'}, {nomeEmpresa:'Loja atual',cnpj:'novo',chavePix:'pix',telefone:'loja',whatsappSuporte:'outro suporte'}), {nome:'Loja atual',cnpj:'novo',pix:'pix',telefone:'loja'});
  assert.equal(rules.storeProfile({}, {whatsappSuporte:'suporte'}).telefone, '');
  assert.equal(rules.storeProfile({razaoSocial:'Licença'},{}).nome,'Licença');
});
test('SVG mapping accepts legacy IDs and only returns fixed trusted markup', () => {
  require('./flow-icons.js');
  const svg = globalThis.FlowIcons.from('📅');
  assert.match(svg, /<svg/); assert.match(svg, /aria-hidden="true"/);
  assert.equal(globalThis.FlowIcons.from(svg), svg);
  assert.ok(!globalThis.FlowIcons.from('<img src=x onerror=alert(1)>').includes('onerror'));
});
test('manager role aliases always grant all PDV permissions; operator restrictions remain', () => {
  for (const role of ['gerente','gestor','administrador','admin','superadmin','dono']) {
    const permissions = rules.permissions(role, {cancelarVenda:false,verCustoEstoque:false});
    for (const key of Object.keys(rules.permissionFields)) assert.equal(permissions[key], true);
  }
  assert.equal(rules.permissions('operador', {cancelarItem:false}).cancelarItem, false);
  assert.equal(rules.permissions('operador').cancelarVenda, false);
  assert.equal(rules.permissions('operador').verCustoEstoque, false);
  assert.equal(rules.isManager('operador-admin-falso'), false);
});
const products = [{id:1,nome:'Água',categoria:'Bebidas'},{id:2,nome:'Arroz',categoria:'Alimentos'}];
const sales = [
  {data:'2026-09-22T15:00:00Z',itens:[{produtoId:1,nome:'Água',quantidade:1.1,total:81},{produtoId:2,nome:'Arroz',quantidade:2,total:14},{produtoId:3,nome:'Sal',quantidade:1,total:5}]},
  {data:{seconds:Date.parse('2026-09-23T15:00:00Z')/1000},itens:[{produtoId:1,nome:'Água',quantidade:0.2,total:10}]},
  {data:'2026-09-23',status:'cancelada',itens:[{produtoId:1,quantidade:100,total:9000}]}
];
test('ABC inclusive date filtering accepts timestamps and excludes cancelled sales', () => {
  const report = rules.curvaABC(sales,products,{inicio:'2026-09-23',fim:'2026-09-23'});
  assert.equal(report.total,10); assert.equal(report.rows[0].qtd,0.2); assert.equal(report.rows[0].classe,'A');
});
test('ABC crossing items complete their class; class/search preserve calculation base', () => {
  const report = rules.curvaABC(sales,products,{fim:'2026-09-22'});
  assert.deepEqual(report.rows.map(r=>r.classe),['A','B','C']);
  const filtered = rules.curvaABC(sales,products,{fim:'2026-09-22',classe:'B',busca:'arroz'});
  assert.equal(filtered.total,100); assert.equal(filtered.rows.length,1); assert.ok(Math.abs(filtered.rows[0].percentual - 14) < 1e-9);
});
test('category changes calculation base and zero-value items are not reintroduced', () => {
  const report = rules.curvaABC(sales,products,{categoria:'Alimentos'});
  assert.equal(report.total,14); assert.equal(report.rows[0].percentual,100);
  assert.equal(rules.curvaABC([{itens:[{quantidade:1,total:0,precoUnitario:99}]}],[]).total,0);
  assert.equal(rules.curvaABC(sales,products,{busca:'inexistente'}).rows.length,0);
});
test('permission form toggling restores operator choices and saving enforces manager access', async () => {
  const fs = require('node:fs'), vm = require('node:vm');
  const fields = Object.fromEntries(Object.values(rules.permissionFields).map(id => [id,{checked:false,disabled:false,dataset:{}}]));
  for (const [id,value] of Object.entries({'edit-func-cargo':'operador','edit-func-id':'42','edit-func-nome':'Teste','edit-func-login':'teste','edit-func-pin':'1234'})) fields[id]={value};
  fields['edit-func-ativo']={checked:true}; fields['permissoes-cargo-info']={hidden:true};
  const context={window:{},document:{addEventListener(){},getElementById:id=>fields[id]},FlowManagerRules:rules,localStorage:{setItem(){}},alert(){},console};
  vm.runInNewContext(fs.readFileSync('app.js','utf8'), context);
  const app=context.window.MobileApp;
  fields['edit-func-cargo'].value='gerente'; app.atualizarPermissoesCargo();
  for (const id of Object.values(rules.permissionFields)) {assert.equal(fields[id].checked,true); assert.equal(fields[id].disabled,true);}
  fields['edit-func-cargo'].value='operador'; app.atualizarPermissoesCargo();
  for (const id of Object.values(rules.permissionFields)) {assert.equal(fields[id].checked,false); assert.equal(fields[id].disabled,false);}
  fields['edit-func-cargo'].value='gerente';
  app.exigirOperacaoAutorizada=async()=>true; app.fecharModalSheet=()=>{}; app.renderGerenciaFuncionarios=()=>{};
  app.dadosBackup={usuarios:[{id:'42'}]}; let saved;
  app.salvarNoBackup=async patch=>{saved=patch};
  await app.salvarFuncionarioNuvem({preventDefault(){}});
  assert.equal(saved.usuarios.length,1);
  for (const key of Object.keys(rules.permissionFields)) assert.equal(saved.usuarios[0].permissoes[key],true);
});
