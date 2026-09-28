(()=>{
  const norm=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const isCombo=()=>typeof selected!=='undefined'&&selected?.category==='esfirras'&&norm(selected?.name)==='combo esfirras';

  document.addEventListener('click',event=>{
    const flavorButton=event.target.closest('[data-combo-flavor-id]');
    if(flavorButton&&isCombo()){
      event.preventDefault();
      event.stopPropagation();
      const id=flavorButton.dataset.comboFlavorId;
      const list=Array.isArray(selected.comboFlavors)?selected.comboFlavors:(selected.comboFlavors=[]);
      const index=list.findIndex(flavor=>String(flavor.id)===String(id));

      if(index>=0){
        list.splice(index,1);
      }else{
        if(list.length>=3){
          showToast('O combo permite até 3 sabores');
          return;
        }
        const product=typeof flavorProduct==='function'?flavorProduct(id):null;
        if(product)list.push({id:product.id,name:product.name});
      }

      selected.note=document.querySelector('#note')?.value||selected.note||'';
      if(typeof renderProduct==='function')renderProduct();
      return;
    }

    const addButton=event.target.closest('#add-product');
    if(addButton&&isCombo()){
      const list=Array.isArray(selected.comboFlavors)?selected.comboFlavors:[];
      if(!list.length){
        event.preventDefault();
        event.stopImmediatePropagation();
        showToast('Escolha pelo menos 1 sabor para o combo');
        return;
      }

      const noteField=document.querySelector('#note');
      const customerNote=String(noteField?.value||'').trim();
      const flavorText='Sabores do combo: '+list.map(flavor=>flavor.name).join(' / ');
      if(noteField)noteField.value=customerNote?flavorText+' · '+customerNote:flavorText;
    }
  },true);
})();