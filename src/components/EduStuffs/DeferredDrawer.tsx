import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, History, Plus, Briefcase, Calendar, Info, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/cn';
import { EduStuff } from '../../types';

interface DeferredDrawerProps {
  tasks: EduStuff[];
  isOpen: boolean;
  onClose: () => void;
  onReactivate: (id: string) => void;
  onDelete: (id: string) => void;
}

export function DeferredDrawer({ tasks, isOpen, onClose, onReactivate, onDelete }: DeferredDrawerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-gray-900/10 backdrop-blur-sm z-40"
          />
          
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-sm bg-white/95 backdrop-blur-2xl z-50 shadow-2xl border-l border-white/50 p-8 flex flex-col"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
                  <History className="text-slate-400" /> Gateta de Adiados
                </h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                  Missões em espera ({tasks.length})
                </p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 px-1">
              {tasks.length > 0 ? (
                tasks.map((task) => (
                  <motion.div 
                    key={task.id}
                    layout
                    drag="x"
                    dragConstraints={{ left: -200, right: 50 }}
                    dragElastic={0.1}
                    onDragEnd={(_, info) => {
                      // Se arrastar para a esquerda (em direção à lista), reativa
                      if (info.offset.x < -100) {
                        onReactivate(task.id);
                      }
                    }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-slate-50 border border-slate-100 rounded-[24px] group hover:border-blue-200 transition-colors cursor-grab active:cursor-grabbing relative overflow-hidden"
                  >
                    {/* Indicador de reativação */}
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight size={14} className="text-blue-300 rotate-180 animate-pulse" />
                    </div>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                          #{task.category || 'Geral'}
                        </span>
                        <p className="text-sm font-bold text-gray-700 leading-tight">
                          {task.title}
                        </p>
                      </div>
                      <div className="flex gap-1 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => onReactivate(task.id)}
                          className="p-1.5 bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-200 hover:scale-110 active:scale-95 transition-all"
                          title="Voltar para hoje"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-30 grayscale pt-20">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <History size={32} />
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest">Nada pendente</p>
                  <p className="text-[10px] mt-2 max-w-[160px] leading-relaxed">
                    Arraste tarefas para cá quando precisar focar em outra coisa.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-8 pt-8 border-t border-gray-100">
              <div className="p-4 bg-blue-50/50 rounded-3xl flex items-start gap-3">
                <Info size={16} className="text-blue-400 shrink-0 mt-0.5" />
                <p className="text-[9px] text-blue-500/80 font-medium leading-relaxed">
                  As tarefas nesta gaveta não afetam seus streaks diários até que você as reative.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
