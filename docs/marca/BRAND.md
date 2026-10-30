# Quiddo · Guia de identidade visual

> **Quizz do seu jeito**

> **Neste repositório:** os personagens já estão implementados (`shared/avatar.ts`, `src/lib/avatar-art.ts`, ver `docs/personagens.md`), então o `avatar.js` e a pasta `personagens/` citados abaixo não vêm junto.
> As regras do `CLAUDE.md` valem por cima deste guia: respostas sempre com as letras A, B, C, D (o símbolo entra ao lado da letra).
> **Aplicado no site:** as respostas usam **A folha verde, B sol laranja, C gota azul, D flor vermelha** (`src/lib/simbolos.ts` e `--a1` a `--a4` em `src/styles.css`). A tabela de respostas mais abaixo (vermelho, azul, amarelo, verde) ficou antiga: aquela ordem coincide com as cores do Kahoot e não deve ser usada.

Este guia serve para o Claude Code aplicar a marca no site. Arquivos deste kit:

```
quiddo-brand/
├── BRAND.md            ← este guia
├── tokens.css          ← cores, fontes, bordas e sombras como variáveis CSS
├── avatar.js           ← gerador de avatares (bicho + itens + cor)
├── simbolos/          ← flor, gota, sol e folha (símbolos das respostas)
├── logo/               ← logos em SVG (letras já convertidas em curvas; não dependem de fonte)
├── personagens/
│   ├── bichos/         ← os 20 bichos sem acessórios
│   └── repositorio/    ← 100 avatares prontos + index.json
└── referencias/        ← imagens das telas, do pódio e dos componentes (referência visual)
```

**Instrução para o Claude Code:** importe `tokens.css` no CSS global, carregue as fontes abaixo, use os SVGs de `logo/` como arquivos (não redesenhe) e monte os avatares com `avatar.js`. As imagens em `referencias/` mostram como cada tela deve ficar; siga-as.

---

## 1. Conceito

O Quiddo é o quiz brasileiro em que **cada pessoa monta o seu próprio show**: cria as perguntas, chama a galera e joga ao vivo ou no seu tempo. Os jogadores viram **bichos do Brasil** que correm para o pódio.

Tom: divertido, caloroso, brasileiro, para adultos. Nada infantil demais, nem corporativo frio. Pense em jogo de tabuleiro bem feito, não em desenho animado.

## 2. Logo

O logo é o **letreiro "Quidd" em Fraunces 900**: cada letra solta, levemente girada e de uma cor, com contorno fino e sombra dura em verde-tinta. O "o" final é o **olho do tucano**, o elemento mais reconhecível da marca.

| Arquivo | Uso |
|---|---|
| `logo/quiddo-cor.svg` | Principal. Fundos claros (creme ou branco). |
| `logo/quiddo-cor-slogan.svg` | Principal com slogan: home, hero e materiais de divulgação. |
| `logo/quiddo-uma-cor.svg` / `-slogan` | Uma cor (#0E2A22): impressão, carimbo, rodapé, marca d'água. |
| `logo/quiddo-negativo.svg` / `-slogan` | Creme sobre fundo escuro (verde-mata #0B5D45 ou tinta #0E2A22). |
| `logo/quiddo-icone.svg` | Ícone do app, favicon e foto de perfil: o olho do tucano em fundo creme. |
| `logo/quiddo-icone-amarelo.svg` | Ícone alternativo para fundos que pedem mais contraste. |

**Regras**
- Respeite uma área de respiro ao redor do logo igual à altura do "i".
- Tamanho mínimo: logo colorido com 120px de largura na tela; abaixo disso, use o de uma cor ou o ícone.
- Não mude as cores das letras, não endireite as letras, não engrosse o contorno e não troque a fonte.
- Não coloque o logo colorido sobre fotos ou fundos coloridos; nesses casos, use o negativo.
- No header do site, use o logo sem slogan; no hero da home, use o logo com slogan.

## 3. Slogan

**Quizz do seu jeito**. Nunito 800, cor tinta (ou creme no negativo), centralizado abaixo do logo. Também vale no `<title>` da home: `Quiddo · Quizz do seu jeito`.

## 4. Cores

Cada letra do logo tem uma cor, e essas cinco formam a paleta principal.

| Nome | Hex | Variável | Onde usar |
|---|---|---|---|
| Verde | `#13A07A` | `--q-verde` | Botão principal, acertos, sucesso |
| Laranja | `#FF7A1A` | `--q-laranja` | Destaques, selos, "novo", 3º lugar |
| Amarelo | `#FFC83D` | `--q-amarelo` | 1º lugar, timer, títulos com contorno |
| Vermelho | `#E5383B` | `--q-vermelho` | Erro, "ao vivo", tempo acabando |
| Azul | `#1E7FD6` | `--q-azul` | Links, informação |
| Céu | `#5BC0EB` | `--q-ceu` | Apoio (íris do olho) |
| Tinta | `#0E2A22` | `--q-tinta` | Texto, contornos, sombras |
| Creme | `#FFF6E6` | `--q-creme` | Fundo principal do site, 2º lugar |
| Mata | `#0B5D45` | `--q-mata` | Fundo do telão e de telas de jogo |
| Branco | `#FFFFFF` | `--q-branco` | Cartões |

O texto sobre o amarelo e o laranja é sempre tinta (#0E2A22), nunca branco.

## 5. Tipografia

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,900;1,9..144,900&family=Nunito:wght@600;800&family=Atkinson+Hyperlegible:wght@400;700&family=Literata:opsz,wght@7..72,400;7..72,700&display=swap" rel="stylesheet">
```

| Papel | Fonte | Peso | Variável |
|---|---|---|---|
| Títulos, placar, contagem regressiva, números do pódio | Fraunces | 900 (itálico para destaque) | `--q-font-display` |
| Interface: perguntas, respostas, botões, rótulos | Nunito | 600 texto · 800 botões | `--q-font-body` |
| Modo acessível e perguntas longas | Atkinson Hyperlegible | 400 · 700 | `--q-font-leitura` |
| Artigos e guias do blog | Literata | 400 · 700 | `--q-font-artigo` |

Escala: display 56px · título 36px · pergunta no telão 26–34px · botão 18px · texto 16px · legenda 13px.
Opções de leitura avaliadas e não adotadas como padrão: Lexend e Figtree (podem substituir a Nunito se o produto ficar mais "ferramenta").

## 6. Forma e estilo

- **Contorno grosso e sombra dura** em tinta, nunca sombra borrada: `border: 3px solid #0E2A22; box-shadow: 0 6px 0 #0E2A22`.
- Cantos bem arredondados: 22px em cartões, 999px em botões.
- Botão "afunda" ao clicar (sombra some, botão desce 4px).
- Pequenas rotações (entre -6° e 6°) em selos, figurinhas e avatares dão o mesmo jeito solto do logo; não use em textos longos.
- Fundo padrão creme; telão e telas de jogo ao vivo usam mata.
- Padrão de fundo: flor, gota, sol e folha espalhados (ver `referencias/elementos.png`).

Componentes de referência em `referencias/elementos.png`: botões (primário, secundário, destaque, perigo, pressionado, desabilitado, ícone), campos, toggles, checkbox, selos, timer do olho do tucano, pista de progresso, fichas de resposta, chip de jogador, toast, card de quiz e padrão de fundo.

## 7. Personagens

**Sistema:** cada jogador monta o avatar com **um bicho + até 1 item de cabeça + até 1 item de rosto + uma cor de fundo**. Ver `referencias/escolha-de-personagem.png`.

- **20 bichos:** tucano, capivara, onça, preguiça, arara, mico-leão, tamanduá, tatu, boto, jacaré, lobo-guará, quati, sapo, coruja, jabuti, papagaio, bem-te-vi, caramelo, gato, peixe-boi.
- **10 itens de cabeça:** boné, chapéu de palha, coroa, laranja, flor, fone, chapéu de festa, gorro, faixa, cartola.
- **5 itens de rosto:** óculos escuros, óculos redondos, óculos de coração, bigode, adesivo de estrela.
- **10 cores de fundo** (`--q-av-0` a `--q-av-9`).
- Total: 13.200 combinações. As **100 do repositório** (`personagens/repositorio/`, lista em `index.json`) aparecem primeiro, como "prontos".

**Fluxo de escolha (menos de 10 segundos):**
1. Escolha o bicho (grade de 20).
2. Monte o visual: cabeça, rosto e cor, ou o botão **🎲 Sortear**.
3. Apelido: o site sugere um nome a partir do visual ("Capivara de Boné"), e o jogador pode trocar.

**Regras de sala:** se dois jogadores montarem o mesmo visual, o sistema troca a cor de fundo do segundo automaticamente. O host pode usar "sortear para todos" para acelerar.

**No código:** o avatar é guardado como texto curto `bicho.cabeça.rosto.cor` (ex.: `capivara.bone.escuros.5`, com `-` para "nenhum"). Ele viaja leve na sala ao vivo e é desenhado no navegador:

```js
// <script src="/quiddo-brand/avatar.js"></script>
const a = QuiddoAvatar.decode('capivara.bone.escuros.5');
el.innerHTML = QuiddoAvatar.render(a, { size: 96 });   // <svg> com círculo, fundo e contorno
QuiddoAvatar.nome(a);    // "Capivara de Boné"
QuiddoAvatar.sortear();  // avatar aleatório
```

O tucano é o mascote principal (o olho dele está no logo); a capivara com a laranja na cabeça é o segundo mascote.

## 8. Telas do jogo

Referências: `referencias/tela-pergunta.png`, `referencias/celular-jogador.png`, `referencias/sala-e-placar.png`.

**Alternativas de resposta:** sempre nesta ordem, cada uma com uma cor do logo e um **símbolo da natureza brasileira** (SVGs em `simbolos/`). Cor + símbolo funcionam também para quem não distingue cores.

| # | Cor | Símbolo | Texto |
|---|---|---|---|
| 1 | Vermelho `#E5383B` | Flor (`simbolos/flor.svg`) | branco |
| 2 | Azul `#1E7FD6` | Gota (`simbolos/gota.svg`) | branco |
| 3 | Amarelo `#FFC83D` | Sol (`simbolos/sol.svg`) | tinta |
| 4 | Verde `#13A07A` | Folha (`simbolos/folha.svg`) | branco |

Para não parecer Kahoot: **não** use triângulo, losango, círculo e quadrado, nem blocos chapados em grade 2×2.

- **Fichas de resposta:** cartões soltos, levemente girados (-2°, 1,5°, -1°, 2°), com contorno e sombra dura. No canto, o símbolo num selo redondo escuro; embaixo, o texto da resposta; o símbolo grande e translúcido como marca d'água.
- **Telão (16:9, fundo mata):** a pergunta num cartão branco levemente torto; o **timer é o olho do tucano** com o número no centro; a imagem no meio; à direita, os avatares de quem já respondeu ("8 de 12 já foram"); embaixo, as 4 fichas lado a lado.
- **Celular:** as 4 fichas **empilhadas** (uma por linha, grandes para o polegar), só com o símbolo, mais o código da sala, o progresso e o chip do jogador com a pontuação. Acertou: tela verde, "Mandou bem!", pontos e sequência. Errou: tela vermelha, "Quase!" e a ficha certa.
- **Progresso:** uma "pista" até o pódio, com o avatar do jogador correndo sobre a barra e a bandeira no fim.
- **Sala de espera (telão):** código grande, QR code e os jogadores entrando como figurinhas tortas. Botão "Começar" amarelo.
- **Placar entre perguntas:** top 5 com setas de quem subiu ou caiu; 1º lugar em amarelo.

## 9. Pódio

Referência: `referencias/podio.png`.

- Três degraus com contorno tinta: **1º amarelo** (mais alto, centro), **2º creme** (esquerda), **3º laranja** (direita), número em Fraunces 900.
- O avatar de cada jogador fica em cima do degrau, com nome e pontos. Confete com as cores da marca.
- Medalhas 1, 2 e 3 e troféu amarelo para o perfil e o histórico.
- **Card para compartilhar (9:16):** fundo amarelo, logo, "Fulano venceu o quiz", avatar, posição e pontos, e "Monte o seu em quiddo.com.br". Botão "Compartilhar no WhatsApp".

## 10. Voz

- Fala como amigo, em português do Brasil, com "você".
- Frases curtas e animadas: "Bora!", "Mandou bem!", "Quase! Na próxima vai."
- Nunca humilhe quem errou; brinque junto.
- Exemplos: "Monte o seu quiz", "Chame a galera", "Quem chega primeiro no pódio?"
