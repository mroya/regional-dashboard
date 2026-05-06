# 📊 Regional Sales Dashboard

> **Uma solução analítica premium para gestão de performance regional em tempo real.**

Este projeto é um dashboard de vendas avançado, desenvolvido para gerentes regionais que precisam de agilidade na interpretação de dados e no acompanhamento de metas. Com uma interface moderna (Glassmorphism) e processamento inteligente de relatórios PDF, ele transforma dados brutos em insights acionáveis em segundos.

![Preview do Dashboard](file:///C:/Users/roya/.gemini/antigravity/brain/970f4676-dbb1-4d27-a862-bd2f12a052d3/regional_dashboard_mockup_1778108514642.png)

---

## 🚀 Funcionalidades Principais

-   **📈 Visualização de Performance**: Gráficos interativos com projeção de fechamento mensal.
-   **📄 Parser de PDF Inteligente**: Upload de relatórios PDF com extração automática de dados de filiais e departamentos.
-   **🟢 Sinalização Condicional**: Alertas visuais instantâneos para filiais abaixo da meta.
-   **💬 Integração com WhatsApp**: Compartilhamento de resultados regionais ou individuais diretamente para os gerentes com um clique.
-   **🔐 Autenticação Segura**: Gerenciamento de acesso via Firebase Auth.
-   **🌓 Modo Dark/Light**: Interface adaptável para qualquer ambiente de trabalho.
-   **🌦️ Widgets Integrados**: Relógio em tempo real e previsão do tempo local via API.

---

## 🛠️ Stack Tecnológica

-   **Frontend**: [Next.js 16](https://nextjs.org/) (App Router), React 19.
-   **Estilização**: Tailwind CSS 4 & Vanilla CSS (Custom Design System).
-   **Banco de Dados**: [Firebase Firestore](https://firebase.google.com/).
-   **Gráficos**: [Recharts](https://recharts.org/).
-   **Ícones**: [Lucide React](https://lucide.dev/).
-   **Processamento**: [pdf2json](https://github.com/modesty/pdf2json).

---

## ⚙️ Instalação e Configuração

### Pré-requisitos
- Node.js 18+
- Conta no Firebase

### Passo a Passo

1.  **Clonar o repositório**:
    ```bash
    git clone https://github.com/seu-usuario/regional-dashboard.git
    cd regional-dashboard
    ```

2.  **Instalar dependências**:
    ```bash
    npm install
    ```

3.  **Configurar variáveis de ambiente**:
    Crie um arquivo `.env.local` na raiz e adicione suas credenciais do Firebase:
    ```env
    NEXT_PUBLIC_FIREBASE_API_KEY=sua_key
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu_dominio
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu_id
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seu_bucket
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
    NEXT_PUBLIC_FIREBASE_APP_ID=seu_app_id
    ```

4.  **Executar em desenvolvimento**:
    ```bash
    npm run dev
    ```

---

## 📱 Estrutura do Projeto

```text
├── app/                # Rotas e interface do Dashboard
│   ├── api/            # API routes (ex: PDF parser)
│   └── globals.css     # Estilização global e variáveis
├── lib/                # Configurações do Firebase e utilitários
├── public/             # Assets estáticos
└── package.json        # Dependências e scripts
```

---

## 🤝 Contribuição

Contribuições são o que fazem a comunidade open source um lugar incrível para aprender, inspirar e criar. Qualquer contribuição que você fizer será **muito apreciada**.

1. Faça um Fork do projeto
2. Crie uma Branch para sua Feature (`git checkout -b feature/AmazingFeature`)
3. Insira suas alterações (`git commit -m 'Add some AmazingFeature'`)
4. Envie para a Branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

---

## 📄 Licença

Distribuído sob a licença MIT. Veja `LICENSE` para mais informações.

---

<p align="center">
  Desenvolvido com ❤️ para otimização de resultados.
</p>
