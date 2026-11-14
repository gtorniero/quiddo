# Quiddo

Quiz ao vivo para grupos. O anfitrião cria o quiz com as próprias perguntas, abre uma sala com um código de 4 letras, a turma entra pelo celular sem cadastro e todo mundo responde ao mesmo tempo. Quem acerta mais rápido ganha mais pontos, o ranking aparece depois de cada pergunta e no fim tem pódio e sorteio de prêmios.

No ar em **https://www.quiddo.com.br**. Um projeto Beyond the Work.

## Como rodar

Precisa do Node 22 ou mais novo.

```bash
npm install
npm run dev        # site + servidor das salas em http://localhost:5173
npm test           # testes dos pontos e das fases do jogo
npm run typecheck  # checa os tipos do site e do servidor
npm run simular -- http://localhost:5173 200 5   # 200 jogadores robôs numa sala local, 5 perguntas
```

Para testar com o celular na mesma rede Wi-Fi: `npm run dev -- --host` e abra no celular o endereço "Network" que aparece no terminal.

## Páginas

| Endereço | O que é |
| --- | --- |
| `/` | Home: o que é, como funciona, os três modos |
| `/criar` | Editor do quiz. Na primeira visita (ou com `?comecar=1`, vindo do fim do jogo) abre em "Como você quer começar?": quizzes prontos de todos os modos em cima e, com mais destaque embaixo, "Começar do zero" e "Criar com IA". Depois: Meus quizzes, nome do quiz (em Corporativo e Escola, logo e cor da marca no Passe e no Premium; no grátis, um cadeado leva aos planos), modo (Corporativo, Amigos & família, Escola), visual, tempo, perguntas (com "Trocar por um quiz pronto"), "Quantas pessoas vão jogar?" e abrir a sala. No celular, "Abrir a sala" fica fixo embaixo e o painel tem "Mandar para o computador" |
| `/criar?levar={id}` | Abre no computador da TV o quiz mandado do celular (cópia de 7 dias, `worker/levar.ts`) |
| `/host/{CODIGO}` | Tela do anfitrião, para a TV ou o projetor |
| `/{CODIGO}` | Entrada e tela do jogador |
| `/jogar` | Digitar o código da sala |
| `/entrar` | Login sem senha (código por e-mail) |
| `/conta` | Plano, validade e sair |
| `/guias` e `/guias/{slug}` | Guias. Os textos ficam em `src/data/guias/*.ts`. O `npm run build` gera HTML pronto de cada guia (`scripts/prerender.mjs`), mais `sitemap.xml` e `robots.txt`, para os buscadores lerem sem JavaScript |

Na tela do anfitrião, a seta para a direita, Page Down ou espaço avançam o jogo. Isso faz o passador de slides funcionar.

## Do celular para o computador da TV

Quem prepara o quiz no celular toca em "Mandar para o computador" (painel "Abrir a sala"). O servidor guarda uma cópia do quiz por 7 dias na tabela `qd_levar` do D1 (`POST /api/levar`), com um id aleatório de 22 caracteres, e o celular manda o link `/criar?levar={id}` pelo WhatsApp, e-mail ou compartilhar. No computador, o link importa o quiz como um quiz novo (`GET /api/levar/{id}`). Não guarda e-mail nem nome; para limitar abusos (30 envios por hora), guarda só um resumo (hash) do endereço de internet que muda todo dia. Acima de 1,8 MB (limite de linha do D1), o quiz vai sem as imagens e o site avisa. Evento `quiz_handoff` na medição.

## Quantas pessoas vão jogar

No painel "Abrir a sala", a pergunta "Quantas pessoas vão jogar?" (até 10, 11 a 30, 31 a 100, mais de 100) é opcional e fica guardada só neste navegador, por quiz. Acima de 10, mostra antes do evento o Passe 7 dias (um evento) e a assinatura (quem faz quiz sempre), com os preços de `/api/cobranca`, e o botão "Liberar até 200 pessoas". Quem já tem plano vê "Tudo certo".

## Personagens

Cada jogador escolhe um bicho do Brasil com até dois itens (cabeça e rosto) e uma cor de fundo. Veja `docs/personagens.md`. O guia de identidade visual está em `docs/marca/BRAND.md`.

## Como é feito

- **Site**: Vite + TypeScript, sem framework. `src/`
- **Servidor**: um Cloudflare Worker (`worker/index.ts`) serve o site e a API. Cada sala é um Durable Object (`worker/room.ts`) que guarda perguntas, jogadores, respostas e pontos, mede o tempo das respostas e manda o estado por WebSocket. A sala é apagada 2 horas depois do fim, ou 12 horas depois de aberta.
- **Regras do jogo**: `shared/game.ts` (fases, pontos, ranking, sorteio) e `shared/rules.ts` (limites, códigos, validação). São usadas pelo servidor e testadas em `tests/`.
- **Protocolo**: `shared/protocol.ts`. Mensagens JSON com `type`. O servidor manda sempre o estado completo, e o jogador nunca recebe a resposta certa antes da revelação.

Pontos: errou ou não respondeu, 0. Acertou: `round(500 + 500 × max(0, 1 − tempo / limite))`, de 500 a 1000. O tempo é medido no servidor e o anfitrião escolhe um tempo único para todas as perguntas: 10, 15, 20 ou 30 segundos (padrão 15). A rapidez sempre vale ponto.

Cada pergunta pode ser de múltipla escolha (2 a 4 respostas) ou verdadeiro ou falso. O motor ainda aceita enquete e "Quem é mais provável…" (sem pontos), mas o editor não oferece mais esses tipos. Qualquer pergunta pode ter uma imagem (reduzida no navegador para até 960×540; aparece na TV e nos celulares).

Antes de cada pergunta há um "Prepare-se" de 5 segundos: a pergunta aparece, a contagem corre e só depois dá para responder; o tempo de resposta conta a partir daí. O editor tem a opção "A última pergunta vale o dobro", que dobra os pontos da última pergunta com resposta certa.

Depois de cada pergunta o ranking mostra as moedinhas entrando, o placar subindo e quem trocou de posição. No fim, o pódio é revelado do 3º para o 1º lugar, com suspense, e o "modo foto" deixa só o pódio na tela.

**Modos e visuais.** O modo é o tipo de evento (Corporativo, Amigos & família, Escola) e aparece na home e no editor. O visual só aparece no editor, depois do modo, e lista apenas os visuais daquele modo (`VISUAIS_DO_MODO` em `shared/rules.ts`; o servidor recusa visual fora do modo e cai em Floresta):

| Modo | Visuais |
|---|---|
| Corporativo | Floresta (padrão), Escritório, Entretenimento |
| Amigos & família | Floresta (padrão), Entretenimento, Espaço, Amor |
| Escola | Floresta (padrão), Sala de aula, Álbum de figurinhas, Espaço, Entretenimento |

Floresta é o Quiddo de sempre. Cada outro visual troca as cores da TV e dos celulares, o relógio do "Prepare-se" (caneca de café, contagem de filme, lousa, pacotinho de figurinhas, planeta, coração), a cortina da troca de pergunta (post-its, cortina de cinema, folhas de caderno, figurinhas, espaço, corações) e o cenário do pódio (`src/lib/visuais-arte.ts` e `src/lib/podio.ts`). Em todos, o pódio revela o 3º, depois o 2º e por último o 1º, e em seguida a TV e todos os celulares mostram os 10 primeiros.

Na Floresta, o pódio muda de cenário: em Amigos & família e Escola ele reveza entre a mata à noite (vaga-lumes), a chuva de ipê e a praia no fim de tarde (a cena sai do código da sala, então a TV e os celulares mostram a mesma); o Corporativo mantém o palco sóbrio. O álbum de figurinhas com o carimbo "Nota 10" virou um visual próprio da Escola. Quando o 1º aparece, cada lugar comemora do seu jeito (o 1º gira com coroa, o 2º pula, o 3º balança) e quem ficou fora do pódio aplaude no celular.

Entre as rodadas: a contagem do "Prepare-se" é o olho do tucano; a pergunta que vale o dobro chega com o selo ×2 e a tela treme; a última pergunta cai do alto com os 3 primeiros nervosos na TV; uma cortina de folhas atravessa a TV na troca de pergunta. Na revelação, primeiro aparecem só os votos de cada resposta; um instante depois a certa ganha o selo verde e as outras apagam (os celulares esperam o mesmo tempo para dizer quem acertou). Depois da última pergunta não tem ranking, para não entregar o vencedor: vai direto para o pódio. Na última, os bichos de quem acertou entram em fila e aparece o "Mais rápido no gatilho". O ranking da TV alterna entre a pista (cada bicho corre até a pontuação nova) e as colunas, e destaca quem está "pegando fogo" (3 acertos seguidos ou mais).

Os bichos piscam e respiram na sala de espera e no pódio, entram como figurinhas com sombra dura e ganham molduras de conquista: chamas (sequência de 3 acertos), raio (o mais rápido da pergunta) e louros dourados (quem lidera).

Limites: até 200 jogadores por sala, 50 perguntas por quiz, apelido de até 18 letras.

## Publicar no Cloudflare (plano gratuito)

O plano gratuito do Cloudflare roda tudo, inclusive as salas ao vivo: até 100 mil requisições e 13 mil GB-s de sala aberta por dia, algo como 50 partidas de 200 pessoas. Se passar disso, o site para até o dia seguinte; aí vale assinar o Workers Paid (US$ 5 por mês), sem mudar nada no código.

### Caminho recomendado: publicar direto do GitHub

Cada push na branch principal publica sozinho.

1. Crie a conta grátis em [dash.cloudflare.com](https://dash.cloudflare.com/sign-up).
2. No painel: **Workers & Pages → Create → Import a repository**.
3. Conecte o GitHub e escolha o repositório `quiddo`.
4. Confira os campos:
   - **Project name**: `quiddo` (tem que ser igual ao `name` do `wrangler.jsonc`)
   - **Build command**: `npm run build`
   - **Deploy command**: `npx wrangler deploy`
   - **Production branch**: a branch principal do repositório
5. Clique em **Deploy**. Em 1 ou 2 minutos aparece o endereço `https://quiddo.<sua-conta>.workers.dev`.

O site oficial é **https://www.quiddo.com.br**. Páginas abertas pelo endereço `workers.dev` são levadas para lá (no começo de `src/main.ts`, porque a Cloudflare entrega as páginas sem passar pelo servidor); a API continua respondendo nos dois.

### Caminho alternativo: publicar do seu computador

```bash
npx wrangler login   # abre o navegador para autorizar
npm run deploy
```

### Ligar o seu domínio

1. No painel do Cloudflare, em **Add a domain**, adicione o domínio (ex.: `quiddo.com.br`) e troque os servidores DNS no registro.br pelos dois que o Cloudflare mostrar. Leva de minutos a algumas horas.
2. Em **Workers & Pages → quiddo → Settings → Domains & Routes → Add → Custom domain**, digite `quiddo.com.br` (e, se quiser, `www.quiddo.com.br`).
3. O Cloudflare cria o certificado HTTPS sozinho.

## Cobrança (Pix e cartão)

Mesmo modelo do Retrozap. Os planos estão em `/precos`:

| Plano | Preço | O que libera |
| --- | --- | --- |
| Grátis | R$ 0 | Salas de até 10 pessoas, todos os modos e visuais, com as cores do Quiddo e o nome do quiz |
| Passe 7 dias (avulso) | R$ 12,99 (`PRECOS.semana`) | Salas de até 200 pessoas e a sua marca (logo e cor), jogos ilimitados por 7 dias; Pix ou cartão |
| Assinatura Mensal | R$ 15,99/mês (`PRECOS.mensal`, id do Stripe em `STRIPE_PRECO_ID.mensal`) | Salas de até 200 e a sua marca, renova a cada mês; só cartão |
| Assinatura Anual | R$ 156/ano, mostrado como R$ 156/ano com "equivale a R$ 13 por mês" (`PRECOS.anual`, id do Stripe em `STRIPE_PRECO_ID.anual`) | Os mesmos benefícios do Mensal, renova a cada ano; só cartão. Só aparece com o preço anual configurado |

**Mudar preços:** todos os valores ficam em `shared/precos.mjs` (`PRECOS`): servidor, site, páginas pré-renderizadas e a conferência da assinatura do Quiz com IA leem daqui. Para Mensal e Anual, crie antes no Stripe um preço novo com o mesmo valor e troque o id em `STRIPE_PRECO_ID` (mesmo arquivo) e em `STRIPE_PRECO_MENSAL_ID`/`STRIPE_PRECO_ANUAL_ID` no `wrangler.jsonc`; o teste `tests/precos.test.ts` confere que os ids batem e que nenhum preço ficou escrito à mão no código. Os testes de cobrança (`billing-tests/`, `tests/seo.test.ts`) usam os valores atuais como exemplo e mudam junto. As antigas variáveis de painel `PRECO_*` não valem mais.

**Marca própria:** logo e cor da marca são do Passe 7 dias e da Assinatura Premium, só em Corporativo e Escola (`marcaPropria` em `shared/rules.ts`). O nome do quiz continua grátis. O servidor é quem decide: a sala guarda o logo e a cor que o editor manda, mas só mostra (e só serve `/api/salas/{CODIGO}/logo`) quando a sala está liberada (`marcaDaSala` em `shared/game.ts`). Se o anfitrião libera com a sala aberta, a marca aparece na hora. Salas grátis com marca salva abrem normalmente, com as cores do Quiddo.

Na assinatura, o período pago vale até o fim: cancelar só impede a próxima renovação. O preço no Stripe tem que ser igual ao do site (o servidor confere e recusa se não bater).

**É uma única assinatura Premium, com exatamente os mesmos benefícios no Mensal e no Anual.** Os dois incluem salas de até 200 pessoas, a sua marca (logo e cor), jogos ilimitados e, a cada mês, 5 créditos de texto e 2 de PDF em saldos separados, sem acúmulo. No Anual, a cota renova mensalmente durante o ano já pago, sem nova cobrança. Só mudam o preço e a frequência de pagamento. A cota comum é definida em `shared/ai-credits.mjs`.

**Janela de pagamento:** só os planos, o e-mail, os botões de pagar, "Continuar grátis, até 10 pessoas" (fecha a janela) e o link "Dúvidas? Veja as perguntas frequentes" (abre `/precos#perguntas` em outra aba). Regras de renovação e devolução ficam nas perguntas frequentes, não na janela.

**Oferta da sala cheia:** quando alguém tenta entrar na sala grátis cheia, o celular dessa pessoa fica esperando (e entra sozinho quando liberar) e a tela do anfitrião mostra no topo quantos estão esperando, com o Passe 7 dias de R$ 12,99 por R$ 9,99 (`PRECOS.oferta`), só no Pix. O servidor confere na própria sala: chave do anfitrião, sala grátis e gente esperando.

O quiz é criado e a sala abre de graça; o pagamento só aparece quando a pessoa quer mais de 10 (no editor, na sala de espera ou na página de preços). Mensal e Anual são assinaturas no cartão, com renovação automática e cancelamento em Minha conta; o Passe de 7 dias é avulso.

- **Pix** pelo Mercado Pago. **Cartão, Apple Pay e Google Pay** pelo Stripe Checkout.
- Quem paga recebe um código `QD-XXXX-XXXX`, guardado no navegador. Em outro aparelho, a pessoa usa "Já paguei, tenho um código" com o código ou o e-mail do pagamento.
- O código vale até o fim do plano (coluna `expira`) e pode ser usado no editor (antes de abrir a sala) ou na sala de espera ("Liberar até 200 pessoas"), mesmo com a sala já cheia.
- As compras ficam no banco D1 `quiddo` (tabela `compras`), criado sozinho no primeiro deploy. O código é sempre conferido no servidor.

A variável `COBRANCA`, mantida no painel da Cloudflare, decide o modo. Consulte `/api/cobranca` para verificar o ambiente publicado:

| Modo | O que acontece |
| --- | --- |
| `simulacao` | Vale para todos: salas grátis até 10 pessoas e a página de pagamento no ar, mas o Pix é de mentira (aprova sozinho em 4 segundos) e o cartão não aparece. |
| `teste` | O site fica liberado para todo mundo. Para testar a cobrança, abra `/criar?teste_cobranca=1`. Sem `MP_TOKEN`, o Pix é simulado. |
| `ligada` | Cobrança de verdade: salas grátis até 10 pessoas; só códigos pagos com a cobrança ligada liberam 200. |
| `desligada` | Sem cobrança, salas de até 200 para todos. |

### Ligar o pagamento de verdade

1. **Mercado Pago (Pix)**: em mercadopago.com.br/developers, crie uma aplicação e copie o *Access Token* de produção.
2. **Stripe (cartão, Apple Pay, Google Pay)**: em dashboard.stripe.com, **Developers → API keys**, copie a *Secret key*. Ative Apple Pay e Google Pay em **Settings → Payment methods**.
3. No Cloudflare, em **Workers & Pages → quiddo → Settings → Variables and Secrets**, adicione como **Secret**: `MP_TOKEN` e `STRIPE_KEY`. Opcional, como texto: `CODIGOS_AMIGOS` (códigos de cortesia separados por vírgula). Os preços não ficam no painel: estão em `shared/precos.mjs`.
4. Webhooks (deixam a confirmação mais rápida; sem eles o site confere sozinho a cada 3 segundos):
   - Mercado Pago, em **Webhooks**: `https://SEU-SITE/api/mp-webhook`, evento *Order* (ou *Pagamentos*).
   - Stripe, em **Developers → Webhooks**: `https://SEU-SITE/api/stripe-webhook`, evento `checkout.session.completed`.
5. Teste com `/criar?teste_cobranca=1` ainda no modo `teste`. Quando estiver certo, configure `COBRANCA=ligada` no painel da Cloudflare. O arquivo versionado mantém `keep_vars` e não deve sobrescrever essa escolha.

Nunca coloque as chaves no código: elas ficam só no painel do Cloudflare.

## Login sem senha (`/entrar`)

A pessoa digita o e-mail, recebe um código de 6 dígitos (vale 10 minutos) e entra. A sessão fica num cookie `HttpOnly` por 30 dias. Em `/conta` aparecem o plano, a validade e o código para outros aparelhos. Quem entra com o e-mail da compra recebe o plano em qualquer aparelho; recuperar o plano pelo e-mail só funciona com login daquele e-mail.

- Limites: 3 códigos por e-mail a cada 15 minutos, 10 por endereço de internet por hora e 5 tentativas por código.
- No banco (`logins`, `sessoes`) ficam só o e-mail e resumos (hash) do código e do token, nunca os valores.
- Sem `RESEND_KEY`, e com a cobrança fora do modo `ligada`, o login é **simulado**: o código aparece na tela. Com a cobrança `ligada` e sem a chave, o login fica desligado.

### Ligar o e-mail de verdade (Resend)

1. Crie a conta em resend.com e, em **Domains → Add domain**, adicione o seu domínio. Se o domínio está na Cloudflare, use o botão de configurar sozinho; senão, copie os registros (TXT do SPF e do DKIM, MX de retorno) para o DNS.
2. Em **API Keys → Create**, crie uma chave só com permissão de envio.
3. No Cloudflare, em **Workers & Pages → quiddo → Settings → Variables and Secrets**: `RESEND_KEY` como **Secret** e `EMAIL_DE` como texto, por exemplo `Quiddo <entrar@seudominio.com.br>`.
4. Para o site e o cookie ficarem no seu domínio: **Settings → Domains & Routes → Add → Custom domain** (ex.: `quiddo.com.br`).

**Ordem na página de planos e na janela de pagamento:** a Assinatura Premium vem primeiro (Anual marcado, Mensal ao lado), o Passe 7 dias aparece como alternativa avulsa e o Grátis fecha a lista. O preço sempre leva o período escrito: Anual R$ 156/ano (equivale a R$ 13/mês), Mensal R$ 15,99/mês. O texto dos planos fica em `src/lib/paginas-html.ts`, o mesmo do pré-render; os valores vêm de `shared/precos.mjs`.

## Medição e anúncios

Aviso de cookies em uma linha, com "Saiba mais" para `/privacidade#medicao`, "Recusar" (contorno) e "Aceitar" (principal, com foco inicial), do mesmo tamanho. O rodapé mostra "Medição ligada" ou "Medição desligada" e reabre o aviso. Sem aceite, nenhum script de terceiros carrega (`GOOGLE_SINAIS_SEM_ACEITE = false` em `src/lib/measurement-policy.ts`; ligar exige reescrever a seção "O que medimos").

Com aceite, Google Analytics e o Pixel da Meta rodam no iframe `/medicao` (`public/medicao-vendor.js`). Consent Mode v2: cada iframe começa com tudo `denied` e recebe o `update` da escolha salva; a personalização de anúncios fica sempre negada.

| Etapa | GA4 | Meta (navegador) | Meta (servidor) |
| --- | --- | --- | --- |
| Página pública | `page_view` | `PageView` (com `page_path` e `content_category`) | |
| Sala aberta | `create_room` (com `modo`) | `CreateRoom` (a cada sala, não mexer: otimiza anúncios) e `Lead` (só na 1ª sala do navegador, com `eventID`) | `Lead` com `META_CAPI_LEAD=true` |
| Página de planos | `view_item` | `ViewContent` (`qd-anual`, `qd-mensal`, `qd-passe7`) | |
| Pagamento aberto | `begin_checkout` | `InitiateCheckout` | |
| Compra confirmada | `purchase` | `Purchase` e, na assinatura, `Subscribe` (mesmo `eventID`) | `Purchase` (e `Subscribe` com `META_CAPI_SUBSCRIBE=true`) |

Como o pixel roda no iframe, a Meta registra a URL `/medicao`; o caminho real vai em `page_path`. A Conversions API está em `worker/meta-capi.mjs` e `worker/meta-adapter.mjs` (ver `docs/META-CAPI.md`). As etiquetas UTM da primeira visita ficam no navegador (`qd_origem_v1`, 90 dias) e vão para a coluna `origem` da compra. Renovações pagas da assinatura ficam na tabela `qd_renovacoes`, só para relatório.

## Uso e limites do plano grátis

`GET /api/uso` mostra, por dia (UTC), as salas abertas, os jogos começados, os jogadores e a maior sala dos últimos 14 dias. O plano grátis da Cloudflare dá cerca de 100 jogos de 15 minutos por dia; o campo `alerta` liga aos 70%. Um lembrete agendado confere isso todo dia e avisa quando for hora de assinar o plano de US$ 5.

Cada sala aguenta 200 pessoas com folga (testado no site no ar). Sala em que ninguém mexe por 20 minutos (nem o anfitrião, nem os jogadores) fecha sozinha e avisa as telas. Com 1000, hoje não: as entradas e as atualizações durante a pergunta vão para todos de uma vez e o servidor atrasa.

## Referência

- `docs/briefing.md`: o briefing do produto.
- `docs/referencia/prototipo-quiz.html`: o protótipo "Sua Rodada", que rodava dentro do site da Rodada. Só para consulta, não funciona fora de lá.

## Fora do MVP, por enquanto

Contas e login, quizzes na nuvem, gerar perguntas a partir de PDF, personagens e nova identidade visual, perguntas com imagem, modo equipes, relatório.
