export type Priority = 'baixa' | 'media' | 'alta';
export type Status = 'inbox' | 'hoje' | 'semana' | 'concluida';

export interface SubTaskItem {
  id: string;
  title: string;
  completed: boolean;
}

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
  items: SubTaskItem[];
}

export interface Task {
  id: string;
  title: string;
  subject: string;
  priority: Priority;
  status: Status;
  userId: string;
  createdAt: any; // Firestore Timestamp
  updatedAt?: any; // Firestore Timestamp for last modification
  
  // New Module Features
  subtasks: SubTask[];
  questionsTotal: number;
  questionsCorrect: number;
  theoryCompleted: boolean;
  flashcardsCompleted: boolean;
  difficulty: number; // 1, 2, 3
  notes: string;
  pomodoros: number; // Number of pomodoros used
  estimatedPomodoros?: number; // Estimated pomodoros
  tags?: string[]; // Custom tags
  liquidTime?: number; // Total focused time in seconds
  totalTime?: number; // Total time including pauses in seconds
}

export interface ActiveSession {
  taskId: string;
  taskTitle: string;
  status: 'idle' | 'running' | 'paused' | 'break' | 'break-paused' | 'completed';
  mode: 'pomodoro' | 'flowtime';
  startTime?: any;
  endAt?: any;
  timeLeftAtPause?: number;
  timeElapsed: number;
  focusCycles: number;
  lastSyncedLiquidTime: number;
  updatedAt: any;
}

// ============================================================================
// NOVO: Tipos para EduStuffsPanel (Mood Tracker, Desafio 120 Dias, To-Do List)
// ============================================================================

export type EduStuffCategory = string;

export type EduStuffHabitType = 
  | 'leitura_120'      // Desafio: 5 páginas por dia durante 120 dias
  | 'atividade_120'    // Desafio: Atividade física por 120 dias no ano
  | 'custom';          // Hábito personalizado criado pelo usuário

export interface EduStuff {
  id: string;
  userId: string;
  title: string;
  type: 'todo' | 'habit';
  completed: boolean;
  streak: number;
  lastCompletedAt: any | null; // Firestore Timestamp
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
  completedDates?: string[]; // Array of YYYY-MM-DD for heatmap
  
  // Novos campos para categorização e desafios
  category?: string;
  habitType?: EduStuffHabitType;
  progress?: number;        // Para desafios 120 dias (0-120)
  targetDays?: number;      // Meta de dias (ex: 120)
  
  // Detalhes Elite
  description?: string;
  subtasks?: Array<{ id: string; text: string; completed: boolean }>;
  isDeferred?: boolean;
  scheduledTime?: string;   // Formato 'HH:mm'
  reminderSent?: boolean;
}
