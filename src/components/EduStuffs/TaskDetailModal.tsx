import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Trash2, 
  Calendar, 
  AlignLeft, 
  ListTodo,
  ChevronRight,
  Bell,
  History,
  AlertCircle,
  Save,
  Check,
  Sparkles
} from 'lucide-react';
import { cn } from '../../lib/cn';
import { EduStuff } from '../../types';
import { playSuccessSound } from '../../utils/audio';

interface TaskDetailModalProps {
  task: EduStuff;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<EduStuff>) => void;
  onDelete: (id: string) => void;
}

export function TaskDetailModal({ task, isOpen, onClose, onUpdate, onDelete }: TaskDetailModalProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [subtasks, setSubtasks] = useState(task.subtasks || []);
  const [newSubtask, setNewSubtask] = useState('');
  const [scheduledTime, setScheduledTime] = useState(task.scheduledTime || '');

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || '');
    setSubtasks(task.subtasks || []);
    setScheduledTime(task.scheduledTime || '');
  }, [task]);

  const handleUpdate = () => {
    onUpdate(task.id, {
      title,
      description,
      subtasks,
      scheduledTime
    });
  };

  const handleClose = () => {
    handleUpdate();
    onClose();
  };

  const addSubtask = () => {
    if (!newSubtask.trim()) return;
    const updated = [...subtasks, { id: crypto.randomUUID(), text: newSubtask, completed: false }];
    setSubtasks(updated);
    setNewSubtask('');
    onUpdate(task.id, { subtasks: updated });
  };

  const toggleSubtask = (id: string) => {
    const updated = subtasks.map(s => s.id === id ? { ...s, completed: !s.completed } : s);
    if (!subtasks.find(s => s.id === id)?.completed) {
      playSuccessSound(true);
    }
    setSubtasks(updated);
    onUpdate(task.id, { subtasks: updated });
  };

  const removeSubtask = (id: string) => {
    const updated = subtasks.filter(s => s.id !== id);
    setSubtasks(updated);
    onUpdate(task.id, { subtasks: updated });
  };

  const progress = subtasks.length > 0 
    ? (subtasks.filter(s => s.completed).length / subtasks.length) * 100 
    : 0;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-gray-900/40 backdrop-blur-md"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-xl bg-white rounded-[40px] shadow-[0_30px_100px_-20px_rgba(0,0,0,0.15)] overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-8 pb-0 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={cn("px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-gray-50 text-gray-400 border border-gray-100")}>
                #{task.category || 'Geral'}
              </span>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 rounded-full">
                <Sparkles size={10} className="text-amber-500" />
                <span className="text-[9px] font-black uppercase tracking-widest text-amber-600">Missão Ativa</span>
              </div>
            </div>
            <button 
              onClick={handleClose} 
              className="p-2 hover:bg-gray-50 rounded-2xl transition-all text-gray-300 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-8 pt-6 space-y-10">
            {/* Título */}
            <div className="space-y-2">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleUpdate}
                className="text-3xl font-black text-gray-900 bg-transparent border-none outline-none w-full placeholder:text-gray-200 tracking-tighter leading-tight focus:ring-0"
                placeholder="Nome da missão..."
              />
              <div className="h-0.5 w-12 bg-blue-500/20 rounded-full" />
            </div>

            {/* Grid de Informações Rápidas */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 bg-gray-50/50 rounded-[28px] border border-gray-100/50">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center text-orange-500">
                    <Clock size={16} />
                  </div>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Horário</span>
                </div>
                <input 
                  type="time" 
                  value={scheduledTime}
                  onChange={(e) => {
                    setScheduledTime(e.target.value);
                    onUpdate(task.id, { scheduledTime: e.target.value });
                  }}
                  className="bg-transparent text-lg font-black text-gray-800 outline-none w-full cursor-pointer"
                />
              </div>

              <div className="p-5 bg-gray-50/50 rounded-[28px] border border-gray-100/50">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-500">
                    <ListTodo size={16} />
                  </div>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Progresso</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div animate={{ width: `${progress}%` }} className="h-full bg-blue-500" />
                  </div>
                  <span className="text-[11px] font-black text-blue-600">{Math.round(progress)}%</span>
                </div>
              </div>
            </div>

            {/* Descrição */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <AlignLeft size={14} className="text-gray-400" />
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Notas da Missão</h4>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={handleUpdate}
                placeholder="Adicione detalhes aqui..."
                className="w-full min-h-[100px] p-6 bg-gray-50 rounded-[32px] text-sm font-bold text-gray-700 outline-none border-2 border-transparent focus:border-blue-50 focus:bg-white transition-all resize-none shadow-xs placeholder:text-gray-300"
              />
            </section>

            {/* Checklist */}
            <section className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Checklist</h4>
                </div>
                <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">{subtasks.length} itens</span>
              </div>
              
              <div className="space-y-2">
                {subtasks.map((st) => (
                  <motion.div 
                    key={st.id} 
                    layout
                    className="group flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-2xl hover:border-blue-200 transition-all shadow-xs"
                  >
                    <button 
                      onClick={() => toggleSubtask(st.id)}
                      className={cn(
                        "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                        st.completed ? "bg-emerald-500 border-emerald-500 text-white" : "border-gray-100 hover:border-emerald-200 bg-gray-50"
                      )}
                    >
                      {st.completed && <Check size={12} strokeWidth={4} />}
                    </button>
                    <span className={cn("flex-1 text-sm font-bold transition-all", st.completed ? "text-gray-300 line-through" : "text-gray-700")}>
                      {st.text}
                    </span>
                    <button 
                      onClick={() => removeSubtask(st.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </motion.div>
                ))}
                
                <div className="flex items-center gap-3 p-2 pl-4 bg-gray-50/50 border border-dashed border-gray-200 rounded-2xl focus-within:border-blue-200 focus-within:bg-white transition-all group">
                  <Plus size={16} className="text-gray-400 group-focus-within:text-blue-500" />
                  <input
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addSubtask()}
                    placeholder="Adicionar tarefa..."
                    className="flex-1 bg-transparent py-2 text-sm font-bold text-gray-700 placeholder:text-gray-300 outline-none"
                  />
                </div>
              </div>
            </section>
          </div>

          {/* Footer Actions */}
          <div className="p-8 pt-4 bg-white/80 backdrop-blur-md border-t border-gray-50 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => {
                  onUpdate(task.id, { isDeferred: true });
                  handleClose();
                }}
                className="flex items-center justify-center gap-2 p-4 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-2xl transition-all group font-black text-[10px] uppercase tracking-widest border border-slate-100"
              >
                <History size={16} className="group-hover:-rotate-45 transition-transform" />
                Adiar Missão
              </button>

              <button 
                onClick={() => {
                  if (confirm('Excluir missão permanentemente?')) {
                    onDelete(task.id);
                    handleClose();
                  }
                }}
                className="flex items-center justify-center gap-2 p-4 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-2xl transition-all group font-black text-[10px] uppercase tracking-widest border border-rose-100"
              >
                <Trash2 size={16} className="group-hover:animate-bounce" />
                Excluir
              </button>
            </div>

            <button 
              onClick={handleClose}
              className="w-full py-5 bg-gray-900 text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-gray-200 hover:bg-black hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
            >
              <Save size={16} />
              Salvar & Concluir
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
