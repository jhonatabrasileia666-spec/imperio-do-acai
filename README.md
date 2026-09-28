# Império do Açaí

Sistema personalizado criado a partir do molde técnico do Delivery LV e integrado ao Supabase multiestabelecimento do Michel.

## Cliente
- Estabelecimento: Império do Açaí
- Slug no Supabase: `imperio-do-acai`
- Cardápio público: `index.html`
- Painel administrativo: `admin.html`

## Implementado
- identidade visual nas cores do cardápio original
- logo e banner carregados do cadastro do estabelecimento
- categorias e produtos cadastrados a partir dos PDFs enviados
- Açaí com tamanhos 247ml, 356ml e 480ml
- até 4 acompanhamentos do Açaí
- adicionais pagos do Açaí
- adicionais de Burguer
- pizzas com tamanhos M e G
- Sundae, Milk-Shake, Mix, Casquinha e Cascão
- carrinho e checkout
- pedidos gravados no Supabase
- cálculo de preços e adicionais validado no servidor pela função `criar_pedido_imperio`
- painel autenticado do dono
- pedidos e atualização de status
- aviso sonoro de novo pedido quando Realtime estiver disponível
- ativar/desativar produtos
- edição de preços por variante/tamanho
- horários e formas de pagamento/entrega carregados do cadastro do estabelecimento

## Banco
Projeto Supabase: `cardapio-digital` (`xzhxqjgekqbyucdgtvra`).

Os dados do Império ficam separados dos demais clientes por `estabelecimento_id`.
