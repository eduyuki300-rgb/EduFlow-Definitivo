import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Trash2, ArrowUpCircle, AlarmClock, 
  History, Archive, Sparkles, AlertCircle 
} from 'lucide-react';
import { EduStuff } from '../../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface DeferredDrawerProps {
  tasks: EduStuff[];
  isOpen: boolean;
  onClose: () => void;
  onReactivate: (id: string) => void;
  onDelete: (id: string) => void;
}

/**
 * Função utilitária para formatar data relativa das tarefas adiadas
 */
const formatDeferredDate = (isoString?: string): string => {
  if (!isoString) return "Sem data de retorno";
  
  // Verifica se há um snooze no localStorage
  // TODO: O ideal seria receber uma prop 'onUpdate' para persistir isso no Firestore
  const taskId = isoString.split('_')[1]; // Se estivéssemos passando o ID
  const now = Date.now();
  const target = new Date(isoString).getTime();
  const diffInMs = target - now;
  const diffInDays = Math.round(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) return "Retorna hoje";
  if (diffInDays === 1) return "Retorna amanhã";
  if (diffInDays > 1) return `Retorna em ${diffInDays} dias`;
  if (diffInDays === -1) return "Venceu ontem";
  return `Venceu há ${Math.abs(diffInDays)} dias`;
};

export function DeferredDrawer({ tasks, isOpen, onClose, onReactivate, onDelete }: DeferredDrawerProps) {
  
  const handleSnooze = (taskId: string) => {
    const nextDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    localStorage.setItem(`snooze_${taskId}`, nextDate);
    // Como não temos onUpdate, apenas damos um feedback visual ou forçamos re-render
    // Se o pai re-renderizar, o card lerá o novo valor do localStorage
    alert("Missão reagendada para daqui a 3 dias! (Simulação via LocalStorage)");
  };

  const getEffectiveDate = (task: EduStuff) => {
    const snoozed = localStorage.getItem(`snooze_${task.id}`);
    return snoozed || task.deferredUntil;
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-65"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: isOpen ? 0 : '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed bottom-0 right-0 w-full max-w-[460px] bg-white rounded-t-[32px] shadow-[0_-20px_50px_-15px_rgba(0,0,0,0.15)] z-70 overflow-hidden flex flex-col max-h-[80vh]"
      >
        {/* HEADER */}
        <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500">
               <History size={20} />
            </div>
            <div>
               <h2 className="text-lg font-black text-gray-900 leading-none">Missões Adiadas</h2>
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                 {tasks.length} {tasks.length === 1 ? 'item pendente' : 'itens pendentes'}
               </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 bg-gray-50 hover:bg-gray-100 text-gray-400 rounded-xl flex items-center justify-center transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-gray-50/30">
          <div className="space-y-3">
            {tasks.map((task) => {
              const effectiveDate = getEffectiveDate(task);
              const dateText = formatDeferredDate(effectiveDate);
              const isOverdue = effectiveDate && new Date(effectiveDate) < new Date();

              return (
                <motion.div 
                  key={task.id}
                  layout
                  className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-4 hover:border-amber-200 transition-all group"
                >
                  <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-2xl shrink-0 group-hover:bg-amber-50 transition-all">
                    {task.category === 'pessoal' ? '✨' : '📋'}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-gray-900 truncate tracking-tight">{task.title}</h4>
                    <p className={cn(
                      "text-[10px] font-bold uppercase tracking-wider mt-1",
                      isOverdue ? "text-rose-500" : "text-gray-400"
                    )}>
                      {isOverdue && <AlertCircle size={10} className="inline mr-1" />}
                      {dateText}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button 
                      onClick={() => onReactivate(task.id)}
                      className="p-2 text-gray-300 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                      title="Reativar Missão"
                    >
                      <ArrowUpCircle size={18} />
                    </button>
                    <button 
                      onClick={() => handleSnooze(task.id)}
                      className="p-2 text-gray-300 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-all"
                      title="Snooze +3 dias"
                    >
                      <AlarmClock size={18} />
                    </button>
                    <button 
                      onClick={() => onDelete(task.id)}
                      className="p-2 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                      title="Excluir Permanentemente"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </motion.div>
              );
            })}

            {tasks.length === 0 && (
              <div className="py-20 flex flex-col items-center justify-center text-center px-6">
                <div className="w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-6 border border-gray-50">
                  <Sparkles size={40} className="text-emerald-500" />
                </div>
                <h3 className="text-base font-black text-gray-900 uppercase tracking-widest leading-none">Caminho Limpo</h3>
                <p className="text-xs font-medium text-gray-400 mt-2">Nenhuma missão adiada. Bom trabalho! 🎉</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}
