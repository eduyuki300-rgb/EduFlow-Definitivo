# IA Context - EduFlow Project

Este documento serve como guia para que outras IAs (Claude, ChatGPT, etc.) entendam o projeto EduFlow rapidamente.

## 🏗 Arquitetura
- **Core**: React 19 + TypeScript + Vite.
- **Backend**: Node.js (Express) servindo o Frontend e APIs seguras.
- **Banco**: Firebase Firestore (Banco de dados) & Firebase Auth (Autenticação).
- **IA**: Google Gemini 2.0 (SDK `@google/genai` v1.49.0) integrado via `/api/gemini`.
- **Estilo**: Vanilla CSS (Premium Design) + Tailwind CSS (Utilidades).

## 🔑 Componentes Principais
1. **`server.ts`**: Backend Express que gerencia o middleware do Vite, autenticação de rotas via Google Identity e ponte segura para o Gemini 2.0.
2. **`useFocusSession.ts`**: O coração do Pomodoro. Gerencia o timer, transições, sincronização entre abas e notificações.
3. **`useTasks.ts`**: Motor de sincronização de tarefas com estratégia de "Sync Buffer".
4. **`App.tsx`**: Dashboard unificada com Micro-dashboard de métricas diárias e TaskModal.

## 📜 Regras de Negócio Importantes
- **Sincronização**: Tarefas usam `syncStatus` para feedback visual de persistência na nuvem.
- **Estabilidade**: O servidor gerencia automaticamente conflitos de porta (EADDRINUSE) e possui tratamento de erros robusto para a IA.
- **Assets**: Favicon premium gerado por IA para evitar erros 404 e manter estética profissional.

## 🛠 Ferramentas Recomendadas para IA
Para contexto total, use o **Repomix**:
1. Terminal: `npx repomix`
2. Isso gerará `repomix-output.txt`.
3. Anexe este arquivo ao chat para "leitura" instantânea de todo o projeto.
