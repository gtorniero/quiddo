# Meta Conversions API — quiddo

Prepared 2026-11-06. Not activated by this change.

Target pixel: 39663521416595790. Worker: quiddo. No new ad accounts or paid vendors.

## Activation

After owner approval, store META_CAPI_TOKEN as an encrypted Cloudflare Worker secret, restricted to this dataset; never commit it or put it in frontend code. Select the normal CAPI token without the extra Dataset Quality API scope. Set META_GRAPH_VERSION=v26.0, META_EMAIL_MATCHING=true and only then META_CAPI_ENABLED=true. Undefined/false disables delivery and capture. Existing bindings and payment credentials must be preserved. API v26 supported by Meta Business SDK release v26.0.0 (official release notes).

The server sends Purchase only from confirmed live paid records, positive amount, consent recorded before payment, and the same hashed event ID used by the existing browser pixel. Test orders, promotional access, pending/expired/revoked payments do not send. Eight browser custom events were already confirmed separately; this change does not enable Meta automatic events or advanced automatic matching.

## Privacy

A new explicit choice is required for server delivery; existing pixel cookie permission does not automatically opt anyone in. Payload: Purchase, original payment time, hashed transaction ID, value/BRL, fixed public source URL, permitted fbp/fbc if available and SHA-256 normalized customer email when email matching is enabled. A hash remains personal/pseudonymous data. No raw email, card data, report, quiz answer, private URL, access code, IP or user-agent is sent by this integration. The random privacy reference is never sent to Meta and grants no access to products or financial records. It allows revocation across tabs and official subdomains, even after closing checkout. Data is processed only for this brand.

Revocation cancels queued events once received; it cannot withdraw a request already delivered. No automatic replay/backfill of purchases made before this feature. The founder's earlier three purchases must not be reclassified as new CAPI sales.

## Reliability and tests

A D1 outbox and delivery lease prevent concurrent duplicates; retries retain the event ID and stop after 24 hours from payment or queue creation, whichever comes first. Every five minutes, the server reconciles eligible records and retries transient failures. Permanent API errors stop the affected event as rejected, rather than claiming success. Only events_received=1 marks sent. Refunded/revoked pending rows cancel before delivery. Payload is scrubbed on success, cancellation or after seven days; consent/matching data expires after seven days. Sent IDs/status remain for deduplication.

No token is configured by these files. Unit/integration tests use fake providers and in-memory SQLite, not production purchases. Node 24 (node:sqlite) is used for the queue tests. The local test-connection script requires --test-only, an explicit Meta TEST code, and a private temporary token file; it only sends to the Meta test channel and removes the token file. It never reads production orders or D1. Production delivery ignores test-event configuration.

## Rollback

Set META_CAPI_ENABLED=false to stop capture/delivery immediately. Keep the browser pixel and payment system. Preserve the queue to investigate; never replay rejected/expired events or change event IDs merely to force acceptance. No campaign is activated by this change.

## Private server connection check

An owner may temporarily set META_CAPI_TEST_CODE to the code shown in Meta Test Events. Only the scheduled job uses it, with synthetic fixture data and a mandatory test_event_code field. It never reads orders, creates access or emits a production conversion. A bounded D1 status record in btw_meta_probe confirms HTTP/events_received, without tokens or payloads. One accepted probe per brand/code is sent. Remove the test code after verification. Normal purchase delivery never uses this test code.

## Atualização 14/11/2026 (branch growth/medicao-e-assinatura)

**Por que a Meta mostra 0 eventos de servidor.** A integração existe e está ligada ao código (consentimento capturado em `/api/pix`, `/api/cartao` e na assinatura; envio em todo pedido e no cron de 5 minutos). Tudo depende de `META_CAPI_ENABLED` igual a `true` no painel: sem isso, nem o consentimento é guardado, então nenhuma compra fica elegível. A variável não está no `wrangler.jsonc` (só em `previews`, como `false`) e o deploy usa `keep_vars`, então o valor de produção é o do painel. Para enviar, também precisam existir o secret `META_CAPI_TOKEN` e `META_GRAPH_VERSION` no formato `v26.0`. Mesmo ligado: não há envio retroativo; só entram compras feitas depois, por quem clicou em Aceitar antes de pagar, com `_fbp`/`_fbc` ou com `META_EMAIL_MATCHING=true`; promoções e simulações não entram. Com 1 compra no pixel no último mês, o volume esperado é muito baixo.

Conferência sem alterar nada (D1 `quiddo`, console): `SELECT name FROM sqlite_master WHERE name LIKE 'btw_meta%';` (sem tabelas = a flag nunca esteve ligada) e `SELECT state, COUNT(*) FROM btw_meta_outbox GROUP BY state;`.

**Variáveis (Workers & Pages → quiddo → Settings → Variables and Secrets):**

| Nome | Tipo | Para quê |
| --- | --- | --- |
| `META_CAPI_TOKEN` | Secret | Token da Conversions API do dataset 39663521416595790 |
| `META_GRAPH_VERSION` | Texto | Versão da Graph API (formato `v26.0`) |
| `META_EMAIL_MATCHING` | Texto (`true`) | Envia o e-mail da compra com hash SHA-256 |
| `META_CAPI_ENABLED` | Texto (`true`) | Liga a captura do consentimento e o envio da compra (por último) |
| `META_CAPI_SUBSCRIBE` | Texto (`true`, opcional) | Acrescenta Subscribe na primeira cobrança da assinatura, mesmo event_id da compra |
| `META_CAPI_LEAD` | Texto (`true`, opcional) | Envia o Lead da primeira sala aberta no navegador (só `_fbp`/`_fbc`, sem e-mail) |
| `META_CAPI_TEST_CODE` | Texto (temporário) | Só para o teste no Gerenciador de Eventos; remover depois |

Todas ausentes = desligado. Nada disso é ligado por este código.

**O que mudou no servidor:** `custom_data` da compra leva `content_ids` (`qd-anual`, `qd-mensal`, `qd-passe7`), `content_type` e `content_category` (o plano). Uma linha da fila pode levar Purchase + Subscribe e só é marcada como enviada se a Meta receber os dois. O Lead usa o id `lead:<uuid>` na mesma fila, com consentimento próprio, e não é cancelado pela conferência das compras; a revogação continua cancelando tudo que está pendente. Não enviamos IP, user agent nem `external_id`, porque o aviso e a política não prometem isso.
