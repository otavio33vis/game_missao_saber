# Missão Saber — Web

Quiz educativo para Escola Municipal. HTML/CSS/JS + Node.js backend.

---

## Estrutura de Pastas

```
missao-saber-web/
  ├── index.html              ← arquivo principal (todas as telas)
  ├── css/
  │     └── style.css         ← estilos globais
  ├── js/
  │     ├── game.js           ← lógica de sessão e navegação
  │     ├── quiz.js           ← motor do quiz
  │     └── professor.js      ← painel do professor
  ├── api/
  │     └── server.js         ← backend Node.js (porta 3000)
  ├── data/
  │     ├── question_bank.json ← banco de questões
  │     └── resultados.json    ← resultados dos alunos (gerado automaticamente)
  └── assets/
        └── imagens/           ← COLOQUE AS IMAGENS AQUI
```

---

## Imagens Necessárias

Coloque em `assets/imagens/` com exatamente esses nomes:

| Arquivo                    | Onde aparece              |
|----------------------------|---------------------------|
| `menu.png`                 | Tela de login/menu        |
| `mapa.png`                 | Tela do mapa              |
| `quiz_matematica.png`      | Fundo do bloco Matemática |
| `quiz_portugues.png`       | Fundo do bloco Português  |
| `resultado_matematica.png` | Tela resultado Matemática |
| `resultado_portugues.png`  | Tela resultado Português  |
| `resultado_final.png`      | Tela resultado final      |
| `fundo_login.png`          | Tela login professor      |

---

## Como Executar Localmente

### Requisitos
- Node.js instalado (https://nodejs.org)

### Passos
```bash
# 1. Entra na pasta do projeto
cd missao-saber-web

# 2. Inicia o servidor
node api/server.js

# 3. Acessa no navegador
http://localhost:3000
```

Pronto! O jogo abre no navegador.

---

## Como Editar no VSCode

1. Abre a pasta `missao-saber-web` no VSCode
2. Edita os arquivos normalmente
3. Salva e recarrega o navegador (F5)
4. Para editar questões: edita `data/question_bank.json`

---

## Credenciais Padrão

| Tipo      | Usuário | Senha |
|-----------|---------|-------|
| Professor | admin   | 123   |

---

## Deploy no Servidor (Hetzner)

```bash
# Copia os arquivos para o servidor
scp -i ~/.ssh/hetzner_key -r ./* root@178.104.144.144:/opt/missao-saber-web/

# No servidor, instala dependências (apenas primeira vez)
ssh -i ~/.ssh/hetzner_key root@178.104.144.144
cd /opt/missao-saber-web
node api/server.js &
```

---

## Adicionando Questões

Edite `data/question_bank.json`. Cada questão segue esse formato:

```json
{
  "id": 21,
  "category": "Matematica",
  "text": "Texto da pergunta aqui",
  "image_path": "",
  "answers": ["Opção A", "Opção B", "Opção C", "Opção D", "Opção E"],
  "correct_index": 2,
  "points": 1
}
```

- `category`: `"Matematica"` ou `"Portugues"`
- `correct_index`: índice da resposta correta (0 = primeira opção)
- `image_path`: deixe `""` se não tiver imagem, ou coloque o caminho ex: `"assets/imagens/q21.png"`
