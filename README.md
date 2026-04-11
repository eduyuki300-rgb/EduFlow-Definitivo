# StudyFlow (EduFlow)

Um aplicativo pessoal de produtividade e organização de estudos de alto rendimento, projetado especificamente para a preparação de exames como o ENEM.

## Tecnologias
- React 19 + Vite
- TypeScript
- Tailwind CSS
- Firebase (Auth + Firestore)
- Gemini API (Backend)

## Como Executar Localmente

1. **Instale as dependências:**
   ```bash
   npm install
   ```

2. **Configure as Variáveis de Ambiente:**
   Crie um arquivo `.env` na raiz do projeto copiando o `.env.example`:
   ```bash
   cp .env.example .env
   ```
   Preencha as variáveis do Firebase e a chave do Gemini (`GEMINI_API_KEY`).

3. **Inicie o Servidor de Desenvolvimento:**
   ```bash
   npm run dev
   ```
   Isso iniciará o servidor Express na porta 3000, que também servirá o frontend via middleware do Vite.

## Estrutura de Pastas
- `src/components`: Componentes reutilizáveis (Pomodoro, BackgroundEffects).
- `src/App.tsx`: Componente principal e rotas.
- `server.ts`: Backend Express para rotas seguras (ex: `/api/gemini`).

## API Routes
- `GET /api/health`: Verifica o status do servidor.
- `POST /api/gemini`: Rota segura para processar requisições para a IA do Gemini (extração de dados de imagens).
