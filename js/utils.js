/**
 * utils.js — Missão Saber
 * Funções utilitárias compartilhadas entre todas as telas.
 * Não depende de nenhum outro módulo.
 */

// ── Navegação entre telas ────────────────────────────────────────────────────
async function irPara(id) {
  const tela = document.getElementById(id);
  if (!tela) return;

  const fundoEl = tela.querySelector('.fundo-img');
  if (fundoEl) {
    const bg = getComputedStyle(fundoEl).backgroundImage;
    const match = bg.match(/url\(["']?([^"')]+)["']?\)/);
    if (match) {
      await new Promise(resolve => {
        const img = new Image();
        img.onload = img.onerror = resolve;
        img.src = match[1];
      });
    }
  }

  document.querySelectorAll('.tela').forEach(t => t.classList.remove('ativa'));
  tela.classList.add('ativa', 'fade-enter');
  tela.addEventListener('animationend', () => tela.classList.remove('fade-enter'), { once: true });
}

// ── Toast ────────────────────────────────────────────────────────────────────
let _toastTimer;

function mostrarToast(msg, tipo = '') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.className = 'toast' + (tipo ? ` ${tipo}` : '');
  clearTimeout(_toastTimer);
  requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('show')));
  _toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

// ── Popup de confirmação ─────────────────────────────────────────────────────
function mostrarPopup(msg, onSim, onNao) {
  const overlay = document.getElementById('popup-overlay');
  const txt     = document.getElementById('popup-txt');
  const btnSim  = document.getElementById('popup-sim');
  const btnNao  = document.getElementById('popup-nao');
  if (!overlay) return;

  txt.textContent = msg;
  overlay.classList.add('ativo');

  btnSim.onclick = () => { overlay.classList.remove('ativo'); onSim?.(); };
  btnNao.onclick = () => { overlay.classList.remove('ativo'); onNao?.(); };
}

// ── Estrelas ─────────────────────────────────────────────────────────────────
function calcularEstrelas(nota) {
  if (nota >= 10) return '★ ★ ★';
  if (nota >= 8)  return '★ ★';
  if (nota >= 6)  return '★';
  return '✗';
}

// ── Normalizar texto (remove acentos) ────────────────────────────────────────
function normalizar(str) {
  if (!str) return '';
  return str.toLowerCase()
    .replace(/[áàâã]/g, 'a').replace(/[éê]/g, 'e')
    .replace(/[í]/g, 'i').replace(/[óôõ]/g, 'o')
    .replace(/[ú]/g, 'u').replace(/[ç]/g, 'c')
    .trim();
}

// ── Sanitizar input (previne XSS) ────────────────────────────────────────────
function sanitizar(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ── Sons do quiz ─────────────────────────────────────────────────────────────
const Som = {
  _ctx: null,
  _init() {
    if (!this._ctx) this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    return this._ctx;
  },

  acerto() {
    const ctx = this._init();
    const notas = [523, 659, 784]; // C5, E5, G5 — acorde maior
    notas.forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      const t = ctx.currentTime + i * 0.1;
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.start(t);
      osc.stop(t + 0.4);
    });
  },

  erro() {
  const ctx = this._init();
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(330, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.3);
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.3);
},

selecionar() {
  const ctx = this._init();
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(440, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.15);
  gain.gain.setValueAtTime(0.4, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.15);
}
};