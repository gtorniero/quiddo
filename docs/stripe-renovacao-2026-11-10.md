# Assinaturas e créditos de IA — validação de 10/11/2026

O acesso agora só é prorrogado pela linha integral da fatura paga correspondente ao mesmo titular, produto, assinatura, ambiente e período. Uma fatura antiga não pode liberar dias extras quando o período da assinatura muda. O tempo já pago continua preservado quando a renovação falha ou a Stripe fica indisponível.

Preços e limites comerciais preservados: Passe R$12,99/7 dias, oferta elegível R$9,99, Mensal R$15,99 e Anual R$156,00. Mensal e Anual têm dois créditos mensais compartilhados entre PDF e texto, sem acúmulo. O Anual renova essa cota mensalmente dentro do ano pago, sem cobrança mensal adicional. O teto acumulado de IA de US$4 e seu histórico permanecem iguais.

## Verificação do código publicado

- 177 testes do aplicativo/cobrança, três verificações de tipos e compilação de produção aprovados.
- 15 testes de PDF/texto aprovados em Cloudflare workerd local, com D1/SQLite e Durable Objects isolados.
- Inclui pagamento inicial, renovação, inadimplência, cancelamento, reembolso/disputa, assinatura inválida ou vencida, corpo adulterado, eventos repetidos/atrasados, falha transitória da Stripe e rejeição de faturas incompatíveis.
- PDF e texto usam o mesmo saldo: 2 → 1 → 0; repetição não cobra outro crédito, erros não consomem crédito, exclusão do conteúdo não devolve crédito e concorrência pelo último crédito não ultrapassa o limite. Histórico e isolamento entre contas foram verificados.
- Mensal e Anual passaram pela ponte local webhook assinado → titular pago → saldo, incluindo aniversário no dia 31 e fevereiro no Anual.

## Prova externa no Stripe de teste

O ensaio dedicado de staging do produto, concluído nesta data, usou assinatura fictícia, fatura inicial paga e renovação automática via Test Clock. A Stripe entregou o webhook de renovação ao destino exclusivo de teste. Na mesma conta, o saldo foi 2 → 1 com texto → 0 com PDF → 2 após renovação. Depois de consumir um crédito no novo ciclo, reenviar o evento pela Stripe manteve saldo 1.

Esse ensaio utilizou o ambiente isolado da PR65 e geração de IA simulada. O vínculo entre titular e assinatura foi preparado no banco de staging; não representa conclusão do Checkout pelo navegador. A política alternativa de 5 créditos de texto e 2 de PDF desse ambiente não foi incorporada à produção. As duas faturas externas do ensaio também foram consultadas, somente para leitura, e aceitas pela validação corrigida de período pago; alterar o período sem nova fatura foi recusado.

Nenhuma cobrança real, consumo pago de IA ou compra de créditos foi realizado nesta validação. O Anual, as falhas de pagamento e os controles de autorização foram cobertos pelos testes isolados; a renovação externa via Stripe foi mensal. Evidências detalhadas e identificadores ficam no registro privado da operação, sem segredos no repositório.

Publicação: fluxo existente do Quiddo na Cloudflare. GitHub Pages permanece desativado.
