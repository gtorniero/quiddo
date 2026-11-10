# PDF no Quiddo — integração autorizada em 09/11/2026

Gui autorizou explicitamente incluir PDF e publicar, substituindo a limitação anterior de staging. Código do piloto integrado à biblioteca e ao telão atuais. O caminho de produção exige sessão real, mensal Stripe efetivamente pago, ciclo vigente e identidade conferida no servidor; não aceita cupom, anual ou fixture. Dois créditos por ciclo, com reserva idempotente, isolamento por conta e preservação de crédito em falhas.

As novas classes PdfAccount e PdfBudget são aditivas; Room e bases existentes são preservadas. Nenhuma chave, banco ou documento de cliente está neste PR. A dependência pdf-lib foi minificada sem mudança de API; licença e hashes em vendor/.

A interface inclui PDF, mas geração retorna indisponível e não consome crédito até existir OPENAI_API_KEY de produção e PDF_BUDGET_USD positivo. Verificados apenas os nomes dos secrets no painel: a chave OpenAI não estava configurada. Não reutilizar a chave temporária expirada do piloto. O limite herdado é estrito: no máximo USD 1 e 8 chamadas; não é uma política de escala aprovada. Não elevar esse limite silenciosamente.

Validação: 156 testes da aplicação, tipagens frontend/Worker/cobrança e build aprovados. Testes PDF com PDFs sintéticos e runtime isolado cobrem duas entregas, renovação, reentrega, concorrência, falhas e isolamento. Não equivalem a uma nova geração real, calibração completa ou entrega automática nova de webhook do Stripe. Oito PDFs de calibração continuam pendentes.

Para ativar geração: configurar credencial própria por canal seguro, confirmar limite de uso e concluir teste real controlado/fluxo de assinatura. Nenhuma compra de créditos ou recarga automática está autorizada por este documento.


## Revisão do orçamento e da qualidade

O limite de oito chamadas do piloto é substituído por um teto persistente de US$1, sem reinício por deploy/renovação. Reserva conservadora antes da chamada e custo desconhecido retido; dois créditos mensais por assinante preservados. Status considera disponibilidade do orçamento. Limites inválidos falham fechados; valores acima de US$1 são limitados a US$1.

Cabeçalhos opcionais OpenAI são omitidos quando não configurados. Prompt v3 reforça perguntas distintas por objetivo e distingue regras vigentes de histórico. Calibração real do v3 ainda pendente. Credencial de produção não está neste código; sem configuração válida, a geração permanece indisponível.

Validação: 156 testes da aplicação, 8 testes PDF isolados, tipagens e build. Testes novos cobrem mais de oito chamadas pequenas, limites inválidos, reserva concorrente e custo desconhecido; não fazem chamadas pagas. Ativação depende de credencial válida e validação real do fluxo.
