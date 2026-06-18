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

  _cores: {
    matematica: { botao: '#156FFF', badge: '#1a1a1a', texto: '#fff' },
    portugues:  { botao: '#FFD166', badge: '#fff',    texto: '#3a2800' }
  },

  async carregarBanco() {
    try {
      const res  = await fetch('/api/banco');
      const data = await res.json();
      this.banco = Array.isArray(data) ? data : [];
    } catch (e) {
      console.error('[Quiz] Erro ao carregar banco:', e);
      this.banco = [];
    }
  },

  async iniciar(mundo) {
    Session.mundoAtual       = mundo;
    this.indexAtual          = 0;
    this.acertos             = 0;
    this.respostasBloqueadas = true;
    const container = document.getElementById('quiz-alternativas');
    if (container) container.innerHTML = '';

    const filtradas = (this.banco || []).filter(q =>
      normalizar(q.category) === normalizar(mundo)
    );
    this.fila = this._embaralhar(filtradas).slice(0, this.totalQuestoes);

    if (!this.fila.length) {
      mostrarToast('Nenhuma questão encontrada para esta matéria!', 'erro');
      return;
    }

    await this._aplicarTema(mundo);
    irPara('tela-quiz');
    this._exibirQuestao();
  },

  async iniciarComTurma(mundo, turmaId) {
    this.respostasBloqueadas = true;
    const container = document.getElementById('quiz-alternativas');
    if (container) container.innerHTML = '';

    try {
      const resp     = await fetch(`/api/turmas/${turmaId}/questoes?category=${mundo}`);
      const questoes = await resp.json();

      if (!questoes.length) {
        mostrarToast('Nenhuma questão cadastrada para esta matéria!', 'erro');
        return;
      }

      this.banco = questoes.map(q => ({
        ...q,
        answers: Array.isArray(q.answers) ? q.answers : JSON.parse(q.answers)
      }));

      await this.iniciar(mundo);
    } catch (e) {
      console.error('[Quiz] Erro ao carregar questões da turma:', e);
      mostrarToast('Erro ao carregar questões!', 'erro');
    }
  },

  async _exibirQuestao() {
    if (this.indexAtual >= this.fila.length) {
      this._finalizar();
      return;
    }

    const q = this.fila[this.indexAtual];
    this.respostasBloqueadas = true;

    // Progresso
    const pct = (this.indexAtual / this.totalQuestoes) * 100;
    document.getElementById('quiz-progress').style.width = pct + '%';
    document.getElementById('quiz-contador').textContent =
      `${this.indexAtual + 1} / ${this.totalQuestoes}`;

    // Pergunta
    document.getElementById('quiz-pergunta').innerHTML = q.text;

    // Imagem da questão
    const imgBox = document.getElementById('quiz-img-box');
    const imgEl  = document.getElementById('quiz-img');
    imgBox.style.display = 'none';
    imgEl.src = '';

    if (q.image_url || q.image_path) {
      const url = q.image_url || q.image_path;
      await new Promise(resolve => {
        const tmp = new Image();
        tmp.onload = tmp.onerror = resolve;
        tmp.src = url;
      });
      imgEl.src                   = url;
      imgEl.style.maxHeight       = '380px';
      imgEl.style.maxWidth        = '580px';
      imgEl.style.width           = 'auto';
      imgEl.style.height          = 'auto';
      imgEl.style.objectFit       = 'contain';
      imgEl.style.borderRadius    = '12px';
      imgEl.style.background      = '#fff';
      imgEl.style.padding         = '8px';
      imgEl.style.boxShadow       = '0 4px 16px rgba(0,0,0,0.4)';
      imgBox.style.display        = 'flex';
      imgBox.style.justifyContent = 'center';
      imgBox.style.margin         = '12px 0 16px';
    }

    // Alternativas
    const alternativas  = this._embaralharRespostas(q);
    const letras        = ['A', 'B', 'C', 'D', 'E'];
    const container     = document.getElementById('quiz-alternativas');
    container.innerHTML = '';

    const temImagemNasAlts = alternativas.some(a => a.image_url);

    if (temImagemNasAlts) {
      container.style.display             = 'grid';
      container.style.gridTemplateColumns = 'repeat(2, 1fr)';
      container.style.gap                 = '16px';
      container.style.width               = '80%';
      container.style.margin              = '20px auto';

      // Loader discreto enquanto precarrega imagens das alternativas
      container.innerHTML = `
        <div style="
          grid-column:1/-1;
          display:flex;align-items:center;justify-content:center;gap:10px;
          padding:24px;color:rgba(255,255,255,0.4);
          font-family:var(--fonte-corpo);font-size:0.9rem;
        ">
          <div style="
            width:20px;height:20px;
            border:3px solid rgba(255,255,255,0.15);
            border-top-color:var(--cor-tema-botao,#EDB21A);
            border-radius:50%;
            animation:spin 0.8s linear infinite;
          "></div>
          Carregando...
        </div>
      `;

      // Precarrega todas as imagens em paralelo
      await Promise.all(alternativas.map(alt => {
        if (!alt.image_url) return Promise.resolve();
        return new Promise(resolve => {
          const tmp = new Image();
          tmp.onload = tmp.onerror = resolve;
          tmp.src = alt.image_url;
        });
      }));

      container.innerHTML = ''; // limpa loader

    } else {
      container.style.display      = 'flex';
      container.style.flexDirection = 'column';
      container.style.width        = '100%';
      container.style.margin       = '';
    }

    alternativas.forEach((alt, i) => {
      const btn = document.createElement('button');
      btn.className = 'btn-alternativa';

      if (temImagemNasAlts && alt.image_url) {
        btn.style.display       = 'flex';
        btn.style.flexDirection = 'column';
        btn.style.alignItems    = 'center';
        btn.style.gap           = '10px';
        btn.style.minHeight     = '140px';
        btn.style.padding       = '12px';
        btn.innerHTML = `
          <span class="badge-letra" style="align-self:flex-start">${letras[i]}</span>
          <img src="${alt.image_url}"
               alt="Alternativa ${letras[i]}"
               style="max-height:110px;max-width:100%;object-fit:contain;border-radius:8px;background:#fff;padding:6px;">
        `;
      } else {
        btn.innerHTML = `
          <span class="badge-letra">${letras[i]}</span>
          <span>${sanitizar(alt.texto)}</span>
        `;
      }

      btn.onclick = () => this._responder(btn, alt.correta, alternativas);
      container.appendChild(btn);
    });

    // Libera após tudo montado
    setTimeout(() => { this.respostasBloqueadas = false; }, 1000);
  },

  _responder(btnClicado, correta, alternativas) {
    if (this.respostasBloqueadas) return;
    this.respostasBloqueadas = true;

    if (correta) {
      this.acertos++;
      btnClicado.classList.add('correta');
      Som.acerto();
    } else {
      btnClicado.classList.add('errada');
      Som.erro();
      const btns       = document.querySelectorAll('.btn-alternativa');
      const idxCorreta = alternativas.findIndex(a => a.correta);
      btns[idxCorreta]?.classList.add('correta');
    }

    document.querySelectorAll('.btn-alternativa').forEach(b => b.disabled = true);

    setTimeout(() => {
      this.indexAtual++;
      this._exibirQuestao();
    }, 1500);
  },

  async _finalizar() {
    const nota  = this.acertos;
    const mundo = Session.mundoAtual;

    // Mostra loading
    const overlay = document.createElement('div');
    overlay.id = 'quiz-loading';
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

    Session.salvarNota(mundo, nota);
    await Aluno.registrarAluno();
    await this._salvarResultado(nota);

    if (Session.totalCompletos() >= 2) {
      overlay.remove();
      ResultadoFinal.exibir();
      return;
    }

    const fundos = {
      matematica: 'assets/imagens/resultado_matematica.png',
      portugues:  'assets/imagens/resultado_portugues.png'
    };

    await new Promise(resolve => {
      const img = new Image();
      img.onload = img.onerror = resolve;
      img.src = fundos[mundo] || '';
    });

    overlay.remove();
    this._exibirResultadoMundo(nota);
    irPara('tela-resultado-mundo');
  },

  _exibirResultadoMundo(nota) {
    const mundo   = Session.mundoAtual;
    const nomes   = { matematica: 'Matemática', portugues: 'Português' };
    const proximo = mundo === 'matematica' ? 'Português' : 'Matemática';
    const fundos  = {
      matematica: "url('assets/imagens/resultado_matematica.png')",
      portugues:  "url('assets/imagens/resultado_portugues.png')"
    };

    const fundo = document.getElementById('res-mundo-fundo');
    if (fundo) fundo.style.backgroundImage = fundos[mundo] || '';

    const nomeEl = document.getElementById('res-mundo-nome');
    if (nomeEl) nomeEl.style.display = 'none';

    const totalCompletos = Session.totalCompletos();
    const msgEl    = document.getElementById('res-mundo-msg');
    const btnProx  = document.getElementById('btn-proximo-mundo');
    const btnFinal = document.getElementById('btn-resultado-final');
    const labelEl  = document.getElementById('res-label-nota');

    if (totalCompletos < 2) {
      if (labelEl) labelEl.style.display = 'block';

      let linha1 = '';
      let linha3 = '';

      if (nota >= 7) {
        linha1 = mundo === 'matematica'
          ? `Você mandou muito bem em ${nomes[mundo]}!`
          : `As palavras são sua força em ${nomes[mundo]}!`;
        linha3 = `Agora conclua ${proximo} e complete sua missão!`;
      } else if (nota >= 4) {
        linha1 = `Você está no caminho certo!`;
        linha3 = `Conclua ${proximo} e mostre do que é capaz!`;
      } else {
        linha1 = `Continue firme! Você consegue!`;
        linha3 = `É hora de explorar ${proximo} e virar esse jogo!`;
      }

      const nomeCompleto = [Session.nomeAluno, Session.sobrenomeAluno].filter(Boolean).join(' ');

      msgEl.style.marginTop = '-40px';
      msgEl.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;gap:10px;">
          <span style="
            color:#FFFFFF;
            font-weight:800;
            font-size:1.3em;
            text-align:center;
            -webkit-text-stroke:1.5px #000;
          ">${linha1}</span>
          <span style="
            color:#FFD700;
            font-weight:900;
            font-size:1.9em;
            text-align:center;
            letter-spacing:1px;
            -webkit-text-stroke:2px #000;
          ">${nomeCompleto}</span>
          <span style="
            color:#FFFFFF;
            font-weight:800;
            font-size:1.2em;
            text-align:center;
            max-width:680px;
            line-height:1.4;
            -webkit-text-stroke:1.5px #000;
          ">${linha3}</span>
        </div>
      `;

      if (btnProx)  { btnProx.style.display = 'flex'; btnProx.textContent = '🗺️ Continuar'; }
      if (btnFinal) { btnFinal.style.display = 'none'; }

    } else {
      if (labelEl) labelEl.style.display = 'none';
      msgEl.textContent = '';
      if (btnProx)  btnProx.style.display  = 'none';
      if (btnFinal) btnFinal.style.display = 'none';
      setTimeout(() => ResultadoFinal.exibir(), 1500);
    }
  },

  async _salvarResultado(nota) {
    try {
      const turma = Session.codigoTurma !== 'Livre' ? Session.codigoTurma : null;
      await fetch('/api/resultado', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome:         Session.nomeAluno,
          sobrenome:    Session.sobrenomeAluno || null,
          turma_codigo: turma,
          turma_id:     Session.turmaId || null,
          aluno_id:     Session.alunoId || null,
          mundo:        Session.mundoAtual,
          nota,
          acertos:      this.acertos,
          total:        this.totalQuestoes
        })
      });
    } catch (e) {
      console.warn('[Quiz] Não foi possível salvar resultado:', e);
    }
  },

  async _aplicarTema(mundo) {
    const tema = this._cores[mundo] || this._cores.matematica;
    const root = document.documentElement;
    root.style.setProperty('--cor-tema-botao', tema.botao);
    root.style.setProperty('--cor-tema-badge', tema.badge);
    root.style.setProperty('--cor-tema-texto', tema.texto);

    const fundos = {
      matematica: 'assets/imagens/quiz_matematica.png',
      portugues:  'assets/imagens/quiz_portugues.png'
    };

    await new Promise(resolve => {
      const img = new Image();
      img.onload = img.onerror = resolve;
      img.src = fundos[mundo] || '';
    });

    const fundo = document.getElementById('quiz-fundo');
    if (fundo) fundo.style.backgroundImage = `url('${fundos[mundo]}')`;

    const tag = document.getElementById('quiz-mundo-tag');
    if (tag) tag.textContent = mundo === 'matematica' ? 'MATEMÁTICA' : 'PORTUGUÊS';
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
    const answers = Array.isArray(q.answers) ? q.answers : JSON.parse(q.answers);

    const respostas = answers.map((alt, i) => {
      if (typeof alt === 'object' && alt !== null) {
        return {
          texto:     alt.texto || '',
          image_url: alt.image_url || null,
          correta:   i === q.correct_index
        };
      }
      return {
        texto:     alt,
        image_url: null,
        correta:   i === q.correct_index
      };
    });

    return this._embaralhar(respostas);
  }
};