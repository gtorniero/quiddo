# Uma assinatura Premium

Decisão de Gui em 10/11/2026: Mensal e Anual têm exatamente os mesmos benefícios. São duas frequências de pagamento da mesma assinatura.

Nos dois: salas de até 200 pessoas, jogos ilimitados, acesso em qualquer aparelho e 5 créditos de texto + 2 de PDF a cada mês. Os saldos são separados por tipo, não acumulam e usam as mesmas regras de geração, histórico e repetição. No pagamento anual, os créditos renovam mensalmente durante o ano já pago, sem uma nova cobrança mensal.

Preços mantidos: R$15,99 por mês ou R$156 por ano. O Passe 7 dias permanece R$12,99 e o grátis continua com até 10 pessoas. O limite de gasto de IA e seu histórico são preservados.

A cota do Premium fica em `shared/ai-credits.mjs`, usada pelo servidor e pela página de planos. `LEGACY_SHARED_AI_CREDITS` serve somente à compatibilidade do modo antigo, desativado em produção; não define um benefício do Anual. Nenhuma frequência de cobrança pode ter uma cota comercial própria.

Validação: consumo e reposição de 5 textos e 2 PDFs em ambas as frequências, webhook assinado até o saldo, renovação mensal do Anual sem outra fatura, preservação de débitos antigos e comparação dos benefícios exibidos nos dois seletores da página de planos. As gerações e pagamentos de teste são isolados.

Esta decisão substitui as regras de cotas diferentes descritas em registros históricos anteriores.
