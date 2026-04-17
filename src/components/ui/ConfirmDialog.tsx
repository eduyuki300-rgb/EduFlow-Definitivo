import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/cn';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancelar',
  tone = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[180] bg-black/45 backdrop-blur-sm"
            onClick={onCancel}
          />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            className="fixed left-1/2 top-1/2 z-[190] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border border-white/60 bg-white/95 p-8 shadow-2xl backdrop-blur-xl"
          >
            <div
              className={cn(
                'mb-5 flex h-14 w-14 items-center justify-center rounded-[1.4rem] border',
                tone === 'danger'
                  ? 'border-rose-100 bg-rose-50 text-rose-500'
                  : 'border-orange-100 bg-orange-50 text-orange-500'
              )}
            >
              <AlertTriangle size={24} />
            </div>
            <h3 className="mb-2 text-xl font-black tracking-tight text-gray-900">{title}</h3>
            <p className="mb-8 text-sm leading-relaxed text-gray-500">{description}</p>

            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={onConfirm}
                className={cn(
                  'w-full rounded-2xl px-4 py-4 text-xs font-black uppercase tracking-[0.2em] text-white transition-all active:scale-[0.98]',
                  tone === 'danger' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-gray-900 hover:bg-black'
                )}
              >
                {confirmLabel}
              </button>
              <button
                onClick={onCancel}
                className="w-full rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-[0.2em] text-gray-400 transition-all hover:bg-gray-50"
              >
                {cancelLabel}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
