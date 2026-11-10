# PDF no Quiddo — integração autorizada em 09/11/2026

Gui autorizou explicitamente incluir PDF e publicar, substituindo a limitação anterior de staging. Código do piloto integrado à biblioteca e ao telão atuais. O caminho de produção exige sessão real, mensal Stripe efetivamente pago, ciclo vigente e identidade conferida no servidor; não aceita cupom, anual ou fixture. Dois créditos por ciclo, com reserva idempotente, isolamento por conta e preservação de crédito em falhas.

As novas classes PdfAccount e PdfBudget são aditivas; Room e bases existentes são preservadas. Nenhuma chave, banco ou documento de cliente está neste PR. A dependência pdf-lib foi minificada sem mudança de API; licença e hashes em vendor/.

A interface inclui PDF, mas geração retorna indisponível e não consome crédito até existir OPENAI_API_KEY de produção e PDF_BUDGET_USD positivo. Verificados apenas os nomes dos secrets no painel: a chave OpenAI não estava configurada. Não reutilizar a chave temporária expirada do piloto. O limite herdado é estrito: no máximo USD 1 e 8 chamadas; não é uma política de escala aprovada. Não elevar esse limite silenciosamente.

Validação: 156 testes da aplicação, tipagens frontend/Worker/cobrança e build aprovados. Testes PDF com PDFs sintéticos e runtime isolado cobrem duas entregas, renovação, reentrega, concorrência, falhas e isolamento. Não equivalem a uma nova geração real, calibração completa ou entrega automática nova de webhook do Stripe. Oito PDFs de calibração continuam pendentes.

Para ativar geração: configurar credencial própria por canal seguro, confirmar limite de uso e concluir teste real controlado/fluxo de assinatura. Nenhuma compra de créditos ou recarga automática está autorizada por este documento.
