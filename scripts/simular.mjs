// Simula uma partida inteira: 1 anfitrião e N jogadores entrando e respondendo numa sala.
// Uso: npm run simular -- [endereço] [jogadores] [perguntas]
//      npm run simular -- http://localhost:5173 200 5
// Precisa do Node 22 ou mais novo (WebSocket nativo).

const base = (process.argv[2] || 'http://localhost:5173').replace(/\/$/, '');
const N = Number(process.argv[3] || 200);
const NQ = Number(process.argv[4] || 5);
const wsBase = base.replace(/^http/, 'ws');

const questions = Array.from({ length: NQ }, (_, i) => ({ t: `Pergunta de teste ${i + 1}?`, o: ['A certa', 'Errada 1', 'Errada 2', 'Errada 3'], c: 0, tl: 10 }));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s]`, ...a);

const r = await fetch(base + '/api/salas', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ questions, theme: 'corp', brand: { name: 'Simulação', color: '' }, logo: '' }),
});
const { code, hostKey } = await r.json();
if (!code) throw new Error('Não abriu a sala: ' + r.status);
log(`Sala ${code} aberta. Conectando ${N} jogadores…`);

function connect(hello, onState) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${wsBase}/api/salas/${code}/ws`);
    ws.onopen = () => {
      ws.send(JSON.stringify(hello));
      resolve(ws);
    };
    ws.onerror = () => reject(new Error('falhou a conexão'));
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.type === 'error') console.error('erro do servidor:', m.code);
      if (m.type === 'state') onState(m, ws);
    };
  });
}

// ---------- jogadores ----------
const stats = { msgs: 0, answered: 0, right: 0, last: new Map() };
const players = [];
for (let i = 0; i < N; i++) {
  const p = { id: 'sim-' + i + '-' + Math.random().toString(36).slice(2, 8), nick: 'Jogador ' + (i + 1), answeredQ: -1, state: null };
  players.push(p);
}
const joinStart = Date.now();
await Promise.all(
  players.map(async (p, i) => {
    await sleep(Math.random() * 1500 + i * 5);
    p.ws = await connect({ type: 'join', nick: p.nick, playerId: p.id }, (m, ws) => {
      stats.msgs++;
      p.state = m;
      if (m.phase === 'question' && p.answeredQ !== m.qIndex) {
        p.answeredQ = m.qIndex;
        const choice = Math.random() < 0.6 ? 0 : 1 + Math.floor(Math.random() * 3);
        // espera o "Prepare-se" acabar (relógio do servidor) e responde em até 5 s
        const prep = Math.max(0, (m.startsAt || 0) - m.serverNow);
        setTimeout(() => {
          ws.send(JSON.stringify({ type: 'answer', qIndex: m.qIndex, choice }));
          stats.answered++;
          if (choice === 0) stats.right++;
        }, prep + 300 + Math.random() * 5000);
      }
    });
  }),
);

// ---------- anfitrião ----------
let host;
const waitFor = (pred, ms = 30000) =>
  new Promise((resolve, reject) => {
    const started = Date.now();
    const iv = setInterval(() => {
      if (host.state && pred(host.state)) {
        clearInterval(iv);
        resolve(host.state);
      } else if (Date.now() - started > ms) {
        clearInterval(iv);
        reject(new Error('tempo esgotado esperando o estado'));
      }
    }, 20);
  });
host = { state: null };
host.ws = await connect({ type: 'host', hostKey }, (m) => (host.state = m));
await waitFor((s) => s.players.length === N);
log(`${N} jogadores no lobby em ${((Date.now() - joinStart) / 1000).toFixed(1)} s`);

const send = (m) => host.ws.send(JSON.stringify(m));
send({ type: 'start' });
for (let q = 0; q < NQ; q++) {
  const asked = Date.now();
  const s = await waitFor((s) => s.phase === 'reveal' && s.qIndex === q, 20000);
  log(`Pergunta ${q + 1}: ${s.answeredCount}/${N} responderam, revelada em ${((Date.now() - asked) / 1000).toFixed(1)} s · contagem ${s.counts.join('/')}`);
  send({ type: 'showRanking' });
  await waitFor((s) => s.phase === 'ranking' && s.qIndex === q);
  send({ type: 'next' });
}
const fin = await waitFor((s) => s.phase === 'final');
send({ type: 'draw', mode: 'all' });
const drawn = await waitFor((s) => s.drawn.length === 1);
await sleep(500);

// ---------- conferência ----------
const byId = new Map(fin.ranking.map((r) => [r.id, r]));
let wrong = 0;
for (const p of players) {
  const mine = p.state && p.state.me;
  const r = byId.get(p.id);
  if (!mine || !r || mine.score !== r.score || mine.rank !== r.rank || p.state.phase !== 'final') wrong++;
}
const scores = fin.ranking.map((r) => r.score);
log(`Pódio: ${fin.podium.map((r) => `${r.nick} (${r.score})`).join(', ')}`);
log(`Sorteado: ${drawn.drawn[0].nick}`);
log(`Mensagens recebidas pelos jogadores: ${stats.msgs} · respostas enviadas: ${stats.answered}`);
log(`Pontos: máximo ${Math.max(...scores)}, mínimo ${Math.min(...scores)}`);
log(wrong ? `ATENÇÃO: ${wrong} jogadores com placar diferente do ranking do anfitrião` : 'Todos os celulares batem com o ranking do anfitrião.');

send({ type: 'close' });
await sleep(300);
for (const p of players) p.ws.close();
host.ws.close();
process.exit(wrong ? 1 : 0);
