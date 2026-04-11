# 🧠 Contexto do Projeto: StudyFlow

Este documento serve como o **System Prompt / Contexto Principal** para qualquer Inteligência Artificial (Claude, Qwen, Cursor, Antigravity, ChatGPT, etc.) que for atuar no repositório do **StudyFlow**. 

Ao ler este arquivo, a IA deve assumir o papel de um Engenheiro de Software Sênior e Product Designer especializado em interfaces "aesthetic", produtividade e integração com Firebase.

---

## 🎯 Visão Geral do Produto
O **StudyFlow** é um aplicativo pessoal de produtividade e organização de estudos de alto rendimento, projetado especificamente para a preparação do **ENEM 2026**. 
O objetivo central é resolver dores de organização semanal, fornecendo visão clara de tarefas, registro de métricas de estudo (questões, acertos, tempo líquido vs bruto), e acompanhamento de metas baseadas em OKRs. O app também prevê uma forte integração com agentes de IA (Gemini Pro) para atuar como tutor e planejador estratégico.

## 🛠️ Stack Tecnológico
- **Frontend:** React 19, TypeScript, Vite.
- **Estilização:** Tailwind CSS (foco em utilitários, sem arquivos CSS externos além do global).
- **Animações & Ícones:** `motion` (Framer Motion) para transições suaves e `lucide-react` para ícones.
- **Backend/BaaS:** Firebase (Authentication com Google, Firestore para banco de dados em tempo real).
- **IA:** `@google/genai` (SDK do Gemini).

## 🎨 Diretrizes de Design (Aesthetic & UI/UX)
O design é uma prioridade absoluta. O usuário exige uma interface que transmita calma, organização e estrutura ("aesthetic").
- **Cores:** Tons pastel, fundos translúcidos (`bg-white/50`, `bg-white/80`), textos em tons de cinza escuro (`text-gray-700`, `text-gray-500`) para reduzir o cansaço visual.
- **Formas:** Bordas bem arredondadas (`rounded-2xl`, `rounded-3xl`, `rounded-full`).
- **Sombras e Profundidade:** Sombras muito suaves (`shadow-sm`, `shadow-md`), efeitos de glassmorphism (desfoque de fundo, bordas brancas semi-transparentes).
- **Feedback Visual e Sonoro:** Animações de hover, transições de estado suaves, e sons satisfatórios ao concluir tarefas.
- **Responsividade:** O layout deve funcionar perfeitamente tanto em Desktop quanto em Mobile.

## ⚙️ Estrutura de Dados (Firestore)
A entidade principal é a `Task` (Tarefa), que possui a seguinte estrutura (ver `src/types.ts`):
- `status`: 'inbox' | 'hoje' | 'semana' | 'concluida'
- `subject`: Matéria (Ex: Matemática, Física, Geral)
- `priority`: 'baixa' | 'media' | 'alta'
- `subtasks`: Array de checklists.
- `metrics`: `questionsTotal`, `questionsCorrect`, `theoryCompleted`, `flashcardsCompleted`.
- `time`: `pomodoros`, `liquidTime` (tempo de foco), `totalTime` (foco + pausas).
- `difficulty`: 1 a 5 estrelas.
- `tags`: Array de strings para categorização estratégica.

## 🧩 Módulos e Funcionalidades Atuais
1. **Inbox:** Captura rápida de ideias e tarefas sem data.
2. **Semana (Smart Table):** Uma tabela inteligente com filtros (por status e matéria), barra de busca, dropdowns para mudança rápida de status e visualização rica de dados (progresso, tempo, tags). *Nota: Substituiu um Kanban antigo para melhor visualização de dados.*
3. **Hoje:** Foco do dia. Exibe as tarefas em andamento.
4. **Histórico:** Tarefas concluídas e métricas gerais.
5. **Pomodoro Widget:** Um cronômetro flutuante e minimizável. Possui modos de Foco, Pausa e Descanso. **Regra de Negócio Importante:** Ao clicar em "Salvar", o sistema *deve* exibir uma confirmação ("Deseja salvar o tempo registrado?") antes de gravar no Firestore, permitindo o descarte do tempo.

## 🛑 Regras Estritas para Agentes de IA
1. **NÃO REMOVA ABAS:** Nunca remova as abas existentes (Inbox, Hoje, Semana, Histórico). Apenas melhore-as.
2. **Sincronização em Tempo Real:** Todas as ações de CRUD devem ser refletidas no Firestore usando `onSnapshot` para leitura e `updateDoc`/`addDoc` para escrita. Não use estados locais que não sincronizem com o banco.
3. **Mantenha o Padrão Visual:** Ao criar novos componentes, siga estritamente o padrão de cores pastel, bordas arredondadas e ícones do Lucide.
4. **Edição de Cartões:** A janela de edição de tarefas (`TaskModal`) é um ponto crítico. Ela deve ser robusta, permitindo editar todos os metadados (tags, tempo, questões, subtarefas) de forma intuitiva.
5. **Código Limpo e Modular:** Mantenha o código organizado. Se um arquivo (como `App.tsx`) ficar muito grande, proponha a componentização de forma segura.
6. **Integração com IA:** O app exportará dados para o Gemini e importará planejamentos. Mantenha a estrutura de dados previsível para facilitar a geração de prompts estruturados.

## 🚀 Próximos Passos (Roadmap do Usuário)
- Refinamento contínuo da janela de edição de tarefas.
- Implementação de sistema de OKRs e metas sugeridas pela IA.
- Geração de relatórios de exportação para o Gemini analisar o rendimento.
- Melhorias nas animações de fundo (chuva, neve) e gamificação leve.
