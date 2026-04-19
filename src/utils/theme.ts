export type PomodoroTheme = 'classic' | 'emerald' | 'midnight' | 'rose';

export const POMODORO_THEMES = {
  classic: {
    focus: {
      color: '#f97316', // orange-500
      bgClass: 'bg-orange-500',
      textClass: 'text-orange-500',
      lightBgClass: 'bg-orange-50',
      lightTextClass: 'text-orange-600',
      shadowClass: 'shadow-orange-500/20',
      borderClass: 'border-orange-100',
      gradient: 'linear-gradient(135deg, #FF6B6B 0%, #EE5D5D 100%)',
    },
    break: {
      color: '#3b82f6', // blue-500
      bgClass: 'bg-blue-500',
      textClass: 'text-blue-500',
      lightBgClass: 'bg-blue-50',
      lightTextClass: 'text-blue-600',
      shadowClass: 'shadow-blue-500/20',
      borderClass: 'border-blue-100',
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    }
  },
  emerald: {
    focus: {
      color: '#10b981', // emerald-500
      bgClass: 'bg-emerald-500',
      textClass: 'text-emerald-500',
      lightBgClass: 'bg-emerald-50',
      lightTextClass: 'text-emerald-600',
      shadowClass: 'shadow-emerald-500/20',
      borderClass: 'border-emerald-100',
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    },
    break: {
      color: '#14b8a6', // teal-500
      bgClass: 'bg-teal-500',
      textClass: 'text-teal-500',
      lightBgClass: 'bg-teal-50',
      lightTextClass: 'text-teal-600',
      shadowClass: 'shadow-teal-500/20',
      borderClass: 'border-teal-100',
      gradient: 'linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)',
    }
  },
  midnight: {
    focus: {
      color: '#6366f1', // indigo-500
      bgClass: 'bg-indigo-500',
      textClass: 'text-indigo-500',
      lightBgClass: 'bg-indigo-50',
      lightTextClass: 'text-indigo-600',
      shadowClass: 'shadow-indigo-500/20',
      borderClass: 'border-indigo-100',
      gradient: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
    },
    break: {
      color: '#a855f7', // purple-500
      bgClass: 'bg-purple-500',
      textClass: 'text-purple-500',
      lightBgClass: 'bg-purple-50',
      lightTextClass: 'text-purple-600',
      shadowClass: 'shadow-purple-500/20',
      borderClass: 'border-purple-100',
      gradient: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)',
    }
  },
  rose: {
    focus: {
      color: '#f43f5e', // rose-500
      bgClass: 'bg-rose-500',
      textClass: 'text-rose-500',
      lightBgClass: 'bg-rose-50',
      lightTextClass: 'text-rose-600',
      shadowClass: 'shadow-rose-500/20',
      borderClass: 'border-rose-100',
      gradient: 'linear-gradient(135deg, #f43f5e 0%, #be123c 100%)',
    },
    break: {
      color: '#d946ef', // fuchsia-500
      bgClass: 'bg-fuchsia-500',
      textClass: 'text-fuchsia-500',
      lightBgClass: 'bg-fuchsia-50',
      lightTextClass: 'text-fuchsia-600',
      shadowClass: 'shadow-fuchsia-500/20',
      borderClass: 'border-fuchsia-100',
      gradient: 'linear-gradient(135deg, #d946ef 0%, #a21caf 100%)',
    }
  }
};
