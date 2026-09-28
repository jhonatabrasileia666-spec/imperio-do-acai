(()=>{
  const optionMap=new Map();
  let optionsReady=false;

  db.from('products').select('id,options_config').then(({data,error})=>{
    if(error){console.warn('Império opções:',error);return}
    (data||[]).forEach(row=>optionMap.set(String(row.id),Array.isArray(row.options_config)?row.options_config:[]));
    optionsReady=true;
  });

  const originalOpenProduct=openProduct;
  openProduct=function(productId,preferredSize=''){
    originalOpenProduct(productId,preferredSize);
    if(!selected)return;
    selected.optionGroups=optionMap.get(String(selected.id))||[];
    selected.optionSelections={};
    if(selected.optionGroups.length)renderProduct();
  };

  const optionExtra=()=>{
    let total=0;
    for(const group of (selected?.optionGroups||[])){
      let free=Math.max(0,Number(group.gratis||0));
      for(const choice of (selected.optionSelections?.[group.id]||[])){
        const option=(group.opcoes||[]).find(item=>String(item.id)===String(choice.opcao_id));
        if(!option)continue;
        const qty=Math.max(1,Number(choice.quantidade||1));
        const freeQty=Math.min(qty,free);
        free-=freeQty;
        total+=(qty-freeQty)*Math.max(0,Number(option.preco_extra||0));
      }
    }
    return total;
  };

  const originalCurrentPrice=currentPrice;
  currentPrice=function(){return originalCurrentPrice()+optionExtra()};

  const countGroup=group=>(selected.optionSelections?.[group.id]||[]).reduce((sum,item)=>sum+Number(item.quantidade||1),0);

  const optionSummary=()=>{
    const parts=[];
    for(const group of (selected?.optionGroups||[])){
      const names=(selected.optionSelections?.[group.id]||[]).map(choice=>{
        const option=(group.opcoes||[]).find(item=>String(item.id)===String(choice.opcao_id));
        if(!option)return '';
        return option.nome+(Number(choice.quantidade||1)>1?' x'+choice.quantidade:'');
      }).filter(Boolean);
      if(names.length)parts.push((group.nome||'Opções')+': '+names.join(', '));
    }
    return parts.join(' · ');
  };

  const originalRenderProduct=renderProduct;
  renderProduct=function(){
    originalRenderProduct();
    if(!selected?.optionGroups?.length)return;

    const detail=document.querySelector('#product-detail');
    const noteField=document.querySelector('#note')?.closest('.field');
    if(!detail||!noteField)return;

    for(const group of selected.optionGroups){
      const field=document.createElement('div');
      field.className='field imperio-option-field';

      const label=document.createElement('span');
      label.className='field-label';
      const max=Number(group.max||0);
      const min=Number(group.min||0);
      const count=countGroup(group);
      label.textContent=(group.nome||'Opções')+(max>0?' · escolha até '+max:'')+(min>0?' · mínimo '+min:'')+' ('+count+(max>0?'/'+max:'')+')';

      const grid=document.createElement('div');
      grid.className='option-grid';
      const selectedList=selected.optionSelections[group.id]||[];

      for(const option of (group.opcoes||[])){
        const button=document.createElement('button');
        button.type='button';
        button.className='option'+(selectedList.some(item=>String(item.opcao_id)===String(option.id))?' selected':'');
        const title=document.createElement('strong');
        title.textContent=option.nome||'Opção';
        const meta=document.createElement('span');
        const price=Number(option.preco_extra||0);
        meta.textContent=price>0?'+ '+money(price):(Number(group.gratis||0)>0?'Incluso':'Sem acréscimo');
        button.append(title,meta);
        button.onclick=()=>{
          selected.note=document.querySelector('#note')?.value||selected.note||'';
          const list=selected.optionSelections[group.id]||[];
          const index=list.findIndex(item=>String(item.opcao_id)===String(option.id));
          if(index>=0)list.splice(index,1);
          else{
            if(max===1)list.splice(0,list.length);
            const current=list.reduce((sum,item)=>sum+Number(item.quantidade||1),0);
            if(max>0&&current>=max){showToast('Escolha no máximo '+max+' opção(ões) em '+group.nome);return}
            list.push({grupo_id:group.id,opcao_id:option.id,quantidade:1});
          }
          selected.optionSelections[group.id]=list;
          renderProduct();
        };
        grid.appendChild(button);
      }
      field.append(label,grid);
      noteField.parentNode.insertBefore(field,noteField);
    }

    const addButton=document.querySelector('#add-product');
    if(addButton&&typeof addButton.onclick==='function'){
      const originalAdd=addButton.onclick;
      addButton.onclick=()=>{
        for(const group of selected.optionGroups){
          const count=countGroup(group);
          if(count<Number(group.min||0)){showToast('Escolha pelo menos '+group.min+' opção(ões) em '+group.nome);return}
        }
        selected.optionsSummary=optionSummary();
        originalAdd();
        const item=cart[cart.length-1];
        if(item){
          item.optionsSummary=selected.optionsSummary||'';
          item.optionsPayload=Object.values(selected.optionSelections||{}).flat().map(x=>({...x}));
        }
      };
    }
  };

  const originalRpc=db.rpc.bind(db);
  db.rpc=function(name,args){
    if((name==='criar_pedido'||name==='adicionar_itens_pedido')&&args){
      const cloned={...args};
      const key=name==='criar_pedido'?'p_pedido':'p_items';
      if(name==='criar_pedido'&&cloned.p_pedido){
        const pedido={...cloned.p_pedido};
        pedido.items=(pedido.items||[]).map((item,index)=>({...item,opcoes:cart[index]?.optionsPayload||[]}));
        cloned.p_pedido=pedido;
      }else if(name==='adicionar_itens_pedido'){
        cloned.p_items=(cloned.p_items||[]).map((item,index)=>({...item,opcoes:cart[index]?.optionsPayload||[]}));
      }
      return originalRpc(name,cloned);
    }
    return originalRpc(name,args);
  };

  const originalCartItemDetail=cartItemDetail;
  cartItemDetail=function(item){
    const base=originalCartItemDetail(item);
    return [base,item?.optionsSummary||''].filter(Boolean).join(' · ');
  };
})();