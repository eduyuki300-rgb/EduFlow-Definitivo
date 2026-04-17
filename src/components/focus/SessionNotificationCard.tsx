import { CheckCircle2, Coffee } from 'lucide-react';
import type { FocusNotification } from '../../hooks/useFocusSession';
import { cn } from '../../lib/cn';

interface SessionNotificationCardProps {
  notification: FocusNotification;
  onAdvance: () => void;
  compact?: boolean;
}

export function SessionNotificationCard({
  notification,
  onAdvance,
  compact = false,
}: SessionNotificationCardProps) {
  return (
    <div
      className={cn(
        'border shadow-2xl backdrop-blur-2xl',
        compact
          ? 'rounded-3xl border-orange-100 bg-white p-4 text-center'
          : 'rounded-[3rem] border-white/20 bg-white/95 p-10 text-center'
      )}
    >
      <div
        className={cn(
          'mx-auto flex items-center justify-center rounded-[2rem]',
          compact ? 'mb-5 h-16 w-16' : 'mb-8 h-20 w-20',
          notification.type === 'focus' ? 'bg-orange-50 text-orange-500' : 'bg-blue-50 text-blue-500'
        )}
      >
        {notification.type === 'focus' ? <CheckCircle2 size={compact ? 28 : 40} /> : <Coffee size={compact ? 28 : 40} />}
      </div>
      <h3 className={cn('font-black text-gray-900', compact ? 'mb-2 text-lg' : 'mb-2 text-2xl')}>
        {notification.title}
      </h3>
      <p className={cn('text-gray-500', compact ? 'mb-6 text-xs font-medium' : 'mb-10 text-sm font-medium')}>
        {notification.description}
      </p>
      <button
        onClick={onAdvance}
        className={cn(
          'w-full rounded-2xl text-white font-black uppercase tracking-widest transition-all active:scale-95 shadow-xl',
          compact ? 'px-4 py-3 text-[10px]' : 'px-4 py-5 text-xs',
          notification.type === 'focus' ? 'bg-orange-500 shadow-orange-500/20' : 'bg-blue-500 shadow-blue-500/20'
        )}
      >
        {notification.actionLabel}
      </button>
    </div>
  );
}
