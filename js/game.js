// ── Estado global da sessão ──────────────────────────────────────────────────
const Session = {
  nomeAluno:   '',
  codigoTurma: '',
  mundoAtual:  '',
  notas:       {},  // { matematica: 8, portugues: 6 }
  acertos:     0,

  salvarNota(mundo, nota) { this.notas[mundo] = nota; },
  obterNota(mundo)        { return this.notas[mundo] ?? 0; },
  totalCompletos()        { return Object.keys(this.notas).length; },
  calcularMedia() {
    const vals = Object.values(this.notas);
    if (!vals.length) return 0;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  },
  resetar() {
    this.mundoAtual = '';
    this.notas      = {};
    this.acertos    = 0;
  }
};

// ── Navegação entre telas ────────────────────────────────────────────────────
function irPara(id) {
  document.querySelectorAll('.tela').forEach(t => t.classList.remove('ativa'));
  const tela = document.getElementById(id);
  if (tela) {
    tela.classList.add('ativa', 'fade-enter');
    tela.addEventListener('animationend', () => tela.classList.remove('fade-enter'), { once: true });
  }
}

// ── Toast (mensagem temporária) ──────────────────────────────────────────────
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
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('show'));
  });
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

// ── Exportar sessão (usado pelo ranking/relatório) ────────────────────────────
function exportarResultado() {
  return {
    nome:   Session.nomeAluno,
    turma:  Session.codigoTurma,
    notas:  { ...Session.notas },
    media:  Session.calcularMedia(),
    data:   new Date().toISOString()
  };
}
