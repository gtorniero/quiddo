# Briefing — site de quiz ao vivo (ex-"Sua Rodada")

> Cole este texto inteiro no Claude Code, dentro de uma pasta vazia que vai virar o repositório no GitHub.
> Troque `Sua Rodada` pelo nome escolhido antes de colar.

---

Você vai construir do zero um site de **quiz ao vivo para grupos**, chamado **Sua Rodada**. É um produto independente, em português do Brasil, simples, rápido e bonito. Leia o briefing inteiro antes de começar, monte um plano curto, depois execute por etapas e me mostre o resultado de cada etapa.

## 1. O produto em uma frase

Um anfitrião cria um quiz com as próprias perguntas, abre uma sala com um código de 4 letras, a turma entra pelo celular sem cadastro, todo mundo responde ao mesmo tempo, quem acerta mais rápido ganha mais pontos e o ranking aparece depois de cada pergunta. No fim, pódio e sorteio de prêmios.

Para quem: empresas (convenção de vendas, apresentação, treinamento, confraternização) e grupos de amigos e família (aniversário, churrasco, Natal, despedida).

## 2. Regras de marca e propriedade intelectual (obrigatório)

- É um quiz ao vivo no estilo dos que já existem, mas **nunca** use o nome "Kahoot", nem o logo, as formas (triângulo, losango, círculo, quadrado), as cores ou os sons deles. As respostas são identificadas por **letras A, B, C, D**.
- Nada de texto em inglês na interface. Tudo em português do Brasil, frases curtas e diretas.
- Rodapé de todas as páginas: "© 2026 Sua Rodada" à esquerda e "um projeto Beyond the Work" à direita (vou te mandar o SVG da assinatura; até lá, use o texto em Sora 600).

## 3. Escopo do MVP

### 3.1 Anfitrião (normalmente no computador ligado à TV)
1. **Escolhe o tema**: Corporativo ou Amigos & família (ver visual na seção 5).
2. **Edita as perguntas**:
   - cada pergunta tem texto, de 2 a 4 respostas, uma marcada como certa, e tempo de 10, 15, 20 ou 30 segundos;
   - adicionar, remover, reordenar (arrastar ou setas) e duplicar perguntas;
   - cada tema vem com um pacote pronto de 8 a 10 perguntas para editar;
   - "Nome 1" e "Nome 2" opcionais: se a pergunta tiver `{A}` ou `{B}`, entra o nome (aniversariante, homenageado, casal);
   - salvar o quiz no navegador (localStorage) e listar "Meus quizzes"; importar e exportar o quiz em JSON.
3. **Personaliza a marca** ("Sua marca", opcional):
   - nome da empresa ou do evento (até 40 caracteres);
   - cor principal: dois botões grandes, "Cor do tema" e "Cor da minha marca"; ao escolher a segunda, aparecem 8 sugestões com nome, um seletor livre com o código hex e um botão de exemplo "Assim fica o botão". Texto do botão em branco ou preto conforme o contraste;
   - logo: upload de PNG, JPG ou SVG, reduzido no navegador para no máximo 480×160 e guardado como imagem pequena. **O logo aparece na tela do anfitrião e também nos celulares** (aqui temos servidor próprio, então dá para enviar).
4. **Abre a sala**: gera código de 4 caracteres (sem letras ambíguas: sem 0, O, 1, I) e um link `/{CODIGO}`. Mostra o código gigante, um QR code e o botão verde **"Mandar convite no WhatsApp"** com o ícone do WhatsApp (link `https://wa.me/?text=` com texto pronto e o link da sala).
5. **Lobby**: lista quem entrou (apelidos), contador, botão "Começar o quiz" e "Remover" ao lado de cada jogador.
6. **Durante o jogo (tela da TV)**: pergunta grande, as respostas com letra e cor, barra de tempo, "X de Y responderam". Fecha sozinha quando todos respondem ou o tempo acaba. Depois mostra a resposta certa e quantos escolheram cada alternativa.
7. **Ranking** após cada pergunta (top 8, com "+pontos" da rodada e animação de subida), botão "Próxima pergunta".
8. **Fim**: pódio dos 3 primeiros e classificação completa. **Sorteio de prêmios** com dois botões: "Sortear entre todos" e "Só entre quem pontuou". Cada sorteio tira um nome que ainda não saiu, com animação de roleta de nomes de ~1,5 s. Botão "Jogar de novo" (mesmas pessoas).

### 3.2 Jogador (celular)
1. Entra pelo link ou digitando o código + apelido (até 18 caracteres). Sem cadastro.
2. Vê o nome do evento, a cor e o logo do anfitrião.
3. Durante a pergunta: o texto da pergunta e 4 botões grandes com letra e texto. Um toque responde; não dá para mudar.
4. Depois da revelação: "Acertou! +840" ou "Errou", e "Você está em 3º de 24".
5. No fim: sua posição, pontos, o pódio, e se foi sorteado: "Você foi sorteado!".
6. Se a conexão cair, volta para a mesma sala e mantém os pontos (identificador salvo no localStorage).

### 3.3 Pontuação
- Errou ou não respondeu: 0.
- Acertou: `round(500 + 500 × max(0, 1 − tempo_de_resposta / tempo_limite))`, de 500 a 1000.
- **O tempo é medido no servidor**, a partir do momento em que a pergunta foi enviada, para ninguém trapacear.

### 3.4 Páginas do site
- `/` — home: o que é, como funciona em 3 passos, os dois temas, botões "Criar meu quiz" e "Entrar com código".
- `/criar` — editor e configuração do anfitrião.
- `/host/{CODIGO}` — tela do anfitrião.
- `/{CODIGO}` — entrada e tela do jogador.
- `/guias` e `/guias/{slug}` — os 10 guias (vou te passar os textos; deixe 1 de exemplo e a estrutura pronta).

### 3.5 Fora do MVP (não faça agora)
Contas e login, banco de quizzes na nuvem, pagamentos, perguntas com imagem e vídeo, modo equipes, relatório para exportar. Deixe o código organizado para isso entrar depois.

## 4. Tecnologia

Quero tudo no **Cloudflare**, barato e simples, com o código no GitHub.

- **Frontend**: Vite + TypeScript, sem framework pesado (vanilla ou Preact). CSS próprio com variáveis. Precisa funcionar bem em celular antigo.
- **Tempo real**: Cloudflare **Workers + Durable Objects**, um Durable Object por sala, comunicação por **WebSocket**. O Durable Object guarda o estado da sala (perguntas, jogadores, respostas, pontos) e é a fonte da verdade.
- **Hospedagem**: um único projeto Worker servindo os arquivos estáticos (assets) e a API/WebSocket, publicado com `wrangler deploy`.
- **Persistência**: o quiz fica no localStorage do anfitrião; a sala só existe enquanto o jogo dura (apague o estado da sala 2 horas depois do fim).
- **Capacidade**: testar com 200 jogadores simultâneos por sala.
- **QR code**: biblioteca pequena (ex.: `qrcode`).
- Sem coleta de dados pessoais além do apelido. Sem cookies de rastreio.

### Protocolo (sugestão — ajuste se precisar)
Mensagens JSON pelo WebSocket, sempre com `type`:
- jogador → servidor: `join {code, nick, playerId}`, `answer {qIndex, choice}`.
- anfitrião → servidor: `create {quiz, theme, brand}`, `start`, `reveal`, `showRanking`, `next`, `kick {playerId}`, `draw {mode: "all"|"scored"}`, `restart`.
- servidor → todos: `state {phase, qIndex, total, question?, endsAt?, answeredCount, players, ranking?, correct?, counts?, podium?, drawn?, brand, theme}`. Envie **estado absoluto**, nunca diferenças. Ao jogador, nunca envie a resposta certa antes da revelação.
- Fases: `lobby → question → reveal → ranking → … → final`.

## 5. Visual

Fonte de texto e títulos: **Figtree** no Corporativo. No Amigos & família: **Fraunces itálico 900** nos títulos, perguntas e placar, e **Nunito** no texto. Códigos de sala em **JetBrains Mono**. Todas do Google Fonts.

**Tema Corporativo** (sóbrio):
- fundo `#F5F5F4`, cartões `#FFFFFF`, texto `#111111`, texto secundário `#57534E`, linhas `#E7E5E4`;
- cor principal `#18181B` (preto), texto do botão branco;
- cores das respostas: A `#18181B`, B `#44403C`, C `#71717A`, D `#A16207`;
- cantos 16–20 px, sem sombra pesada.

**Tema Amigos & família** (leve e descontraído):
- fundo branco com confete discreto (bolinhas rosa, amarelas e lilás em `radial-gradient`), cartões com borda tracejada `#F2E4EE` e cantos 26–28 px;
- cor principal `#FF4F8B`;
- respostas: A `#FF4F8B`, B `#D97706`, C `#12A06A`, D `#7C5CFF`, botões levemente inclinados (±0,4°).

**Cor da marca**: quando o anfitrião escolhe uma cor, ela substitui a cor principal do tema na tela e nos celulares.

**Acessibilidade**: contraste de texto 4.5:1, botões de no mínimo 48 px de altura, foco visível no teclado, `prefers-reduced-motion` respeitado, tudo funciona em tela de 360 px de largura.

**Ícone do WhatsApp** em todo botão que manda algo para o WhatsApp: botão verde `#25D366`, texto `#073B1F` em negrito, ícone à esquerda.

## 6. Etapas de execução

1. **Esqueleto**: repositório, Vite + TS, Worker com Durable Object, `wrangler.toml`, scripts `dev`, `build`, `deploy`, README. Página `/` simples. Me mostre rodando localmente.
2. **Sala em tempo real**: criar sala, entrar com código, lobby atualizando ao vivo, reconexão.
3. **Jogo**: perguntas, timer do servidor, respostas, revelação, pontuação, ranking, pódio, sorteio.
4. **Editor e temas**: editor completo, pacotes prontos, dois temas, `{A}`/`{B}`, Sua marca (nome, cor, logo).
5. **Acabamento**: QR code, convite do WhatsApp, home, guias, rodapé, estados vazios e de erro ("Sala não encontrada", "O quiz já começou", "A conexão caiu, reconectando…").
6. **Testes**: testes do cálculo de pontos e das transições de fase; um script que simula 200 jogadores entrando e respondendo numa sala local; teste manual em celular.
7. **Publicação**: deploy no Cloudflare e instruções no README para ligar meu domínio.

Em cada etapa: faça commits pequenos com mensagens claras em português, e no fim me diga o que funciona, o que falta e como testar.

## 7. Pronto quando

- Abro `/criar`, escolho o tema, edito 5 perguntas, coloco nome, cor e logo, e abro a sala.
- Em 3 celulares, entro pelo link do WhatsApp, respondo, e vejo pontos e posição corretos.
- A TV mostra pergunta, revelação, ranking, pódio e sorteio, sem precisar recarregar.
- Um jogador que fecha e reabre o navegador volta para a mesma sala com os pontos.
- `npm run deploy` publica tudo no Cloudflare.

## 8. Material de referência

Já tenho um protótipo funcionando dentro do site da Rodada (página `quiz.html`) com a mesma mecânica, temas, marca e sorteio. Se eu colar o código dele aqui, use como referência de comportamento e de textos, mas reescreva na arquitetura acima.
