import React from 'react';
import { Plus, History, Circle, Clock, Trash2, Heart, Tag, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/cn';
import { EduStuff } from '../../types';
import { parseTaskTitle } from '../../utils/smartParser';

interface TaskListProps {
  todos: EduStuff[];
  newTitle: string;
  setNewTitle: (val: string) => void;
  handleAdd: (e: React.FormEvent) => Promise<void>;
  updateStuff: (id: string, updates: Partial<EduStuff>) => Promise<void>;
  deleteStuff: (id: string) => Promise<void>;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export function TaskList({ 
  todos, newTitle, setNewTitle, handleAdd, updateStuff, deleteStuff, inputRef 
}: TaskListProps) {
  return (
    <section className="flex-1 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Lembretes & Tarefas</h3>
        <History size={14} className="text-gray-300 hover:text-gray-900 cursor-pointer transition-colors" />
      </div>

      <form onSubmit={handleAdd} className="mb-4 relative group">
        <input
          ref={inputRef}
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Anotar algo... (h: hábito, !alta, #tag, às 15h)"
          className="w-full bg-white/60 border border-white/80 rounded-2xl px-4 py-3 text-xs font-medium focus:ring-2 focus:ring-orange-100 outline-none transition-all placeholder:text-gray-300"
        />
        <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-orange-500 text-white rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-orange-200">
          <Plus size={16} />
        </button>
      </form>

      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {todos.map((todo) => {
            const meta = parseTaskTitle(todo.title);
            
            return (
              <motion.div 
                layout
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95, x: -20 }}
                whileHover={{ scale: 1.01, backgroundColor: 'rgba(255, 255, 255, 0.7)' }}
                whileTap={{ scale: 0.98 }}
                key={todo.id} 
                className="flex items-center group gap-3 p-3 bg-white/40 rounded-2xl border border-white/60 transition-all cursor-pointer relative overflow-hidden"
                onClick={() => updateStuff(todo.id, { completed: true })}
              >
                {/* Priority Indicator */}
                {meta.priority === 'alta' && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500" />
                )}

                <motion.div whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.8 }}>
                  <Circle size={16} className={cn(
                    "transition-colors",
                    meta.priority === 'alta' ? "text-rose-400 group-hover:text-rose-600" : "text-gray-300 group-hover:text-orange-500"
                  )} />
                </motion.div>

                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-gray-700 truncate uppercase tracking-tight">
                    {meta.cleanTitle}
                  </p>
                  
                  <div className="flex flex-wrap gap-1 mt-1">
                    {meta.time && (
                      <div className="px-1.5 py-0.5 bg-orange-50 border border-orange-100 rounded-md flex items-center gap-1 scale-90 origin-left">
                        <Clock size={8} className="text-orange-500" />
                        <span className="text-[8px] font-black text-orange-600 uppercase">{meta.time}</span>
                      </div>
                    )}
                    {meta.tags.map(tag => (
                      <div key={tag} className="px-1.5 py-0.5 bg-indigo-50 border border-indigo-100 rounded-md flex items-center gap-1 scale-90 origin-left">
                        <Tag size={8} className="text-indigo-500" />
                        <span className="text-[8px] font-black text-indigo-600 uppercase">#{tag}</span>
                      </div>
                    ))}
                    {meta.priority && meta.priority !== 'media' && (
                       <div className={cn(
                         "px-1.5 py-0.5 border rounded-md flex items-center gap-1 scale-90 origin-left",
                         meta.priority === 'alta' ? "bg-rose-50 border-rose-100 text-rose-600" : "bg-blue-50 border-blue-100 text-blue-600"
                       )}>
                         <AlertCircle size={8} />
                         <span className="text-[8px] font-black uppercase">{meta.priority}</span>
                       </div>
                    )}
                  </div>
                </div>

                <button 
                  onClick={(e) => { e.stopPropagation(); deleteStuff(todo.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-rose-500 transition-all"
                >
                  <Trash2 size={12} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
        
        {todos.length === 0 && (
          <div className="py-12 flex flex-col items-center justify-center opacity-20 grayscale">
            <Heart size={32} />
            <p className="text-[10px] font-bold uppercase tracking-widest mt-4">Vida Organizada</p>
          </div>
        )}
      </div>
    </section>
  );
}
