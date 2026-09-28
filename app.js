const SUPABASE_URL="https://xzhxqjgekqbyucdgtvra.supabase.co";
const SUPABASE_KEY="sb_publishable_EDE6y5QWzz80ZPxjkP8CqA_l0nenLVj";
const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
let store=null,categories=[],products=[],variants=[],cart=[],active=null,activeSize=null,selectedOptions={},note="";
let checkout={step:"cart",name:"",phone:"",delivery:"entrega",payment:"pix",address:"",observations:""};
const money=v=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number(v||0));
const esc=s=>String(s==null?"":s).replace(/[&<>]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[m]));
const byProduct=id=>variants.filter(v=>v.produto_id===id);
const emoji=k=>({acai:"🥤",hamburgueria:"🍔",pizzaria:"🍕",kebab:"🌯",porcoes:"🍟",combos:"👑",sanduiches:"🥪",sucos:"🍹",bebidas:"🥤","sobremesas-geladas":"🍦"}[k]||"🍴");
function toast(msg){const e=document.querySelector("#toast");e.textContent=msg;e.classList.add("show");setTimeout(()=>e.classList.remove("show"),1800)}
function openNow(){
  const cfg=store&&store.horarios_funcionamento||{},tz=store&&store.fuso_horario||"America/Rio_Branco";
  const f=new Intl.DateTimeFormat("pt-BR",{timeZone:tz,weekday:"short",hour:"2-digit",minute:"2-digit",hour12:false});
  const p=f.formatToParts(new Date()),wd=(p.find(x=>x.type==="weekday")||{}).value||"",h=(p.find(x=>x.type==="hour")||{}).value||"00",m=(p.find(x=>x.type==="minute")||{}).value||"00";
  const key=wd.startsWith("dom")?"dom":wd.startsWith("seg")?"seg":wd.startsWith("ter")?"ter":wd.startsWith("qua")?"qua":wd.startsWith("qui")?"qui":wd.startsWith("sex")?"sex":"sab";
  const d=cfg[key];if(!d||!d.ativo)return false;const now=h+":"+m;return now>=d.abertura&&now<=d.fechamento;
}
function renderStatus(){const e=document.querySelector("#status"),o=openNow();e.classList.toggle("closed",!o);e.querySelector("span").textContent=o?"Aberto agora":"Fechado agora"}
async function load(){
  const e=await db.from("estabelecimentos").select("*").eq("slug","imperio-do-acai").single();if(e.error)throw e.error;store=e.data;
  const rs=await Promise.all([
    db.from("categorias").select("*").eq("estabelecimento_id",store.id).order("ordem"),
    db.from("produtos").select("*").eq("estabelecimento_id",store.id).eq("ativo",true).order("created_at"),
    db.from("produto_variantes").select("*").eq("estabelecimento_id",store.id).order("created_at")
  ]);
  if(rs[0].error||rs[1].error||rs[2].error)throw rs[0].error||rs[1].error||rs[2].error;
  categories=rs[0].data||[];products=rs[1].data||[];variants=rs[2].data||[];
  document.querySelector("#brand-logo").src=store.logo_url||"";
  document.querySelector("#brand-name").textContent=store.nome;
  document.querySelector("#footer-name").textContent=store.nome;
  document.querySelector("#footer-phone").textContent="Disk Delivery: "+(store.whatsapp_numero||store.telefone||"");
  document.querySelector("#footer-instagram").textContent=store.instagram||"";
  if(store.banner_url)document.querySelector("#hero").style.backgroundImage="linear-gradient(90deg,rgba(65,17,56,.88),rgba(65,17,56,.45)),url("+store.banner_url+")";
  renderStatus();renderMenu();updateCart();
}
function minPrice(p){const a=byProduct(p.id).map(v=>Number(v.preco));return a.length?Math.min.apply(null,a):0}
function renderMenu(){
  const vc=categories.filter(c=>products.some(p=>p.categoria_id===c.id));
  document.querySelector("#categories").innerHTML=vc.map((c,i)=>'<button class="cat '+(i===0?"active":"")+'" data-cat="'+c.id+'">'+esc(c.nome)+'</button>').join("");
  document.querySelector("#menu").innerHTML=vc.map(c=>{
    const rows=products.filter(p=>p.categoria_id===c.id);
    return '<section class="section" id="cat-'+c.id+'"><div class="section-head"><h2>'+esc(c.nome)+'</h2><small>'+rows.length+' opções</small></div><div class="grid">'+rows.map(p=>{
      const vs=byProduct(p.id),price=(vs.length>1?"a partir de ":"")+money(minPrice(p));
      const thumb=p.imagem_url?'<img src="'+esc(p.imagem_url)+'" alt="">':'<span>'+emoji(p.categoria_chave)+'</span>';
      return '<article class="product"><div class="product-copy"><span class="tag">'+esc(c.nome)+'</span><h3>'+esc(p.nome)+'</h3><p>'+esc(p.descricao||"")+'</p><div class="bottom"><span class="price">'+price+'</span><button class="add" data-open="'+p.id+'"><i data-lucide="plus"></i></button></div></div><div class="thumb">'+thumb+'</div></article>';
    }).join("")+'</div></section>';
  }).join("");
  lucide.createIcons();
}
function groups(){return Array.isArray(active&&active.grupos_opcoes_config)?active.grupos_opcoes_config:[]}
function pv(){return byProduct(active.id).find(v=>(v.tamanho||"")===(activeSize||""))||byProduct(active.id)[0]}
function optionTotal(){
  let total=0;groups().forEach(g=>{let free=Number(g.gratis||0);(selectedOptions[g.id]||[]).forEach(s=>{const o=(g.opcoes||[]).find(x=>x.id===s.opcao_id);if(!o)return;const q=Number(s.quantidade||1),fq=Math.min(q,free);free-=fq;total+=(q-fq)*Number(o.preco_extra||0)})});return total;
}
function currentPrice(){return Number((pv()||{}).preco||0)+optionTotal()}
function openProduct(id){active=products.find(p=>p.id===id);if(!active)return;activeSize=(byProduct(id)[0]||{}).tamanho||null;selectedOptions={};note="";renderProduct();document.querySelector("#product-overlay").classList.add("show")}
function count(g){return (selectedOptions[g.id]||[]).reduce((s,x)=>s+Number(x.quantidade||1),0)}
function renderProduct(){
  const vs=byProduct(active.id);
  let html='<div class="sheet-top"><h2>Personalizar</h2><button class="close" data-close="product-overlay"><i data-lucide="x"></i></button></div><h3 class="detail-title">'+esc(active.nome)+'</h3><p class="detail-desc">'+esc(active.descricao||"")+'</p>';
  if(vs.length>1)html+='<div class="field"><strong>Escolha o tamanho</strong><div class="choices">'+vs.map(v=>'<button class="choice '+(activeSize===v.tamanho?"selected":"")+'" data-size="'+esc(v.tamanho||"")+'"><b>'+esc(v.tamanho||"Único")+'</b><small>'+money(v.preco)+'</small></button>').join("")+'</div></div>';
  groups().forEach(g=>{
    html+='<div class="field"><strong>'+esc(g.nome)+(Number(g.max)>0?" · até "+g.max:"")+'</strong><div class="choices">'+(g.opcoes||[]).map(o=>{
      const on=(selectedOptions[g.id]||[]).some(x=>x.opcao_id===o.id);
      const txt=Number(o.preco_extra||0)>0?"+"+money(o.preco_extra):(Number(g.gratis||0)>0?"incluso":"sem acréscimo");
      return '<button class="choice '+(on?"selected":"")+'" data-group="'+esc(g.id)+'" data-option="'+esc(o.id)+'"><b>'+esc(o.nome)+'</b><small>'+txt+'</small></button>';
    }).join("")+'</div></div>';
  });
  html+='<div class="field"><strong>Observação</strong><textarea class="note" id="product-note" placeholder="Ex.: sem cebola...">'+esc(note)+'</textarea></div><button class="primary" id="add-cart">Adicionar · '+money(currentPrice())+'</button>';
  document.querySelector("#product-sheet").innerHTML=html;lucide.createIcons();
}
function toggleOption(gid,oid){
  note=(document.querySelector("#product-note")||{}).value||note;
  const g=groups().find(x=>x.id===gid);if(!g)return;const a=selectedOptions[gid]||[],i=a.findIndex(x=>x.opcao_id===oid);
  if(i>=0)a.splice(i,1);else{if(Number(g.max)===1)a.splice(0);if(Number(g.max)>0&&count(g)>=Number(g.max))return toast("Escolha no máximo "+g.max);a.push({grupo_id:gid,opcao_id:oid,quantidade:1})}
  selectedOptions[gid]=a;renderProduct();
}
function requiredOK(){for(const g of groups())if(count(g)<Number(g.min||0)){toast("Escolha pelo menos "+g.min+" em "+g.nome);return false}return true}
function addCart(){
  note=((document.querySelector("#product-note")||{}).value||"").trim();if(!requiredOK())return;
  const opts=Object.values(selectedOptions).flat(),sum=[];
  groups().forEach(g=>{const names=(selectedOptions[g.id]||[]).map(s=>((g.opcoes||[]).find(o=>o.id===s.opcao_id)||{}).nome).filter(Boolean);if(names.length)sum.push(g.nome+": "+names.join(", "))});
  cart.push({produto_id:active.id,nome:active.nome,tamanho:(pv()||{}).tamanho||null,quantidade:1,preco:currentPrice(),opcoes:opts,resumo:sum.join(" · "),note});
  document.querySelector("#product-overlay").classList.remove("show");updateCart();toast("Adicionado ao pedido");
}
function updateCart(){
  const q=cart.reduce((s,x)=>s+x.quantidade,0),t=cart.reduce((s,x)=>s+x.preco*x.quantidade,0);
  document.querySelector("#cart-count").textContent=q;document.querySelector("#bar-label").textContent=q===1?"1 item no pedido":q+" itens no pedido";document.querySelector("#bar-total").textContent=money(t);document.querySelector("#cart-bar").classList.toggle("show",q>0);
}
function persist(){checkout.name=(document.querySelector("#customer-name")||{}).value??checkout.name;checkout.phone=(document.querySelector("#customer-phone")||{}).value??checkout.phone;checkout.address=(document.querySelector("#customer-address")||{}).value??checkout.address;checkout.observations=(document.querySelector("#customer-observations")||{}).value??checkout.observations}
function itemDetail(x){return [x.tamanho,x.resumo,x.note?"Obs.: "+x.note:""].filter(Boolean).join(" · ")}
function renderCart(){
  const total=cart.reduce((s,x)=>s+x.preco*x.quantidade,0),payments=store.formas_pagamento||["pix","dinheiro","cartao"],deliveries=store.formas_entrega||["entrega","retirada"];
  if(!payments.includes(checkout.payment))checkout.payment=payments[0];if(!deliveries.includes(checkout.delivery))checkout.delivery=deliveries[0];
  const pl={pix:"Pix",dinheiro:"Dinheiro",cartao:"Cartão"},dl={entrega:"Entrega",retirada:"Retirada",consumo:"Consumo no local"};
  let html='<div class="sheet-top"><h2>'+(checkout.step==="cart"?"Seu pedido":"Finalizar pedido")+'</h2><button class="close" data-close="cart-overlay"><i data-lucide="x"></i></button></div>';
  if(checkout.step==="cart"){
    if(!cart.length)html+='<p class="detail-desc" style="margin-top:22px">Seu pedido está vazio.</p>';
    else{html+='<div class="cart-list">'+cart.map((x,i)=>'<div class="cart-item"><div class="cart-main"><div><h4>'+esc(x.nome)+'</h4><p>'+esc(itemDetail(x)||"Sem alterações")+'</p></div><strong>'+money(x.preco*x.quantidade)+'</strong></div><div class="cart-controls"><button data-minus="'+i+'">−</button><b>'+x.quantidade+'</b><button data-plus="'+i+'">+</button><button class="remove" data-remove="'+i+'">Remover</button></div></div>').join("")+'</div><div class="total"><span>Total</span><strong>'+money(total)+'</strong></div><button class="primary green" id="go-checkout">Continuar</button>'}
  }else{
    html+='<div class="checkout-grid"><div><strong>Seu nome</strong><input class="input" id="customer-name" value="'+esc(checkout.name)+'" placeholder="Nome completo"></div><div><strong>Telefone / WhatsApp</strong><input class="input" id="customer-phone" value="'+esc(checkout.phone)+'" placeholder="(68) 99999-9999"></div><div><strong>Como quer receber?</strong><div class="option-row">'+deliveries.map(x=>'<button class="opt '+(checkout.delivery===x?"selected":"")+'" data-delivery="'+x+'">'+(dl[x]||x)+'</button>').join("")+'</div></div>'+(checkout.delivery==="entrega"?'<div><strong>Endereço</strong><input class="input" id="customer-address" value="'+esc(checkout.address)+'" placeholder="Rua, número, bairro"></div>':"")+'<div><strong>Pagamento</strong><div class="option-row">'+payments.map(x=>'<button class="opt '+(checkout.payment===x?"selected":"")+'" data-payment="'+x+'">'+(pl[x]||x)+'</button>').join("")+'</div></div><div><strong>Observação geral</strong><textarea class="note" id="customer-observations">'+esc(checkout.observations)+'</textarea></div></div><div class="total"><span>Total</span><strong>'+money(total)+'</strong></div><button class="primary green" id="send-order">Enviar pedido</button><button class="secondary" id="back-cart">Voltar</button>';
  }
  document.querySelector("#cart-sheet").innerHTML=html;lucide.createIcons();
}
async function sendOrder(){
  persist();if(checkout.name.trim().length<3)return toast("Informe seu nome");if(checkout.phone.replace(/\D/g,"").length<10)return toast("Telefone inválido");if(checkout.delivery==="entrega"&&checkout.address.trim().length<8)return toast("Informe o endereço");
  const b=document.querySelector("#send-order");b.disabled=true;b.textContent="Enviando...";
  const itens=cart.map(x=>({produto_id:x.produto_id,quantidade:x.quantidade,tamanho:x.tamanho,opcoes:x.opcoes}));
  const r=await db.rpc("criar_pedido_imperio",{p_cliente_nome:checkout.name.trim(),p_cliente_telefone:checkout.phone.trim(),p_observacoes:checkout.observations.trim(),p_forma_pagamento:checkout.payment,p_forma_entrega:checkout.delivery,p_endereco_entrega:checkout.address.trim(),p_itens:itens});
  if(r.error){console.error(r.error);b.disabled=false;b.textContent="Enviar pedido";return toast(r.error.message||"Erro ao enviar")}
  cart=[];checkout.step="cart";updateCart();document.querySelector("#cart-overlay").classList.remove("show");toast("Pedido enviado");setTimeout(()=>alert("Pedido enviado com sucesso!\nCódigo: "+String(r.data).slice(0,8).toUpperCase()),200);
}
document.addEventListener("click",e=>{
  const o=e.target.closest("[data-open]");if(o)return openProduct(o.dataset.open);
  const c=e.target.closest("[data-close]");if(c)return document.querySelector("#"+c.dataset.close).classList.remove("show");
  const cat=e.target.closest(".cat[data-cat]");if(cat){document.querySelectorAll(".cat").forEach(x=>x.classList.toggle("active",x===cat));document.querySelector("#cat-"+cat.dataset.cat).scrollIntoView({behavior:"smooth"});return}
  const s=e.target.closest("[data-size]");if(s){note=(document.querySelector("#product-note")||{}).value||"";activeSize=s.dataset.size||null;return renderProduct()}
  const op=e.target.closest("[data-group][data-option]");if(op)return toggleOption(op.dataset.group,op.dataset.option);
  if(e.target.closest("#add-cart"))return addCart();
  if(e.target.closest("#cart-top")||e.target.closest("#bar-open")){renderCart();document.querySelector("#cart-overlay").classList.add("show");return}
  const mi=e.target.closest("[data-minus]");if(mi){const i=Number(mi.dataset.minus);cart[i].quantidade--;if(cart[i].quantidade<=0)cart.splice(i,1);updateCart();renderCart();return}
  const pl=e.target.closest("[data-plus]");if(pl){cart[Number(pl.dataset.plus)].quantidade++;updateCart();renderCart();return}
  const rm=e.target.closest("[data-remove]");if(rm){cart.splice(Number(rm.dataset.remove),1);updateCart();renderCart();return}
  if(e.target.closest("#go-checkout")){checkout.step="checkout";renderCart();return}
  if(e.target.closest("#back-cart")){persist();checkout.step="cart";renderCart();return}
  const d=e.target.closest("[data-delivery]");if(d){persist();checkout.delivery=d.dataset.delivery;renderCart();return}
  const p=e.target.closest("[data-payment]");if(p){persist();checkout.payment=p.dataset.payment;renderCart();return}
  if(e.target.closest("#send-order"))return sendOrder();
  if(e.target.classList.contains("overlay"))e.target.classList.remove("show");
});
lucide.createIcons();load().catch(e=>{console.error(e);document.querySelector("#menu").innerHTML='<div class="loading">Não foi possível carregar o cardápio.</div>';toast("Erro ao carregar cardápio")});setInterval(renderStatus,30000);
