export interface SubjectInfo {
  emoji: string;
  cardBg: string;
  tagColor: string;
  primary: string;
  secondary: string;
  gradient: string;
  shadowColor: string;
}

export const SUBJECT_INFO: Record<string, SubjectInfo> = {
  'Matemática': { 
    emoji: '📐', 
    cardBg: 'bg-blue-50/70', 
    tagColor: 'bg-blue-100 text-blue-700 border-blue-200',
    primary: '#3b82f6',
    secondary: '#1d4ed8',
    gradient: 'from-blue-100/50 to-indigo-100/50',
    shadowColor: 'rgba(59, 130, 246, 0.2)'
  },
  'Português': { 
    emoji: '📚', 
    cardBg: 'bg-amber-50/70', 
    tagColor: 'bg-amber-100 text-amber-700 border-amber-200',
    primary: '#f59e0b',
    secondary: '#b45309',
    gradient: 'from-amber-100/50 to-orange-100/50',
    shadowColor: 'rgba(245, 158, 11, 0.2)'
  },
  'História': { 
    emoji: '📜', 
    cardBg: 'bg-orange-50/70', 
    tagColor: 'bg-orange-100 text-orange-700 border-orange-200',
    primary: '#f97316',
    secondary: '#c2410c',
    gradient: 'from-orange-100/50 to-red-100/50',
    shadowColor: 'rgba(249, 115, 22, 0.2)'
  },
  'Geografia': { 
    emoji: '🌍', 
    cardBg: 'bg-emerald-50/70', 
    tagColor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    primary: '#10b981',
    secondary: '#047857',
    gradient: 'from-emerald-100/50 to-teal-100/50',
    shadowColor: 'rgba(16, 185, 129, 0.2)'
  },
  'Biologia': { 
    emoji: '🧬', 
    cardBg: 'bg-green-50/70', 
    tagColor: 'bg-green-100 text-green-700 border-green-200',
    primary: '#22c55e',
    secondary: '#15803d',
    gradient: 'from-green-100/50 to-emerald-100/50',
    shadowColor: 'rgba(34, 197, 94, 0.2)'
  },
  'Física': { 
    emoji: '⚛️', 
    cardBg: 'bg-cyan-50/70', 
    tagColor: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    primary: '#06b6d4',
    secondary: '#0891b2',
    gradient: 'from-cyan-100/50 to-sky-100/50',
    shadowColor: 'rgba(6, 182, 212, 0.2)'
  },
  'Química': { 
    emoji: '🧪', 
    cardBg: 'bg-purple-50/70', 
    tagColor: 'bg-purple-100 text-purple-700 border-purple-200',
    primary: '#8b5cf6',
    secondary: '#6d28d9',
    gradient: 'from-purple-100/50 to-violet-100/50',
    shadowColor: 'rgba(139, 92, 246, 0.2)'
  },
  'Linguagens': { 
    emoji: '🗣️', 
    cardBg: 'bg-yellow-50/70', 
    tagColor: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    primary: '#eab308',
    secondary: '#a16207',
    gradient: 'from-yellow-100/50 to-orange-100/50',
    shadowColor: 'rgba(234, 179, 8, 0.2)'
  },
  'Humanas': { 
    emoji: '🏛️', 
    cardBg: 'bg-rose-50/70', 
    tagColor: 'bg-rose-100 text-rose-700 border-rose-200',
    primary: '#f43f5e',
    secondary: '#be123c',
    gradient: 'from-rose-100/50 to-pink-100/50',
    shadowColor: 'rgba(244, 63, 94, 0.2)'
  },
  'Redação': { 
    emoji: '✍️', 
    cardBg: 'bg-indigo-50/70', 
    tagColor: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    primary: '#6366f1',
    secondary: '#4338ca',
    gradient: 'from-indigo-100/50 to-blue-100/50',
    shadowColor: 'rgba(99, 102, 241, 0.2)'
  },
  'Geral': { 
    emoji: '📌', 
    cardBg: 'bg-gray-50/70', 
    tagColor: 'bg-gray-100 text-gray-700 border-gray-200',
    primary: '#6b7280',
    secondary: '#374151',
    gradient: 'from-gray-100/50 to-slate-100/50',
    shadowColor: 'rgba(107, 114, 128, 0.2)'
  }
};

export const SUBJECTS = Object.keys(SUBJECT_INFO).filter(s => s !== 'Geral');
