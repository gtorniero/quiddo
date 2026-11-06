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
