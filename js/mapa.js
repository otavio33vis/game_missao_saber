/**
 * mapa.js — Missão Saber
 * Gerencia o mapa de mundos e o fluxo de navegação do aluno.
 * Depende de: utils.js, session.js, quiz.js
 */

const Mapa = {
  _mundos: ['matematica', 'portugues'],
  _nomes:  { matematica: 'Matemática', portugues: 'Português' },

  // ── Atualiza visual dos blocos ────────────────────────────────────────────
  atualizar() {
    this._mundos.forEach(mundo => {
      const nota   = Session.obterNota(mundo);
      const bloco  = document.getElementById(`bloco-${mundo}`);
      const notaEl = document.getElementById(`nota-${mundo}`);

      if (nota > 0) {
        bloco?.classList.add('completo');
        if (notaEl) {
          notaEl.textContent  = `${nota} pts ${calcularEstrelas(nota)}`;
          notaEl.style.display = 'block';
        }
      } else {
        bloco?.classList.remove('completo');
        if (notaEl) notaEl.style.display = 'none';
      }
    });
  },

  // ── Clique num bloco de mundo ─────────────────────────────────────────────
  iniciarMundo(mundo) {
    if (Session.obterNota(mundo) > 0) {
      const faltam = this._mundos.filter(m =>
        Session.obterNota(m) <= 0 && m !== mundo
      );
      const msg = faltam.length
        ? `Você já completou ${this._nomes[mundo]}!\nFaltam: ${faltam.map(m => this._nomes[m]).join(', ')}`
        : `Você já completou ${this._nomes[mundo]}!\nTodos os blocos concluídos!`;
      mostrarToast(msg, 'erro');
      return;
    }
    Quiz.iniciar(mundo);
  },

  // ── Volta pro mapa após resultado de mundo ────────────────────────────────
  voltar() {
    this.atualizar();
    irPara('tela-mapa');
  }
};

// ── Resultado Final ───────────────────────────────────────────────────────────
const ResultadoFinal = {
  exibir() {
    if (Session.totalCompletos() < 2) {
      mostrarToast('Complete os 2 blocos para ver o Resultado Final!', 'erro');
      return;
    }

    const media    = Session.calcularMedia();
    const aprovado = media >= 6;

    document.getElementById('res-final-media').textContent =
      media.toFixed(1).replace('.', ',');

    const status = document.getElementById('res-final-status');
    status.textContent = aprovado ? 'APROVADO! 🎉' : 'TENTE NOVAMENTE 💪';
    status.style.color = aprovado ? 'var(--cor-verde)' : 'var(--cor-vermelho)';

    const cfg = {
      matematica: { nome: 'Matemática', classe: 'mat' },
      portugues:  { nome: 'Português',  classe: 'port' }
    };

    document.getElementById('res-final-detalhes').innerHTML =
      Object.entries(cfg).map(([id, c]) => {
        const nota = Session.obterNota(id);
        return nota > 0
          ? `<div class="detalhe-item ${c.classe}">
               <span class="detalhe-nome">${c.nome}</span>
               <span class="detalhe-nota">${nota} ${calcularEstrelas(nota)}</span>
             </div>`
          : '';
      }).join('');

    irPara('tela-resultado-final');
  }
};

// ── Fluxo do Aluno ────────────────────────────────────────────────────────────
const Aluno = {
  // Abre modal de dados
  abrirModal() {
    document.getElementById('modal-dados').classList.add('ativo');
    document.getElementById('input-nome').focus();
  },

  fecharModal() {
    document.getElementById('modal-dados').classList.remove('ativo');
  },

  // Confirma dados e vai pro mapa
  confirmarDados() {
    const nome  = document.getElementById('input-nome').value.trim();
    const turma = document.getElementById('input-turma').value.trim();

    if (!nome) { mostrarToast('Digite seu nome!', 'erro'); return; }

    Session.nomeAluno   = sanitizar(nome);
    Session.codigoTurma = turma || 'Livre';

    this.fecharModal();
    document.getElementById('mapa-aluno-nome').textContent = `Olá, ${Session.nomeAluno}! 👋`;
    Mapa.atualizar();
    irPara('tela-mapa');
  },

  // Sai do jogo e volta pro menu
  sairParaMenu() {
    Session.resetar();
    document.getElementById('input-nome').value  = '';
    document.getElementById('input-turma').value = '';
    irPara('tela-login');
  },

  jogarNovamente() {
    Session.resetar();
    Mapa.atualizar();
    irPara('tela-mapa');
  },

  confirmarSairMenu() {
    mostrarPopup(
      'Deseja voltar ao menu?\nSua sessão será reiniciada.',
      () => this.sairParaMenu(),
      null
    );
  },

  confirmarSairQuiz() {
    mostrarPopup(
      'Deseja sair do quiz?\nSua sessão será reiniciada.',
      () => this.sairParaMenu(),
      null
    );
  },

  // Inicializa eventos de teclado
  init() {
    document.getElementById('input-nome')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') Aluno.confirmarDados();
    });
    document.getElementById('input-turma')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') Aluno.confirmarDados();
    });
  }
};
