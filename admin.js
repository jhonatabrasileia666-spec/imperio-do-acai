const SUPABASE_URL="https://xzhxqjgekqbyucdgtvra.supabase.co";
const SUPABASE_KEY="sb_publishable_EDE6y5QWzz80ZPxjkP8CqA_l0nenLVj";
const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
let store=null,orders=[],products=[],variants=[],channel=null;
const money=v=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number(v||0));
const esc=s=>String(s==null?"":s).replace(/[&<>]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[m]));
function toast(msg){const e=document.querySelector("#toast");e.textContent=msg;e.classList.add("show");setTimeout(()=>e.classList.remove("show"),1800)}
function beep(){try{const A=window.AudioContext||window.webkitAudioContext,a=new A(),o=a.createOscillator(),g=a.createGain();o.connect(g);g.connect(a.destination);o.frequency.value=880;g.gain.setValueAtTime(.08,a.currentTime);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+.28);o.start();o.stop(a.currentTime+.28)}catch{}}
async function boot(){
  const s=await db.auth.getSession();if(!s.data.session)return showLogin();
  const u=s.data.session.user;
  const e=await db.from("estabelecimentos").select("*").eq("slug","imperio-do-acai").single();
  if(e.error)throw e.error;store=e.data;
  if(store.dono_user_id!==u.id){await db.auth.signOut();showLogin();return toast("Essa conta não administra este estabelecimento")}
  document.querySelector("#logo").src=store.logo_url||"";
  document.querySelector("#login").classList.add("hidden");document.querySelector("#app").classList.remove("hidden");
  await refreshAll();subscribe();lucide.createIcons();
}
function showLogin(){document.querySelector("#login").classList.remove("hidden");document.querySelector("#app").classList.add("hidden")}
async function login(){
  const email=document.querySelector("#email").value.trim(),password=document.querySelector("#password").value;
  const b=document.querySelector("#login-btn");b.disabled=true;b.textContent="Entrando...";
  const r=await db.auth.signInWithPassword({email,password});b.disabled=false;b.textContent="Entrar";
  if(r.error)return toast("Login inválido");boot().catch(e=>{console.error(e);toast("Erro ao abrir painel")});
}
async function refreshAll(){await Promise.all([loadOrders(),loadMenu()]);renderDashboard();renderOrders();renderProducts()}
async function loadOrders(){
  const r=await db.from("pedidos").select("*,pedido_itens(*)").eq("estabelecimento_id",store.id).order("created_at",{ascending:false}).limit(200);
  if(r.error)throw r.error;orders=r.data||[];
}
async function loadMenu(){
  const rs=await Promise.all([
    db.from("produtos").select("*,categorias(nome)").eq("estabelecimento_id",store.id).order("created_at"),
    db.from("produto_variantes").select("*").eq("estabelecimento_id",store.id).order("created_at")
  ]);
  if(rs[0].error||rs[1].error)throw rs[0].error||rs[1].error;products=rs[0].data||[];variants=rs[1].data||[];
}
function todayKey(d){return new Intl.DateTimeFormat("en-CA",{timeZone:store.fuso_horario||"America/Rio_Branco",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(d))}
function renderDashboard(){
  const now=todayKey(new Date()),today=orders.filter(o=>todayKey(o.created_at)===now),open=today.filter(o=>!["finalizado","cancelado"].includes(o.status)),revenue=today.filter(o=>o.status!=="cancelado").reduce((s,o)=>s+Number(o.total||0),0);
  document.querySelector("#metrics").innerHTML=[
    ["Pedidos hoje",today.length],["Em aberto",open.length],["Faturamento hoje",money(revenue)],["Produtos ativos",products.filter(p=>p.ativo).length]
  ].map(x=>'<div class="metric"><small>'+x[0]+'</small><strong>'+x[1]+'</strong></div>').join("");
  document.querySelector("#recent-orders").innerHTML='<h3 style="margin:14px 0 0;color:var(--p)">Últimos pedidos</h3>'+orders.slice(0,5).map(orderCard).join("");
}
function statusLabel(s){return {novo:"Novo",em_preparo:"Em preparo",pronto:"Pronto",saiu_entrega:"Saiu para entrega",finalizado:"Finalizado",cancelado:"Cancelado"}[s]||s}
function orderCard(o){
  const items=(o.pedido_itens||[]).map(i=>esc(i.quantidade+"x "+(i.nome_item||"Item")+(i.variante_descricao?" · "+i.variante_descricao:""))).join("<br>");
  const date=new Date(o.created_at).toLocaleString("pt-BR",{timeZone:store.fuso_horario||"America/Rio_Branco"});
  return '<article class="order"><div class="order-head"><div><span class="badge">'+statusLabel(o.status)+'</span><h3 style="margin-top:8px">'+esc(o.cliente_nome)+'</h3><p>'+esc(o.cliente_telefone||"")+' · '+date+'<br>'+esc(o.forma_entrega||"")+' · '+esc(o.forma_pagamento||"")+(o.endereco_entrega?'<br>'+esc(o.endereco_entrega):"")+'</p></div><div><strong>'+money(o.total)+'</strong><br><select class="status-select" data-order-status="'+o.id+'">'+["novo","em_preparo","pronto","saiu_entrega","finalizado","cancelado"].map(s=>'<option value="'+s+'" '+(o.status===s?"selected":"")+'>'+statusLabel(s)+'</option>').join("")+'</select></div></div><div class="order-items">'+(items||"Sem itens")+(o.observacoes?'<br><b>Obs.:</b> '+esc(o.observacoes):"")+'</div></article>';
}
function renderOrders(){document.querySelector("#orders-list").innerHTML=orders.length?orders.map(orderCard).join(""):'<p>Nenhum pedido.</p>'}
function productPriceHtml(p){
  const vs=variants.filter(v=>v.produto_id===p.id);
  return vs.map(v=>'<label style="font-size:10px;color:var(--muted)">'+esc(v.tamanho||"Preço")+'<br><input class="price-input" type="number" step="0.01" value="'+Number(v.preco)+'" data-price="'+v.id+'"></label>').join("");
}
function productCard(p){
  return '<article class="product"><div><span class="badge">'+esc((p.categorias||{}).nome||p.categoria_chave||"")+'</span><h3 style="margin-top:8px">'+esc(p.nome)+'</h3><p>'+esc(p.descricao||"")+'</p></div><div class="product-actions">'+productPriceHtml(p)+'<button class="toggle '+(p.ativo?"":"off")+'" data-toggle-product="'+p.id+'" data-active="'+p.ativo+'">'+(p.ativo?"Disponível":"Indisponível")+'</button></div></article>';
}
function renderProducts(filter=""){
  const q=filter.trim().toLowerCase(),rows=products.filter(p=>!q||p.nome.toLowerCase().includes(q)||((p.categorias||{}).nome||"").toLowerCase().includes(q));
  document.querySelector("#products-list").innerHTML=rows.map(productCard).join("");
}
async function updateStatus(id,status){
  const r=await db.from("pedidos").update({status,updated_at:new Date().toISOString()}).eq("id",id).eq("estabelecimento_id",store.id);
  if(r.error)return toast("Não foi possível atualizar");toast("Status atualizado");await loadOrders();renderDashboard();renderOrders();
}
async function toggleProduct(id,active){
  const r=await db.from("produtos").update({ativo:!active}).eq("id",id).eq("estabelecimento_id",store.id);
  if(r.error)return toast("Não foi possível alterar");await loadMenu();renderDashboard();renderProducts(document.querySelector("#search").value);toast(!active?"Produto disponível":"Produto pausado");
}
async function updatePrice(id,value){
  const n=Number(value);if(!Number.isFinite(n)||n<0)return toast("Preço inválido");
  const r=await db.from("produto_variantes").update({preco:n}).eq("id",id).eq("estabelecimento_id",store.id);
  if(r.error)return toast("Não foi possível salvar preço");await loadMenu();renderProducts(document.querySelector("#search").value);toast("Preço atualizado");
}
function subscribe(){
  if(channel)db.removeChannel(channel);
  channel=db.channel("imperio-pedidos").on("postgres_changes",{event:"INSERT",schema:"public",table:"pedidos",filter:"estabelecimento_id=eq."+store.id},async()=>{beep();toast("Novo pedido recebido");await loadOrders();renderDashboard();renderOrders()}).subscribe();
}
document.addEventListener("click",e=>{
  if(e.target.closest("#login-btn"))return login();
  if(e.target.closest("#logout"))return db.auth.signOut().then(showLogin);
  const n=e.target.closest("[data-view]");if(n){document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x===n));document.querySelectorAll(".view").forEach(x=>x.classList.toggle("active",x.id==="view-"+n.dataset.view));return}
  if(e.target.closest("[data-refresh]"))return refreshAll().then(()=>toast("Atualizado"));
  const t=e.target.closest("[data-toggle-product]");if(t)return toggleProduct(t.dataset.toggleProduct,t.dataset.active==="true");
});
document.addEventListener("change",e=>{
  if(e.target.matches("[data-order-status]"))updateStatus(e.target.dataset.orderStatus,e.target.value);
  if(e.target.matches("[data-price]"))updatePrice(e.target.dataset.price,e.target.value);
});
document.addEventListener("input",e=>{if(e.target.id==="search")renderProducts(e.target.value)});
document.querySelector("#password").addEventListener("keydown",e=>{if(e.key==="Enter")login()});
lucide.createIcons();boot().catch(e=>{console.error(e);showLogin();toast("Erro ao abrir painel")});
