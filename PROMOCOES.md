# Códigos promocionais BTW

Painel único: https://www.quiddo.com.br/promocoes/ — entre primeiro em /conta com o e-mail configurado em PROMO_ADMIN_EMAIL. A API exige sessão real verificada; sem configuração, nega acesso.

O binding PROMOS nos três Workers aponta exclusivamente para btw-promocoes. Os bancos de compras continuam separados. Não contém mensagens de grupos ou respostas dos testes. Cada banco local guarda o acesso do seu próprio produto.

Criar um código no painel mostra o valor uma única vez; copie para guardar ou enviar. O banco guarda somente SHA-256 do código. A lista mostra nome, sites, validade, situação e número de resgates. Nenhum limite de pessoas por código. Código desativado ou vencido impede novos resgates; não revoga benefícios já concedidos. Para substituir um código perdido, desative e crie outro.

Quiddo concede Passe 7 dias a partir do primeiro resgate de cada e-mail; repetir o mesmo código não reinicia a validade. Nunca cria assinatura. RetroZap concede Premium; SPORT DNA libera o produto selecionado, sem cobrança. Repetir a solicitação não cria renovação. Contagem central identifica apenas um hash específico do destinatário por código/site/produto.

Validação no servidor, escopo por site, tentativas limitadas por IP e período, proteção de origem em mutações. O painel usa texto seguro para nomes, não HTML fornecido pelo usuário. Os códigos são compartilháveis: para impedir novos usos após vazamento, desative no painel.

Publicação: aplicar os bindings PROMOS e PROMO_ADMIN_EMAIL junto com o código. As tabelas promocionais são criadas de forma aditiva na primeira utilização. Sem o binding, a API falha fechada e nenhum acesso é concedido. Não executar migrações destrutivas nem trocar segredos dos pagamentos.
