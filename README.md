# Quiddo

Quiz ao vivo para grupos. O anfitrião cria o quiz com as próprias perguntas, abre uma sala com um código de 4 letras, a turma entra pelo celular sem cadastro e todo mundo responde ao mesmo tempo. Quem acerta mais rápido ganha mais pontos, o ranking aparece depois de cada pergunta e no fim tem pódio e sorteio de prêmios.

Um projeto Beyond the Work.

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
| `/` | Home: o que é, como funciona, os dois temas |
| `/criar` | Editor do quiz: Meus quizzes, tema (Corporativo, Amigos & família, Escola), tempo de cada pergunta, Sua marca (só Corporativo e Escola), perguntas, abrir a sala |
| `/host/{CODIGO}` | Tela do anfitrião, para a TV ou o projetor |
| `/{CODIGO}` | Entrada e tela do jogador |
| `/entrar` | Digitar o código da sala |
| `/guias` e `/guias/{slug}` | Guias. Os textos ficam em `src/data/guias.ts` |

Na tela do anfitrião, a seta para a direita, Page Down ou espaço avançam o jogo. Isso faz o passador de slides funcionar.

## Personagens

Cada jogador escolhe um bicho do Brasil com até dois itens (cabeça e rosto) e uma cor de fundo. Veja `docs/personagens.md`. O guia de identidade visual está em `docs/marca/BRAND.md`.

## Como é feito

- **Site**: Vite + TypeScript, sem framework. `src/`
- **Servidor**: um Cloudflare Worker (`worker/index.ts`) serve o site e a API. Cada sala é um Durable Object (`worker/room.ts`) que guarda perguntas, jogadores, respostas e pontos, mede o tempo das respostas e manda o estado por WebSocket. A sala é apagada 2 horas depois do fim, ou 12 horas depois de aberta.
- **Regras do jogo**: `shared/game.ts` (fases, pontos, ranking, sorteio) e `shared/rules.ts` (limites, códigos, validação). São usadas pelo servidor e testadas em `tests/`.
- **Protocolo**: `shared/protocol.ts`. Mensagens JSON com `type`. O servidor manda sempre o estado completo, e o jogador nunca recebe a resposta certa antes da revelação.

Pontos: errou ou não respondeu, 0. Acertou: `round(500 + 500 × max(0, 1 − tempo / limite))`, de 500 a 1000. O tempo é medido no servidor e o anfitrião escolhe um tempo único para todas as perguntas: 10, 15, 20 ou 30 segundos (padrão 20). A rapidez sempre vale ponto.

Cada pergunta pode ser de múltipla escolha (2 a 4 respostas) ou de verdadeiro ou falso, e pode ter uma imagem (reduzida no navegador para até 960×540; aparece na TV e nos celulares).

Depois de cada pergunta o ranking mostra as moedinhas entrando, o placar subindo e quem trocou de posição. No fim, o pódio é revelado do 3º para o 1º lugar, com suspense, e o "modo foto" deixa só o pódio na tela.

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

### Caminho alternativo: publicar do seu computador

```bash
npx wrangler login   # abre o navegador para autorizar
npm run deploy
```

### Ligar o seu domínio

1. No painel do Cloudflare, em **Add a domain**, adicione o domínio (ex.: `quiddo.com.br`) e troque os servidores DNS no registro.br pelos dois que o Cloudflare mostrar. Leva de minutos a algumas horas.
2. Em **Workers & Pages → quiddo → Settings → Domains & Routes → Add → Custom domain**, digite `quiddo.com.br` (e, se quiser, `www.quiddo.com.br`).
3. O Cloudflare cria o certificado HTTPS sozinho.

## Referência

- `docs/briefing.md`: o briefing do produto.
- `docs/referencia/prototipo-quiz.html`: o protótipo "Sua Rodada", que rodava dentro do site da Rodada. Só para consulta, não funciona fora de lá.

## Fora do MVP, por enquanto

Contas e login, quizzes na nuvem, plano pago (grátis até 10 jogadores), gerar perguntas a partir de PDF, personagens e nova identidade visual, perguntas com imagem, modo equipes, relatório.
