# Gestão de cupons BTW

O painel privado BTW usa GET/POST /api/btw/promos com o segredo exclusivo de serviço BTW_PROMOS_TOKEN; Origin/Cookie são recusados nessa rota, que não oferece CORS. O login humano do gestor antigo continua independente e não é enfraquecido. A credencial permanece apenas nos servidores Quiddo e Sites.

PROMOS é a base central existente. DB é Quiddo; PROMO_RETROZAP e PROMO_SPORTDNA são as bases existentes dos outros produtos e são consultadas apenas para resolver grant_id em e-mail informado no resgate. Não são feitas alterações nos bancos dos outros produtos. Um resgate único não equivale a um pedido, nem a uma pessoa verificada ou atividade atual. Falha de uma fonte de identidade é retornada explicitamente, sem adivinhar e-mails ou zerar os contadores.

GET sem campaign retorna 50 campanhas com cursor, escopos, estado, validade, resgates e e-mails distintos. GET com campaign=id retorna 50 concessões, e-mails, produto e data, mais totais e estado das fontes. Os hashes centrais e os códigos em claro não são retornados pela leitura.

POST create usa request_id idempotente e código escolhido/gerado pelo cliente. promo_admin_requests guarda apenas hash canônico do pedido e code_id; nenhum código em claro. Retentativa igual não duplica campanha; request_id conflitante ou código existente retorna409. POST toggle muda apenas active e preserva os acessos anteriores. As permissões por produto são as mesmas do gestor existente e aplicadas pelos servidores de resgate.

Nenhuma alteração em preços, provedores, rotinas ou modo de cobrança. Testes em billing-tests/promos-service.test.ts cobrem autenticação, CSRF/cookies, criação e repetição, escopos, contadores, identificação, duplicação de pedidos, fontes indisponíveis e paginação.
