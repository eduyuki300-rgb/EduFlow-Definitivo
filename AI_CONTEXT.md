# IA Context - EduFlow Project

Este documento serve como guia para que outras IAs (Claude, ChatGPT, etc.) entendam o projeto EduFlow rapidamente.

## 🏗 Arquitetura
- **Core**: React + TypeScript + Vite.
- **Backend**: Firebase Firestore (Banco de dados) & Firebase Auth (Autenticação).
- **Estilo**: Vanilla CSS (layout principal) + Tailwind CSS (componentes e utilitários).
- **Gerenciamento de Estado**: Hooks customizados e Context API.

## 🔑 Componentes Principais
1. **`useFocusSession.ts`**: O coração do Pomodoro. Gerencia o timer, transições entre modo Pomodoro e Cronômetro, sincronização entre abas e notificações.
2. **`useTasks.ts`**: Motor de sincronização de tarefas. Implementa uma estratégia de "Sync Buffer" para evitar excesso de escritas no Firebase.
3. **`App.tsx`**: Contém o `TaskModal` (editor) e a lógica principal da dashboard.
4. **`FocusMode.tsx`**: Interface imersiva de foco.

## 📜 Regras de Negócio Importantes
- **Sincronização**: As tarefas são salvas no Firestore de forma otimizada. Não remova o `syncStatus`.
- **Modo Estrito**: Se ativado no Pomodoro, as pausas começam automaticamente após o foco.
- **Expansão Global**: Existe um evento customizado `eduflow-global-expand` que abre/fecha todos os `TaskCard` ao mesmo tempo.

## 🛠 Ferramentas Recomendadas para IA
Para dar todo o contexto deste repositório para uma IA de uma vez, use o **Repomix**:
1. No terminal: `npx repomix`
2. Isso gerará um arquivo `repomix-output.txt`.
3. Anexe esse arquivo ao chat de qualquer IA para que ela "leia" todo o seu projeto instantaneamente.
