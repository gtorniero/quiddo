# Assinatura mensal Stripe — teste

O cartão do Mensal passa a usar Stripe Checkout `subscription`. Pix continua avulso por 30 dias; Passe continua avulso por 7 dias. Nenhuma regra de jogo, sala ou limite foi alterada.

## Configuração preparada em 02/11/2026

- Produto TESTE: `quiddo_mensal_test`, R$25,99/mês.
- Price TESTE: `price_1UXRvu134hMOoEZVNfAeMG0d`.
- Portal TESTE exclusivo Quiddo: `bpc_1UXRw6134hMOoEZVqj1kIzhP`.
- Worker de destino: `quiddo`; manter `COBRANCA=simulacao`.
- `STRIPE_PRICE_MENSAL` e `STRIPE_PORTAL_CONFIG`: IDs acima.
- Secrets necessários: `STRIPE_KEY` de teste e `STRIPE_WEBHOOK_SECRET` exclusivo deste endpoint. Não colocar valores no GitHub, arquivos ou chat.
- Webhook esperado: `https://www.quiddo.com.br/api/stripe-webhook`, API `2026-09-30.endive`.
- Eventos: checkout.session.completed, checkout.session.async_payment_succeeded, checkout.session.async_payment_failed, checkout.session.expired; customer.subscription.created, customer.subscription.updated, customer.subscription.deleted; invoice.paid, invoice.payment_failed, invoice.payment_action_required; charge.refunded, charge.dispute.created, radar.early_fraud_warning.created.

A simulação pública é preservada. Abrir `?teste_cobranca=1` habilita a opção de cartão de teste quando o backend estiver configurado; o servidor exige também `testeCobranca:true` e uma conta autenticada. Chaves live são recusadas fora de `COBRANCA=ligada`, e chaves test são recusadas em `ligada`.

## Acesso e conta

O servidor valida preço, moeda, periodicidade, quantidade, ambiente e cliente. Uma fatura efetivamente paga estende o acesso até o fim do período; falha não estende. Cancelamento ao fim do período mantém o tempo pago. Reembolso, disputa e alerta de fraude suspendem acesso. Webhook é validado pelo SDK Stripe; eventos repetidos reconciliam o mesmo registro. O Portal usa somente o cliente vinculado à conta autenticada, com cancelamento ao fim do período e atualização do cartão.

As novas tabelas D1 são criadas de modo aditivo. `keep_vars:true` e ausência de vars de cobrança no wrangler preservam os valores definidos no painel nos próximos deploys.

## Verificação

`npm run typecheck`, `npm test` (67 testes, incluindo renovação, falha, cancelamento, assinatura falsa, mistura de ambientes e autorização do Portal), `npm run build`: passaram. Testes Stripe deste módulo ainda são simulados por HTTP; não equivalem a uma assinatura real no sandbox. Publicação e teste completo dependem de configurar os Secrets e webhook.

## Produção depois

Não basta trocar uma variável: criar preço e Portal live, webhook live com novo segredo, guardar chave live, configurar entrega real de OTP (`RESEND_KEY` e domínio autenticado) e validar compra, renovação, falha e cancelamento. O login atual fora de produção usa simulação e não comprova propriedade de e-mail para cobrança live. Revisar a situação tributária do negócio antes de vender; `automatic_tax` não foi ativado e nenhum registro fiscal foi criado.
