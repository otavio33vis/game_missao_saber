// ── Quiz Engine ──────────────────────────────────────────────────────────────
const Quiz = {
  banco:       null,
  fila:        [],
  indexAtual:  0,
  totalQuestoes: 10,
  acertos:     0,
  respostasBloqueadas: false,

  // Cores por matéria
  cores: {
    matematica: { botao: '#156FFF', badge: '#000', texto: '#fff' },
    portugues:  { botao: '#2FF370', badge: '#000', texto: '#000' }
  },

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

  iniciar(mundo) {
    Session.mundoAtual  = mundo;
    this.indexAtual     = 0;
    this.acertos        = 0;
    this.respostasBloqueadas = false;

    // Filtra e embaralha
    const filtradas = this.banco.filter(q =>
      this._normalizar(q.category) === this._normalizar(mundo)
    );
    this.fila = this._embaralhar(filtradas).slice(0, this.totalQuestoes);

    if (this.fila.length === 0) {
      mostrarToast('Nenhuma questão encontrada para esta matéria!', 'erro');
      return;
    }

    this._aplicarTema(mundo);
    irPara('tela-quiz');
    this._exibirQuestao();
  },

  _exibirQuestao() {
    if (this.indexAtual >= this.fila.length) { this._finalizar(); return; }

    const q = this.fila[this.indexAtual];
    this.respostasBloqueadas = false;

    // Progresso
    const pct = (this.indexAtual / this.totalQuestoes) * 100;
    document.getElementById('quiz-progress').style.width = pct + '%';
    document.getElementById('quiz-contador').textContent =
      `${this.indexAtual + 1} / ${this.totalQuestoes}`;

    // Pergunta
    document.getElementById('quiz-pergunta').textContent = q.text;

    // Imagem da questão
    const imgBox = document.getElementById('quiz-img-box');
    const imgEl  = document.getElementById('quiz-img');
    if (q.image_path) {
      imgEl.src = q.image_path;
      imgBox.style.display = 'block';
    } else {
      imgBox.style.display = 'none';
    }

    // Alternativas (embaralha respostas)
    const alternativas = this._embaralharRespostas(q);
    const letras = ['A','B','C','D','E'];
    const container = document.getElementById('quiz-alternativas');
    container.innerHTML = '';

    alternativas.forEach((alt, i) => {
      const btn = document.createElement('button');
      btn.className = 'btn-alternativa';
      btn.innerHTML = `<span class="badge-letra">${letras[i]}</span><span>${alt.texto}</span>`;
      btn.onclick = () => this._responder(btn, alt.correta, alternativas, i);
      container.appendChild(btn);
    });
  },

  _responder(btnClicado, correta, alternativas, indexClicado) {
    if (this.respostasBloqueadas) return;
    this.respostasBloqueadas = true;

    if (correta) {
      this.acertos++;
      btnClicado.classList.add('correta');
    } else {
      btnClicado.classList.add('errada');
      // Mostra a correta
      const btns = document.querySelectorAll('.btn-alternativa');
      const indexCorreta = alternativas.findIndex(a => a.correta);
      if (btns[indexCorreta]) btns[indexCorreta].classList.add('correta');
    }

    // Desabilita todos
    document.querySelectorAll('.btn-alternativa').forEach(b => b.disabled = true);

    setTimeout(() => {
      this.indexAtual++;
      this._exibirQuestao();
    }, 1500);
  },

  _finalizar() {
    const nota = this.acertos; // 1 ponto por acerto, max 10
    Session.salvarNota(Session.mundoAtual, nota);
    Session.acertos = this.acertos;

    // Salva no servidor
    this._salvarResultado(nota);

    irPara('tela-resultado-mundo');
    this._exibirResultadoMundo(nota);
  },

  _exibirResultadoMundo(nota) {
    const mundo  = Session.mundoAtual;
    const nomes  = { matematica: 'MATEMÁTICA', portugues: 'PORTUGUÊS' };

    document.getElementById('res-mundo-nome').textContent    = nomes[mundo] || mundo.toUpperCase();
    document.getElementById('res-mundo-nota').textContent    = nota;
    document.getElementById('res-mundo-estrelas').textContent = calcularEstrelas(nota);
    document.getElementById('res-mundo-msg').textContent     =
      nota >= 6 ? 'Muito bem! 🎉' : 'Continue tentando! 💪';

    // Fundo dinâmico
    const fundo = document.getElementById('res-mundo-fundo');
    if (fundo) fundo.style.backgroundImage = `url('assets/imagens/resultado_${mundo}.png')`;

    // Botão próximo mundo
    const completos = Session.totalCompletos();
    const btnProx   = document.getElementById('btn-proximo-mundo');
    if (btnProx) btnProx.disabled = completos >= 2;
  },

  async _salvarResultado(nota) {
    try {
      await fetch('/api/resultado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome:   Session.nomeAluno,
          turma:  Session.codigoTurma,
          mundo:  Session.mundoAtual,
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

  _aplicarTema(mundo) {
    const tema = this.cores[mundo] || this.cores.matematica;
    document.documentElement.style.setProperty('--cor-tema-botao', tema.botao);
    document.documentElement.style.setProperty('--cor-tema-badge', tema.badge);
    document.documentElement.style.setProperty('--cor-tema-texto', tema.texto);

    const fundo = document.getElementById('quiz-fundo');
    if (fundo) fundo.style.backgroundImage = `url('assets/imagens/quiz_${mundo}.png')`;
  },

  _normalizar(str) {
    if (!str) return '';
    return str.toLowerCase()
      .replace(/[áàâã]/g,'a').replace(/[éê]/g,'e')
      .replace(/[í]/g,'i').replace(/[óôõ]/g,'o')
      .replace(/[ú]/g,'u').replace(/[ç]/g,'c').trim();
  },

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
