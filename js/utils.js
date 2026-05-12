/**
 * utils.js — Missão Saber
 * Funções utilitárias compartilhadas entre todas as telas.
 * Não depende de nenhum outro módulo.
 */

// ── Navegação entre telas ────────────────────────────────────────────────────
function irPara(id) {
  document.querySelectorAll('.tela').forEach(t => t.classList.remove('ativa'));
  const tela = document.getElementById(id);
  if (!tela) return;
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
