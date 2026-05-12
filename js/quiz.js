/**
 * quiz.js — Missão Saber
 * Motor do quiz: carrega questões, exibe perguntas, registra respostas.
 * Depende de: utils.js, session.js
 */

const Quiz = {
  banco:               null,
  fila:                [],
  indexAtual:          0,
  totalQuestoes:       10,
  acertos:             0,
  respostasBloqueadas: false,

  // Cores por matéria
  _cores: {
    matematica: { botao: '#156FFF', badge: '#000', texto: '#fff' },
    portugues:  { botao: '#2FF370', badge: '#000', texto: '#000' }
  },

  // ── Carrega banco de questões do servidor ─────────────────────────────────
  async carregarBanco() {
    try {
      const res  = await fetch('/data/question_bank.json');
      const data = await res.json();
      this.banco = data.questions || [];
    } catch (e) {
      console.error('[Quiz] Erro ao carregar banco:', e);
      this.banco = [];
    }
  },

  // ── Inicia o quiz para um mundo ───────────────────────────────────────────
  iniciar(mundo) {
    Session.mundoAtual       = mundo;
    this.indexAtual          = 0;
    this.acertos             = 0;
    this.respostasBloqueadas = false;

    const filtradas = (this.banco || []).filter(q =>
      normalizar(q.category) === normalizar(mundo)
    );
    this.fila = this._embaralhar(filtradas).slice(0, this.totalQuestoes);

    if (!this.fila.length) {
      mostrarToast('Nenhuma questão encontrada para esta matéria!', 'erro');
      return;
    }

    this._aplicarTema(mundo);
    irPara('tela-quiz');
    this._exibirQuestao();
  },

  // ── Exibe a questão atual ─────────────────────────────────────────────────
  _exibirQuestao() {
    if (this.indexAtual >= this.fila.length) {
      this._finalizar();
      return;
    }

    const q = this.fila[this.indexAtual];
    this.respostasBloqueadas = false;

    // Progresso
    const pct = (this.indexAtual / this.totalQuestoes) * 100;
    document.getElementById('quiz-progress').style.width = pct + '%';
    document.getElementById('quiz-contador').textContent =
      `${this.indexAtual + 1} / ${this.totalQuestoes}`;

    // Pergunta
    document.getElementById('quiz-pergunta').textContent = q.text;

    // Imagem
    const imgBox = document.getElementById('quiz-img-box');
    const imgEl  = document.getElementById('quiz-img');
    if (q.image_path) {
      imgEl.src = q.image_path;
      imgBox.style.display = 'block';
    } else {
      imgBox.style.display = 'none';
    }

    // Alternativas embaralhadas
    const alternativas = this._embaralharRespostas(q);
    const letras       = ['A', 'B', 'C', 'D', 'E'];
    const container    = document.getElementById('quiz-alternativas');
    container.innerHTML = '';

    alternativas.forEach((alt, i) => {
      const btn = document.createElement('button');
      btn.className = 'btn-alternativa';
      btn.innerHTML = `
        <span class="badge-letra">${letras[i]}</span>
        <span>${sanitizar(alt.texto)}</span>
      `;
      btn.onclick = () => this._responder(btn, alt.correta, alternativas);
      container.appendChild(btn);
    });
  },

  // ── Processa resposta do aluno ────────────────────────────────────────────
  _responder(btnClicado, correta, alternativas) {
    if (this.respostasBloqueadas) return;
    this.respostasBloqueadas = true;

    if (correta) {
      this.acertos++;
      btnClicado.classList.add('correta');
    } else {
      btnClicado.classList.add('errada');
      // Destaca a correta
      const btns        = document.querySelectorAll('.btn-alternativa');
      const idxCorreta  = alternativas.findIndex(a => a.correta);
      btns[idxCorreta]?.classList.add('correta');
    }

    document.querySelectorAll('.btn-alternativa').forEach(b => b.disabled = true);

    setTimeout(() => {
      this.indexAtual++;
      this._exibirQuestao();
    }, 1500);
  },

  // ── Finaliza o quiz e salva resultado ─────────────────────────────────────
  _finalizar() {
    const nota = this.acertos; // 1 ponto por acerto, máx 10
    Session.salvarNota(Session.mundoAtual, nota);

    this._salvarResultado(nota);
    irPara('tela-resultado-mundo');
    this._exibirResultadoMundo(nota);
  },

  // ── Exibe tela de resultado do mundo ─────────────────────────────────────
  _exibirResultadoMundo(nota) {
    const mundo  = Session.mundoAtual;
    const nomes  = { matematica: 'MATEMÁTICA', portugues: 'PORTUGUÊS' };
    const fundos = {
      matematica: "url('assets/imagens/resultado_matematica.png')",
      portugues:  "url('assets/imagens/resultado_historia.png')"
    };

    document.getElementById('res-mundo-nome').textContent     = nomes[mundo] || mundo.toUpperCase();
    document.getElementById('res-mundo-nota').textContent     = nota;
    document.getElementById('res-mundo-estrelas').textContent = calcularEstrelas(nota);
    document.getElementById('res-mundo-msg').textContent      =
      nota >= 6 ? 'Muito bem! 🎉' : 'Continue tentando! 💪';

    const fundo = document.getElementById('res-mundo-fundo');
    if (fundo) fundo.style.backgroundImage = fundos[mundo] || '';
  },

  // ── Envia resultado para o servidor ──────────────────────────────────────
  async _salvarResultado(nota) {
    try {
      await fetch('/api/resultado', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome:    Session.nomeAluno,
          turma:   Session.codigoTurma,
          mundo:   Session.mundoAtual,
          nota,
          acertos: this.acertos,
          total:   this.totalQuestoes,
          data:    new Date().toISOString()
        })
      });
    } catch (e) {
      console.warn('[Quiz] Não foi possível salvar resultado:', e);
    }
  },

  // ── Aplica tema visual da matéria ─────────────────────────────────────────
  _aplicarTema(mundo) {
    const tema  = this._cores[mundo] || this._cores.matematica;
    const root  = document.documentElement;
    root.style.setProperty('--cor-tema-botao', tema.botao);
    root.style.setProperty('--cor-tema-badge', tema.badge);
    root.style.setProperty('--cor-tema-texto', tema.texto);

    const fundos = {
      matematica: "url('assets/imagens/quiz_matematica.png')",
      portugues:  "url('assets/imagens/quiz_historia.png')"
    };
    const fundo = document.getElementById('quiz-fundo');
    if (fundo) fundo.style.backgroundImage = fundos[mundo] || '';

    const tag = document.getElementById('quiz-mundo-tag');
    if (tag) tag.textContent = mundo === 'matematica' ? 'MATEMÁTICA' : 'PORTUGUÊS';
  },

  // ── Helpers ───────────────────────────────────────────────────────────────
  _embaralhar(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },

  _embaralharRespostas(q) {
    const respostas = q.answers.map((texto, i) => ({
      texto, correta: i === q.correct_index
    }));
    return this._embaralhar(respostas);
  }
};
