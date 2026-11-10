# PDF no Quiddo — ativação e validação

A geração exige sessão real e assinatura mensal Stripe paga no ciclo vigente. Dois créditos por ciclo, reserva idempotente e isolamento por conta. Anual, cortesia e cobrança não paga não dão acesso. Bases existentes são preservadas; credenciais ficam somente no servidor.

O limite de oito chamadas do piloto foi substituído por teto persistente de US$1, sem reinício em deploy ou renovação. Reserva conservadora antes da chamada; custo desconhecido mantém a reserva. Limites inválidos falham fechados e valores acima de US$1 são limitados a US$1. Não há compra nem recarga automática por esta integração.

Cabeçalhos opcionais OpenAI são omitidos quando ausentes. Prompt v3 pede objetivos distintos e distingue regras vigentes de histórico.

Validação em 10/11/2026: 156 testes da aplicação, oito testes PDF isolados, tipagens e build aprovados. Teste com Responses real e PDF fictício de duas páginas gerou sete perguntas, revisadas contra a fonte, por US$0.0003461 estimados pelo uso retornado. Salvamento e reabertura em nova sessão preservaram respostas e referências; repetição idempotente não gerou nova chamada; outra conta recebeu acesso negado.

O teste real de modelo usou armazenamento isolado e elegibilidade de cobrança simulada. Não representa compra real nem validação nova de entrega automática de webhook Stripe. Calibração ampla em diferentes documentos permanece pendente. Nenhum documento de cliente ou segredo está no repositório.
