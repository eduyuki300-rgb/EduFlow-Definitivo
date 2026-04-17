import { CalendarDays, CalendarRange, History, Inbox } from 'lucide-react';

export const APP_TABS = [
  { id: 'hoje', label: 'Hoje', icon: CalendarDays },
  { id: 'semana', label: 'Semana', icon: CalendarRange },
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'concluida', label: 'Histórico', icon: History },
] as const;

export type AppTab = typeof APP_TABS[number]['id'];
