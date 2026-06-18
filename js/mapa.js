/**
 * mapa.js — Missão Saber
 * Gerencia o mapa de mundos e o fluxo de navegação do aluno.
 * Depende de: utils.js, session.js, quiz.js
 */

const Mapa = {
  _mundos: ['matematica', 'portugues'],
  _nomes:  { matematica: 'Matemática', portugues: 'Português' },

  atualizar() {
    this._mundos.forEach(mundo => {
      const nota   = Session.obterNota(mundo);
      const bloco  = document.getElementById(`bloco-${mundo}`);
      const notaEl = document.getElementById(`nota-${mundo}`);
      if (nota > 0) {
        bloco?.classList.add('completo');
        if (notaEl) { notaEl.textContent = `${nota} pts ${calcularEstrelas(nota)}`; notaEl.style.display = 'block'; }
      } else {
        bloco?.classList.remove('completo');
        if (notaEl) notaEl.style.display = 'none';
      }
    });

    const btnProximo = document.getElementById('btn-proximo-mundo');
    if (btnProximo) {
      const todosCompletos = Session.totalCompletos() >= 2;
      btnProximo.disabled            = todosCompletos;
      btnProximo.style.opacity       = todosCompletos ? '0.4' : '1';
      btnProximo.style.cursor        = todosCompletos ? 'not-allowed' : 'pointer';
      btnProximo.style.pointerEvents = todosCompletos ? 'none' : 'auto';
    }
  },

  iniciarMundo(mundo) {
    if (Session.obterNota(mundo) > 0) {
      const faltam = this._mundos.filter(m => Session.obterNota(m) <= 0 && m !== mundo);
      const msg = faltam.length
        ? `Você já completou ${this._nomes[mundo]}!\nFaltam: ${faltam.map(m => this._nomes[m]).join(', ')}`
        : `Você já completou ${this._nomes[mundo]}!\nTodos os blocos concluídos!`;
      mostrarToast(msg, 'erro');
      return;
    }

    Som.selecionar();

    if (Session.turmaId) {
      Quiz.iniciarComTurma(mundo, Session.turmaId);
    } else {
      Quiz.iniciar(mundo);
    }
  },

  voltar() {
    this.atualizar();
    irPara('tela-mapa');
    this._atualizarTagUsuario();
  },

  _atualizarTagUsuario() {
    const tag = document.getElementById('mapa-usuario-tag');
    if (!tag) return;
    const nomeCompleto = Session.sobrenomeAluno
      ? `${Session.nomeAluno} ${Session.sobrenomeAluno}`
      : Session.nomeAluno;
    tag.textContent = nomeCompleto;
  }
};

// ── Resultado Final ────────────────────────────────────────────────────────
const ResultadoFinal = {
  _mostrarOverlay() {
    const existing = document.getElementById('resultado-loading');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'resultado-loading';
    overlay.style.cssText = `
      position:fixed;inset:0;z-index:999;
      background:rgba(0,0,0,0.75);
      display:flex;flex-direction:column;
      align-items:center;justify-content:center;
      gap:16px;
    `;
    overlay.innerHTML = `
      <div style="
        width:56px;height:56px;
        border:5px solid rgba(255,255,255,0.2);
        border-top-color:#EDB21A;
        border-radius:50%;
        animation:spin 0.8s linear infinite;
      "></div>
      <p style="
        font-family:'Luckiest Guy',cursive;
        color:#EDB21A;
        font-size:1.2rem;
        letter-spacing:2px;
        text-shadow:2px 2px 0 rgba(0,0,0,0.5);
      ">Calculando resultado...</p>
    `;

    if (!document.getElementById('spin-style')) {
      const style = document.createElement('style');
      style.id = 'spin-style';
      style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
      document.head.appendChild(style);
    }

    document.body.appendChild(overlay);
    return overlay;
  },

  async exibir() {
    if (Session.totalCompletos() < 2) {
      mostrarToast('Complete os 2 blocos para ver o Resultado Final!', 'erro');
      return;
    }

    const overlay = this._mostrarOverlay();

    // Precarrega fundo do resultado final
    await new Promise(resolve => {
      const img = new Image();
      img.onload = img.onerror = resolve;
      img.src = 'assets/imagens/resultado_final.png';
    });

    const media    = Session.calcularMedia();
    const aprovado = media >= 6;

    const nomeCompleto = [Session.nomeAluno, Session.sobrenomeAluno].filter(Boolean).join(' ');
    const nomeFinalEl = document.getElementById('res-final-nome');
    if (nomeFinalEl) nomeFinalEl.textContent = nomeCompleto;

    document.getElementById('res-final-media').textContent = media.toFixed(1).replace('.', ',');

    const status = document.getElementById('res-final-status');
    status.textContent = aprovado ? 'APROVADO! 🎉' : '';
    status.style.color = 'var(--cor-verde)';

    overlay.remove();
    irPara('tela-resultado-final');

    const turma = Session.codigoTurma;
    const nome  = Session.sobrenomeAluno
      ? `${Session.nomeAluno} ${Session.sobrenomeAluno}`
      : Session.nomeAluno;

    if (turma && turma !== 'Livre') {
      Ranking.carregar(turma, nome);
    } else {
      const box = document.getElementById('ranking-turma');
      if (box) box.style.display = 'none';
    }
  }
};

// ── Fluxo do Aluno ────────────────────────────────────────────────────────
const Aluno = {
  abrirModal() {
    document.getElementById('modal-dados').classList.add('ativo');
    document.getElementById('btns-menu').style.display = 'none';
    document.getElementById('input-nome').focus();
  },

  fecharModal() {
    document.getElementById('modal-dados').classList.remove('ativo');
    document.getElementById('btns-menu').style.display = 'flex';
  },

  async confirmarDados() {
    const nome      = document.getElementById('input-nome').value.trim();
    const sobrenome = document.getElementById('input-sobrenome').value.trim();
    const turma     = document.getElementById('input-turma').value.trim();

    if (!nome) { mostrarToast('Digite seu nome!', 'erro'); return; }

    if (turma) {
      try {
        const resp = await fetch(`/api/turma/${encodeURIComponent(turma)}`);
        if (!resp.ok) { mostrarToast('Código de turma inválido!', 'erro'); return; }
        const turmaData = await resp.json();
        Session.turmaId = turmaData.id;
      } catch {
        mostrarToast('Erro ao verificar turma. Tente novamente.', 'erro'); return;
      }
    }

    Session.nomeAluno       = sanitizar(nome);
    Session.sobrenomeAluno  = sanitizar(sobrenome || '');
    Session.codigoTurma     = turma || 'Livre';
    Session.alunoRegistrado = false;

    this.fecharModal();
    Mapa._atualizarTagUsuario();
    Mapa.atualizar();
    irPara('tela-mapa');

    fetch('/api/acesso', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ tipo: 'aluno', userAgent: navigator.userAgent })
    }).catch(() => {});
  },

  async registrarAluno() {
    if (Session.alunoRegistrado || !Session.turmaId || !Session.codigoTurma || Session.codigoTurma === 'Livre') return;
    try {
      const resp = await fetch('/api/aluno', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          nome:         Session.nomeAluno,
          sobrenome:    Session.sobrenomeAluno || '',
          turma_codigo: Session.codigoTurma
        })
      });
      if (resp.ok) {
        const data          = await resp.json();
        Session.alunoId     = data.aluno_id;
        Session.alunoRegistrado = true;
      }
    } catch (e) {
      console.warn('[Aluno] Não foi possível registrar aluno:', e);
    }
  },

  sairParaMenu() {
    Session.resetar();
    document.getElementById('input-nome').value      = '';
    document.getElementById('input-sobrenome').value = '';
    document.getElementById('input-turma').value     = '';
    irPara('tela-login');
  },

  jogarNovamente() {
    Session.resetar();
    Mapa.atualizar();
    Mapa._atualizarTagUsuario();
    irPara('tela-mapa');
  },

  confirmarSairMenu() {
    mostrarPopup('Deseja voltar ao menu?\nSua sessão será reiniciada.', () => this.sairParaMenu(), null);
  },

  confirmarSairQuiz() {
    mostrarPopup('Deseja sair do quiz?\nSua sessão será reiniciada.', () => this.sairParaMenu(), null);
  },

  init() {
    document.getElementById('input-nome')?.addEventListener('keydown',      e => { if (e.key === 'Enter') Aluno.confirmarDados(); });
    document.getElementById('input-sobrenome')?.addEventListener('keydown', e => { if (e.key === 'Enter') Aluno.confirmarDados(); });
    document.getElementById('input-turma')?.addEventListener('keydown',     e => { if (e.key === 'Enter') Aluno.confirmarDados(); });
  }
};