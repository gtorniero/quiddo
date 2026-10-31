// Sons da tela principal, gerados na hora com Web Audio (sem arquivos de áudio).
// Musiquinha em loop durante o jogo, bipes do "Prepare-se", reação na revelação e fanfarra no pódio.
// O navegador só libera áudio depois de um clique: ligar() é chamado no "Começar o quiz".
import { store } from './storage';

type Ctx = AudioContext;
let ctx: Ctx | null = null;
let mestre: GainNode | null = null;
let musicaGain: GainNode | null = null;
let timer = 0;
let proximo = 0; // hora (no relógio do áudio) do próximo tempo da música
let passo = 0;

const BPM = 108;
const SEMI = 60 / BPM / 2; // colcheia

export const somLigado = () => store.get<boolean>('som', true);

function garante(): Ctx | null {
  if (ctx) return ctx;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  mestre = ctx.createGain();
  mestre.gain.value = somLigado() ? 1 : 0;
  mestre.connect(ctx.destination);
  musicaGain = ctx.createGain();
  musicaGain.gain.value = 0.16;
  musicaGain.connect(mestre);
  return ctx;
}

// voz "Quiddô!" gravada (gerada com text-to-speech), carregada assim que a tela principal abre
let vozBuf: AudioBuffer | null = null;
let vozPedida = false;
function carregaVoz() {
  if (vozPedida || !ctx) return;
  vozPedida = true;
  fetch('/som/quiddo.wav')
    .then((r) => r.arrayBuffer())
    .then((b) => ctx!.decodeAudioData(b))
    .then((buf) => (vozBuf = buf))
    .catch(() => {});
}

/** Prepara o áudio e já baixa a voz, sem tocar nada (pode ser chamado antes de qualquer clique). */
export function prepararSom() {
  garante();
  carregaVoz();
}

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

/** Uma nota curta com envelope (ataque rápido, queda exponencial). */
function nota(midi: number, quando: number, dur: number, tipo: OscillatorType, vol: number, destino: AudioNode) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = tipo;
  o.frequency.setValueAtTime(hz(midi), quando);
  g.gain.setValueAtTime(0.0001, quando);
  g.gain.exponentialRampToValueAtTime(vol, quando + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, quando + dur);
  o.connect(g).connect(destino);
  o.start(quando);
  o.stop(quando + dur + 0.05);
}

/** Chocalho: ruído curto e agudo. */
function chocalho(quando: number, vol: number, destino: AudioNode) {
  if (!ctx) return;
  const n = Math.floor(ctx.sampleRate * 0.05);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = 6000;
  const g = ctx.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(destino);
  src.start(quando);
}

/** Bumbo: seno que desce rápido. */
function bumbo(quando: number, destino: AudioNode) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.frequency.setValueAtTime(120, quando);
  o.frequency.exponentialRampToValueAtTime(45, quando + 0.12);
  g.gain.setValueAtTime(0.9, quando);
  g.gain.exponentialRampToValueAtTime(0.0001, quando + 0.18);
  o.connect(g).connect(destino);
  o.start(quando);
  o.stop(quando + 0.2);
}

// Levada em 16 colcheias (2 compassos): baixo, marimba e chocalho. Escala pentatônica, alegre e leve.
const BAIXO = [43, null, null, 43, null, null, 50, null, 45, null, null, 45, null, null, 52, null];
const MELODIA = [null, 67, null, 69, 71, null, 74, null, null, 72, null, 71, 69, null, 67, null];

function agenda() {
  if (!ctx || !musicaGain) return;
  while (proximo < ctx.currentTime + 0.25) {
    const i = passo % 16;
    if (i % 4 === 0) bumbo(proximo, musicaGain);
    chocalho(proximo, i % 2 ? 0.12 : 0.22, musicaGain);
    const b = BAIXO[i];
    if (b != null) nota(b, proximo, SEMI * 1.8, 'triangle', 0.5, musicaGain);
    // a melodia só entra a cada dois ciclos, para não cansar
    const m = MELODIA[i];
    if (m != null && Math.floor(passo / 16) % 2 === 1) nota(m, proximo, SEMI * 1.5, 'sine', 0.28, musicaGain);
    proximo += SEMI;
    passo++;
  }
}

/**
 * Vinheta "qui-ddô": o nome cantado em duas notas. "qui" é curtinho e sobe; "ddô" é mais longo,
 * redondo e com um balanço; no fim, um "pop", como o olho do logo.
 */
export function vinheta(quando?: number) {
  if (!ctx || !mestre) return;
  const t = quando ?? ctx.currentTime + 0.02;
  if (vozBuf) {
    // a voz falando "Quiddô!", com um brilho e o "pop" do olho no fim
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    g.gain.value = 1.1;
    src.buffer = vozBuf;
    src.connect(g).connect(mestre);
    src.start(t);
    const fim = t + vozBuf.duration;
    [79, 84].forEach((m, i) => nota(m, fim - 0.15 + i * 0.07, 0.35, 'sine', 0.08, mestre!));
    pop(fim);
    return;
  }
  const voz = (de: number, ate: number, ini: number, dur: number, vol: number, vibrato: boolean) => {
    const o = ctx!.createOscillator();
    const f = ctx!.createBiquadFilter();
    const g = ctx!.createGain();
    o.type = 'square';
    f.type = 'lowpass';
    f.frequency.value = 1800;
    f.Q.value = 6;
    o.frequency.setValueAtTime(hz(de), ini);
    o.frequency.exponentialRampToValueAtTime(hz(ate), ini + Math.min(0.08, dur / 2));
    if (vibrato) {
      const lfo = ctx!.createOscillator();
      const prof = ctx!.createGain();
      lfo.frequency.value = 7;
      prof.gain.value = 9;
      lfo.connect(prof).connect(o.frequency);
      lfo.start(ini + 0.1);
      lfo.stop(ini + dur);
    }
    g.gain.setValueAtTime(0.0001, ini);
    g.gain.exponentialRampToValueAtTime(vol, ini + 0.015);
    g.gain.setValueAtTime(vol, ini + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, ini + dur);
    o.connect(f).connect(g).connect(mestre!);
    o.start(ini);
    o.stop(ini + dur + 0.05);
  };
  voz(76, 79, t, 0.14, 0.16, false); // "qui"
  voz(79, 72, t + 0.17, 0.5, 0.18, true); // "ddô"
  nota(84, t + 0.17, 0.5, 'sine', 0.12, mestre); // brilho em cima do "ddô"
  pop(t + 0.7);
}

/** "Pop": bolha que desce rápido, como o olho do logo. */
function pop(t: number) {
  if (!ctx || !mestre) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.frequency.setValueAtTime(1400, t);
  o.frequency.exponentialRampToValueAtTime(320, t + 0.08);
  g.gain.setValueAtTime(0.25, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  o.connect(g).connect(mestre);
  o.start(t);
  o.stop(t + 0.15);
}

/** Liga o áudio (precisa vir de um clique), toca a vinheta "qui-ddô" e começa a musiquinha. */
export function ligarMusica() {
  const c = garante();
  if (!c) return;
  c.resume().catch(() => {});
  if (timer) return;
  vinheta(c.currentTime + 0.05);
  proximo = c.currentTime + (vozBuf ? vozBuf.duration + 0.5 : 1.1); // a música entra depois da vinheta
  passo = 0;
  timer = window.setInterval(agenda, 60);
}

export function pararMusica() {
  clearInterval(timer);
  timer = 0;
}

/** Liga ou desliga todo o som (música e efeitos). Guarda a escolha neste navegador. */
export function alternarSom(): boolean {
  const on = !somLigado();
  store.set('som', on);
  if (mestre && ctx) mestre.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, 0.05);
  return on;
}

/** Abaixa a música durante a pergunta e volta depois. */
export function musicaBaixa(baixa: boolean) {
  if (musicaGain && ctx) musicaGain.gain.setTargetAtTime(baixa ? 0.07 : 0.16, ctx.currentTime, 0.3);
}

/** Bipe da contagem do "Prepare-se". `ultimo` é o "já!", mais agudo. */
export function bipe(ultimo = false) {
  if (!ctx || !mestre) return;
  nota(ultimo ? 84 : 76, ctx.currentTime, ultimo ? 0.35 : 0.15, 'square', 0.12, mestre);
}

/** Reação na revelação: "plim" alegre se a maioria acertou, "uóóó" descendo se a maioria errou. */
export function reacao(acertou: number, total: number) {
  if (!ctx || !mestre) return;
  const t = ctx.currentTime;
  if (total > 0 && acertou / total >= 0.5) {
    [72, 76, 79, 84].forEach((m, i) => nota(m, t + i * 0.08, 0.4, 'triangle', 0.3, mestre!));
    chocalho(t + 0.32, 0.4, mestre);
  } else {
    // "uóóó": serra grave que escorrega para baixo
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 1200;
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(hz(62), t);
    o.frequency.exponentialRampToValueAtTime(hz(50), t + 0.9);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1);
    o.connect(f).connect(g).connect(mestre);
    o.start(t);
    o.stop(t + 1.05);
  }
}

/** Tambor do suspense do pódio e fanfarra quando aparece o campeão. */
export function rufar() {
  if (!ctx || !mestre) return;
  for (let i = 0; i < 12; i++) chocalho(ctx.currentTime + i * 0.06, 0.15 + i * 0.03, mestre);
}

export function fanfarra() {
  if (!ctx || !mestre) return;
  const t = ctx.currentTime;
  [67, 72, 76, 79, 84].forEach((m, i) => nota(m, t + i * 0.11, i === 4 ? 0.9 : 0.25, 'square', 0.14, mestre!));
  bumbo(t + 0.44, mestre);
  vinheta(t + 1.3);
}
