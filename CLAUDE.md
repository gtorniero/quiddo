# Quiddo

Quiz ao vivo para grupos. Vite + TypeScript no site (`src/`), Cloudflare Worker + Durable Object por sala (`worker/`), regras do jogo compartilhadas e testadas (`shared/`, `tests/`). Leia `README.md` e `docs/briefing.md` antes de mudar o produto.

## Regras

- Tudo em português do Brasil, frases curtas e diretas. Nada de texto em inglês na interface.
- Nunca use o nome, logo, formas, cores ou sons do Kahoot. Respostas são identificadas por letras A, B, C, D.
- O servidor é a fonte da verdade: estado absoluto, tempo medido no servidor, resposta certa só depois da revelação.
- Lógica de jogo nova entra em `shared/game.ts` com teste em `tests/`.
- Acessibilidade: contraste 4.5:1 (texto grande 3:1), botões de no mínimo 44–48 px, foco visível, `prefers-reduced-motion`, funcionar em 360 px.
- Rodapé: "© 2026 Quiddo" e "um projeto Beyond the Work".
- Trabalhe numa branch e abra pull request.

## Antes de abrir pull request

`npm run typecheck && npm test && npm run build`. Se mexeu na sala ou no protocolo, rode também `npm run dev` e `npm run simular`.
