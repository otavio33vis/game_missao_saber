<img width="1867" height="921" alt="missao_saber" src="https://github.com/user-attachments/assets/1295d693-f40d-429e-9abb-17938db5ffee" /># 🎮 Missão Saber

Quiz educativo gamificado desenvolvido para alunos do Ensino Fundamental da rede pública de Cascavel — PR.

O jogo apresenta questões de **Matemática** e **Português** em uma interface com mapa de mundos, sistema de pontuação e ranking por turma — tudo acessível pelo navegador, sem instalação.
<img width="1867" height="921" alt="missao_saber" src="https://github.com/user-attachments/assets/2bffa5c6-e18c-464c-a720-ac9b431f73df" />

---

## ✨ Funcionalidades

- 🗺️ Mapa de mundos com dois blocos: Matemática e Português
- ❓ 10 questões por matéria, embaralhadas a cada sessão
- 🖼️ Suporte a imagens nas questões e nas alternativas
- 🏆 Ranking por turma em tempo real
- 📊 Painel do professor com resultados, filtros e exportação CSV
- 👩‍🏫 Gerenciamento de turmas e questões por professor
- 🔐 Autenticação com senha criptografada (bcrypt)
- 📱 Layout responsivo (desktop e mobile)

---

## 🛠️ Stack

| Camada | Tecnologia |
|---|---|
| Frontend | HTML, CSS, JavaScript puro |
| Backend | Node.js (http nativo) |
| Banco de dados | PostgreSQL 15 |
| Infra | Docker, Nginx, PM2 |
| Servidor | Hetzner CPX22 — Ubuntu 22.04 |

---

## 📁 Estrutura do Projeto

```
missao-saber-html/
├── index.html              ← telas do aluno
├── professor.html          ← painel do professor
├── css/
│   └── style.css
├── js/
│   ├── utils.js            ← funções compartilhadas
│   ├── session.js          ← estado da sessão do aluno
│   ├── quiz.js             ← motor do quiz
│   ├── mapa.js             ← navegação entre mundos
│   ├── turmas.js           ← gerenciamento de turmas
│   └── professor.js        ← painel e relatórios
├── api/
│   ├── server.js           ← backend Node.js
│   ├── package.json
│   └── .env.example        ← modelo de variáveis de ambiente
├── data/
│   └── question_bank.json  ← banco de questões padrão
├── assets/
│   └── imagens/            ← imagens do jogo
└── README.md
```

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- Node.js 16+
- PostgreSQL 15

### Passos

```bash
# 1. Clone o repositório
git clone https://github.com/otavio33vis/game_missaosaber.git
cd game_missaosaber

# 2. Instale as dependências
cd api
npm install

# 3. Configure o ambiente
cp .env.example .env
# Edite o .env com sua string de conexão PostgreSQL

# 4. Inicie o servidor
npm start

# 5. Acesse no navegador
http://localhost:3000
```

---

## ⚙️ Variáveis de Ambiente

Crie um arquivo `.env` dentro da pasta `api/` com base no `.env.example`:

```env
DATABASE_URL=postgresql://usuario:senha@localhost:5432/missaosaber
PORT=3000
```

---

## 🗄️ Banco de Dados

O schema completo está em `api/schema.sql`. As principais tabelas são:

| Tabela | Descrição |
|---|---|
| `professores` | Usuários do painel |
| `turmas` | Turmas cadastradas por professor |
| `questoes` | Questões por turma |
| `banco_questoes` | Banco global de questões |
| `alunos` | Alunos registrados |
| `resultados` | Resultados das partidas |
| `acessos` | Log de acessos |

---

## 🖼️ Imagens Necessárias

Coloque em `assets/imagens/` com exatamente esses nomes:

| Arquivo | Onde aparece |
|---|---|
| `menu.png` | Tela de login |
| `mapa.png` | Tela do mapa |
| `quiz_matematica.png` | Fundo do quiz de Matemática |
| `quiz_portugues.png` | Fundo do quiz de Português |
| `resultado_matematica.png` | Tela de resultado — Matemática |
| `resultado_portugues.png` | Tela de resultado — Português |
| `resultado_final.png` | Tela de resultado final |
| `fundo_login.png` | Tela de login do professor |

---

## 👩‍🏫 Painel do Professor

Acesse em `/professor.html`. Funcionalidades disponíveis:

- Cadastro e gerenciamento de turmas
- Criação de questões por turma (até 10 por matéria)
- Visualização de resultados por turma
- Filtros por aprovados/reprovados e busca por nome
- Exportação de resultados em CSV
- Gerenciamento de professores (apenas admin)

---

## 🔐 Segurança

- Senhas armazenadas com hash bcrypt (salt rounds: 10)
- Professores inativos não aparecem na listagem e não conseguem logar
- Inputs sanitizados no frontend para prevenção de XSS
- Variáveis de ambiente para todas as credenciais

---

## 📄 Licença

Este projeto foi desenvolvido como trabalho acadêmico para a disciplina de Engenharia de Software — [Univel](https://www.univel.br), em parceria com escola pública municipal de Cascavel — PR.

Uso educacional. Não possui fins comerciais.
