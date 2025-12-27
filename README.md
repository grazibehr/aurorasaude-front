### `Pós-Graduação em Desenvolvimento FullStack @PUC-RIO – MVP` 

🔗 **Demo (Produção):** https://aurorasaude-front.vercel.app

# 🌌 Aurora Saúde – Frontend

Este frontend corresponde ao **MVP** desenvolvido na disciplina *Desenvolvimento FullStack Básico* do curso de Pós-Graduação em Desenvolvimento FullStack da **PUC-Rio**.  

O sistema **Aurora Saúde** tem como finalidade auxiliar no **registro e monitoramento de sintomas de saúde**, de forma simples e acessível, visando apoiar o acompanhamento cotidiano do usuário.

---

#

## Funcionalidades

- Registro diário de sintomas (ex.: dor, febre, enjoo, fadiga).

- Filtro por data e tipo de sintoma.

- Histórico exibido em formato de cards.

- Campo de observações para contexto clínico.
  
- Geração de insights com identificação de padrões de sintomas (ex.: dor aumentando ou diminuindo, recorrência de sintomas).

---

## Tecnologias

- **HTML5** → estrutura da aplicação.  
- **CSS3** → customizações adicionais.  
- **JavaScript** → interatividade, manipulação do DOM e armazenamento local.
- **Tailwind CSS (via CDN)** → estilização rápida e responsiva.
- **Lucide Icons (via CDN)** → ícones modernos e leves para a interface.

---

## Estrutura do Projeto

```bash
frontend/
 ├── index.html              
 ├── assets/                 # Recursos estáticos
 │   ├── css/                # Estilos adicionais
 │   │   ├── base.css
 │   │   ├── components.css
 │   │   └── layout.css
 │   └── js/                 # Scripts organizados em módulos
 │       ├── hooks/         
 │       │   ├── analytics.js
 │       │   ├── auth.js
 │       │   ├── health-tips.js
 │       │   ├── home-insights.js
 │       │   ├── home.js
 │       │   └── symptom-form.js
 │       ├── routes/         # Definição de rotas
 │       │   └── index.js
 │       ├── services/       # Serviços de comunicação com backend
 │       │   ├── auth.js
 │       │   ├── symptoms.js
 │       │   └── user-symptoms.js
 │       ├── script.js       # Script principal de inicialização
 │       └── sidebar.js      # Controle do menu lateral
 └── README.md               

```
---

## Como rodar o projeto

### 1. Clonar o repositório

```bash
git clone https://github.com/grazibehr/aurorasaude-front

cd aurorasaude-front
```

### 2. Abra o arquivo index.html diretamente no navegador.
(não há necessidade de servidor local para este MVP)

---


## 👩‍💻 Autoria

Desenvolvido por [@grazielabehrens](https://github.com/grazibehr)              
Desenvolvedora FullStack • Graduada em Ciência da Computação  
Pós-graduanda em Desenvolvimento FullStack – PUC-Rio
LinkedIn: [linkedin.com/in/grazielabehrens](https://www.linkedin.com/in/grazielabehrens/) 
