# Uma assinatura Premium

Decisão de Gui em 10/11/2026: Mensal e Anual têm exatamente os mesmos benefícios. São duas frequências de pagamento da mesma assinatura.

Nos dois: salas de até 200 pessoas, jogos ilimitados, acesso em qualquer aparelho e 5 créditos de texto + 2 de PDF a cada mês. Os saldos são separados por tipo, não acumulam e usam as mesmas regras de geração, histórico e repetição. No pagamento anual, os créditos renovam mensalmente durante o ano já pago, sem uma nova cobrança mensal.

Preços mantidos: R$15,99 por mês ou R$156 por ano. O Passe 7 dias permanece R$12,99 e o grátis continua com até 10 pessoas. O limite de gasto de IA e seu histórico são preservados. Os valores ficam só em `shared/precos.mjs` (`PRECOS`), usado pelo servidor, pelo site, pelas páginas pré-renderizadas e pela conferência da assinatura do Quiz com IA.

A cota do Premium fica em `shared/ai-credits.mjs`, usada pelo servidor e pela página de planos. `LEGACY_SHARED_AI_CREDITS` serve somente à compatibilidade do modo antigo, desativado em produção; não define um benefício do Anual. Nenhuma frequência de cobrança pode ter uma cota comercial própria.

Validação: consumo e reposição de 5 textos e 2 PDFs em ambas as frequências, webhook assinado até o saldo, renovação mensal do Anual sem outra fatura, preservação de débitos antigos e comparação dos benefícios exibidos nos dois seletores da página de planos. As gerações e pagamentos de teste são isolados.

Esta decisão substitui as regras de cotas diferentes descritas em registros históricos anteriores.

## Grátis simples, marca no pago (14/11/2026)

Decisão de Gui em 14/11/2026: a versão grátis fica bem simples. Logo e cor da marca (a "marca própria", nos modos Corporativo e Escola) passam a ser benefício pago, no Passe 7 dias e na Assinatura Premium, igual no Mensal e no Anual. O nome do quiz (o do evento) continua grátis. Preços e o limite de 10 pessoas do grátis não mudaram.

| | Grátis | Passe 7 dias | Premium (Mensal ou Anual) |
| --- | --- | --- | --- |
| Pessoas por sala | até 10 | até 200 | até 200 |
| Quizzes e jogos | ilimitados | ilimitados por 7 dias | ilimitados |
| Modos, visuais, pódio e sorteio | sim | sim | sim |
| Nome do quiz na tela | sim | sim | sim |
| Logo e cor da marca | não, cores do Quiddo | sim | sim |
| Quiz com IA | não | não | 5 de texto e 2 de PDF por mês |

A regra fica em `marcaPropria` (`shared/rules.ts`) e é aplicada pelo servidor em `marcaDaSala` (`shared/game.ts`): a sala só mostra logo e cor, e só serve o logo, quando está liberada (Passe, Premium ou cobrança que não vale). Salas grátis com marca salva continuam abrindo, com as cores do Quiddo; se o anfitrião liberar com a sala aberta, a marca aparece na hora. No editor, a marca aparece com cadeado, "Disponível no Passe e no Premium" e o link para os planos.
