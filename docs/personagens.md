# Personagens: como o jogador escolhe

Cada jogador entra na sala como um **bicho do Brasil**, montado em segundos no celular.

## A regra

**Um bicho + até 1 item na cabeça + até 1 item no rosto + uma cor de fundo.**

- **20 bichos:** tucano, capivara, onça, preguiça, arara, mico-leão, tamanduá, tatu, boto, jacaré, lobo-guará, quati, sapo, coruja, jabuti, papagaio, bem-te-vi, caramelo, gato, peixe-boi.
- **10 itens de cabeça:** boné, chapéu de palha, coroa, laranja, flor, fone, chapéu de festa, gorro, faixa, cartola.
- **5 itens de rosto:** óculos escuros, óculos redondos, óculos de coração, bigode, adesivo de estrela.
- **10 cores de fundo.**
- Total: 20 × 11 × 6 × 10 = **13.200 combinações**.

No máximo um item de cada tipo, para o avatar continuar legível pequeno (no ranking ele aparece com 36 px).

## O fluxo (menos de 10 segundos)

Tudo numa tela só, na entrada da sala (`/{CODIGO}`):

1. **Escolha o bicho** na grade de 20. O celular já abre com um bicho sorteado (ou o último que a pessoa usou).
2. **Monte o visual:** cabeça, rosto e cor, ou o botão **Sortear**.
3. **Apelido:** o site sugere um nome a partir do visual ("Capivara de Boné"). Se a pessoa não mexer no campo, a sugestão acompanha as trocas; se escrever outro apelido, ele fica.
4. **Entrar na sala.**

## Regras na sala

- Se dois jogadores montarem exatamente o mesmo visual, o servidor troca a cor de fundo do segundo para a próxima livre.
- Quem cai e volta para a sala mantém o personagem.
- O último personagem fica salvo no navegador para a próxima rodada.

## Onde aparece

- Celular do jogador: na sala de espera, em tamanho grande.
- Tela do anfitrião: ao lado do apelido na lista de quem entrou.
- Ranking, pódio e classificação final.

## No código

- O avatar viaja como texto curto `bicho.cabeca.rosto.cor`, com `-` para "nenhum". Ex.: `capivara.bone.escuros.5`.
- Regras, validação e troca de cor: `shared/avatar.ts` (testado em `tests/avatar.test.ts`).
- Desenhos em SVG: `src/lib/avatar-art.ts` (`avatarSvg(avatar, tamanho)`).
- Protocolo: `join` aceita `avatar`; `RankRow`, a lista de jogadores do anfitrião e `me` trazem `avatar`. Avatar inválido vira o padrão (`tucano.-.-.0`).

Referência visual: `docs/marca/referencias/escolha-de-personagem.png` e `docs/marca/referencias/100-personagens.png`.
