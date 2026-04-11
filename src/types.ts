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
