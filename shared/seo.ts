// Páginas que não devem aparecer na busca: medição, conta, login, telas de partida e pagamento.
// O servidor manda "X-Robots-Tag: noindex" nelas; o site também marca a página com <meta name="robots">.
export function naoIndexar(path: string): boolean {
  const p = path.replace(/\/+$/, '') || '/';
  return (
    /^\/medicao(?:\.html|-vendor\.js)?$/.test(p) ||
    ['/conta', '/entrar'].includes(p) ||
    p.startsWith('/host/') ||
    p.startsWith('/pagar/') ||
    p.startsWith('/promocoes') ||
    /^\/[A-Za-z0-9]{4}$/.test(p)
  );
}
