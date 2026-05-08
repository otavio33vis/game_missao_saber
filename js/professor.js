// ── Modo Professor ───────────────────────────────────────────────────────────
const Professor = {
  resultados: [],

  async carregar() {
    await this.carregarResultados();
    this.renderizarPainel();
  },

  async carregarResultados() {
    try {
      const res = await fetch('/api/resultados');
      this.resultados = await res.json();
    } catch (e) {
      this.resultados = [];
    }
  },

  renderizarPainel() {
    const painel = document.getElementById('tela-professor-painel');
    if (!painel) return;

    // Agrupa por aluno
    const alunos = {};
    this.resultados.forEach(r => {
      const key = `${r.nome}__${r.turma}`;
      if (!alunos[key]) alunos[key] = { nome: r.nome, turma: r.turma, notas: {} };
      alunos[key].notas[r.mundo] = r.nota;
    });

    const lista = Object.values(alunos);
    const media = a => {
      const v = Object.values(a.notas);
      return v.length ? (v.reduce((x,y)=>x+y,0)/v.length).toFixed(1) : '-';
    };

    document.getElementById('prof-tabela-body').innerHTML = lista.length
      ? lista.map(a => `
          <tr>
            <td>${a.nome}</td>
            <td>${a.turma}</td>
            <td>${a.notas.matematica ?? '-'}</td>
            <td>${a.notas.portugues ?? '-'}</td>
            <td><strong>${media(a)}</strong></td>
          </tr>`).join('')
      : '<tr><td colspan="5" style="text-align:center;opacity:0.5">Nenhum resultado ainda</td></tr>';

    document.getElementById('prof-total').textContent = lista.length;
  },

  exportarCSV() {
    const alunos = {};
    this.resultados.forEach(r => {
      const key = `${r.nome}__${r.turma}`;
      if (!alunos[key]) alunos[key] = { nome: r.nome, turma: r.turma, notas: {} };
      alunos[key].notas[r.mundo] = r.nota;
    });

    const linhas = [['Nome','Turma','Matemática','Português','Média']];
    Object.values(alunos).forEach(a => {
      const v = Object.values(a.notas);
      const med = v.length ? (v.reduce((x,y)=>x+y,0)/v.length).toFixed(1) : '';
      linhas.push([a.nome, a.turma, a.notas.matematica??'', a.notas.portugues??'', med]);
    });

    const csv  = linhas.map(l => l.join(';')).join('\n');
    const blob = new Blob(['\uFEFF'+csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href  = url;
    link.download = `missao-saber-resultados-${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
};
