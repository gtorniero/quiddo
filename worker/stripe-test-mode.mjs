export function stripeTestKey(env) {
  const key=String(env.STRIPE_KEY||'').trim();
  return /^[sr]k_test_/.test(key) || (
    env.COBRANCA==='simulacao' && env.PDF_STAGE==='isolated' &&
    env.PDF_STRIPE_TEST==='true' && /^rkcs_/.test(key)
  );
}
