import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Trash2, Edit3, Save, GripVertical, Check, Tag as TagIcon } from 'lucide-react';
import { useTags } from '../../hooks/useTags';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface TagManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

const EMOJIS = ['📅', '🎂', '💰', '💼', '✅', '✨', '🏋️', '📚', '🎯', '🔥', '🏠', '🎮', '🌟', '⚡', '🧠', '💊'];

const COLOR_MAP: Record<string, {bg: string, text: string, border: string}> = {
  blue:   { bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-300' },
  green:  { bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-300' },
  pink:   { bg: 'bg-pink-100',   text: 'text-pink-700',   border: 'border-pink-300' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
  teal:   { bg: 'bg-teal-100',   text: 'text-teal-700',   border: 'border-teal-300' },
  indigo: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300' },
  red:    { bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-300' },
  amber:  { bg: 'bg-amber-100',  text: 'text-amber-700',  border: 'border-amber-300' },
  slate:  { bg: 'bg-slate-100',  text: 'text-slate-700',  border: 'border-slate-300' },
  rose:   { bg: 'bg-rose-100',   text: 'text-rose-700',   border: 'border-rose-300' },
  cyan:   { bg: 'bg-cyan-100',   text: 'text-cyan-700',   border: 'border-cyan-300' },
};

export function TagManagerModal({ isOpen, onClose, userId }: TagManagerModalProps) {
  const { tags, addTag, updateTag, deleteTag, reorderTags } = useTags(userId);
  
  // States para nova tag
  const [newLabel, setNewLabel] = useState('');
  const [newEmoji, setNewEmoji] = useState('✨');
  const [newColor, setNewColor] = useState('indigo');
  
  // States para edição inline
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editEmoji, setEditEmoji] = useState('');
  const [editColor, setEditColor] = useState('');

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;
    await addTag({ 
      label: newLabel.trim(), 
      emoji: newEmoji, 
      color: newColor 
    });
    setNewLabel('');
  };

  const handleStartEdit = (tag: any) => {
    setEditingId(tag.id);
    setEditLabel(tag.label);
    setEditEmoji(tag.emoji);
    setEditColor(tag.color);
  };

  const handleSaveEdit = async (id: string) => {
    await updateTag(id, { 
      label: editLabel, 
      emoji: editEmoji, 
      color: editColor 
    });
    setEditingId(null);
  };

  // Drag and Drop Logic
  const onDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const onDrop = (index: number) => {
    if (draggedIndex === null) return;
    const newTags = [...tags];
    const [removed] = newTags.splice(draggedIndex, 1);
    newTags.splice(index, 0, removed);
    reorderTags(newTags.map(t => t.id));
    setDraggedIndex(null);
  };

  if (!isOpen) return <AnimatePresence />;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-[460px] max-h-[85vh] bg-white rounded-[32px] shadow-2xl overflow-hidden border border-gray-100 flex flex-col z-70 mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="p-8 pb-4 flex items-start justify-between bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <TagIcon className="text-indigo-500" size={24} /> Gerenciar Tags
            </h2>
            <p className="text-sm font-medium text-gray-400 mt-1">Organize suas missões com tags personalizadas</p>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-900 rounded-xl flex items-center justify-center transition-all"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 pt-2 custom-scrollbar space-y-8">
          {/* LISTA DE TAGS EXISTENTES */}
          <div>
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 ml-1">SUAS TAGS</h3>
            <div className="space-y-3">
              {tags.map((tag, index) => {
                const isEditing = editingId === tag.id;
                const colors = COLOR_MAP[tag.color] || COLOR_MAP.slate;

                return (
                  <div 
                    key={tag.id}
                    draggable
                    onDragStart={() => onDragStart(index)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => onDrop(index)}
                    className={cn(
                      "group p-3 rounded-2xl border transition-all animate-in fade-in slide-in-from-bottom-2",
                      isEditing ? "bg-white border-indigo-200 shadow-xl ring-4 ring-indigo-50" : "bg-white border-gray-100 hover:border-gray-200"
                    )}
                  >
                    {isEditing ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <input 
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                            className="flex-1 bg-gray-50 border-none rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="Nome da tag..."
                          />
                          <button onClick={() => handleSaveEdit(tag.id)} className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200 active:scale-95">
                            <Check size={18} strokeWidth={3} />
                          </button>
                          <button onClick={() => setEditingId(null)} className="w-10 h-10 bg-gray-100 text-gray-400 rounded-xl flex items-center justify-center active:scale-95">
                            <X size={18} strokeWidth={3} />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5 justify-center">
                          {Object.keys(COLOR_MAP).map(c => (
                            <button 
                              key={c}
                              onClick={() => setEditColor(c)}
                              className={cn(
                                "w-6 h-6 rounded-full border-2 transition-all",
                                COLOR_MAP[c].bg,
                                editColor === c ? "border-white scale-125 shadow-md ring-2 ring-indigo-500" : "border-transparent opacity-60 hover:opacity-100"
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="cursor-grab active:cursor-grabbing text-gray-300 group-hover:text-gray-400">
                            <GripVertical size={18} />
                          </div>
                          <div className={cn("px-4 py-1.5 rounded-xl border flex items-center gap-2", colors.bg, colors.text, colors.border)}>
                            <span className="text-lg leading-none">{tag.emoji}</span>
                            <span className="text-xs font-black uppercase tracking-widest">{tag.label}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleStartEdit(tag)}
                            className="p-2 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button 
                            onClick={() => deleteTag(tag.id)}
                            className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {tags.length === 0 && (
                <div className="py-8 text-center border-2 border-dashed border-gray-100 rounded-3xl">
                  <p className="text-xs font-black text-gray-300 uppercase tracking-widest">Nenhuma tag criada</p>
                </div>
              )}
            </div>
          </div>

          {/* FORMULÁRIO DE NOVA TAG */}
          <div className="bg-gray-50/50 p-6 rounded-[28px] border border-gray-100">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 ml-1">CRIAR NOVA TAG</h3>
            <form onSubmit={handleCreate} className="space-y-6">
              <div className="flex gap-4">
                <div className="w-14 h-14 bg-white border border-gray-200 rounded-2xl flex items-center justify-center text-3xl shadow-sm">
                  {newEmoji}
                </div>
                <div className="flex-1">
                  <input 
                    type="text"
                    maxLength={20}
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="Nome da Tag (ex: Academia)"
                    className="w-full h-14 bg-white border border-gray-200 rounded-2xl px-5 font-bold text-gray-800 placeholder:text-gray-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 shadow-sm transition-all outline-none"
                  />
                </div>
              </div>

              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">ESCOLHA UM EMOJI</p>
                <div className="grid grid-cols-8 gap-2">
                  {EMOJIS.map(e => (
                    <button 
                      key={e}
                      type="button"
                      onClick={() => setNewEmoji(e)}
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all",
                        newEmoji === e ? "bg-indigo-600 text-white scale-110 shadow-lg shadow-indigo-100" : "bg-white border border-gray-100 hover:bg-gray-50"
                      )}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">COR DA TAG</p>
                <div className="flex flex-wrap gap-2.5">
                  {Object.keys(COLOR_MAP).map(c => (
                    <button 
                      key={c}
                      type="button"
                      onClick={() => setNewColor(c)}
                      className={cn(
                        "w-8 h-8 rounded-full border-2 transition-all",
                        COLOR_MAP[c].bg,
                        newColor === c ? "border-white scale-125 shadow-lg shadow-gray-200 ring-2 ring-indigo-500" : "border-transparent opacity-70 hover:opacity-100"
                      )}
                    />
                  ))}
                </div>
              </div>

              <button 
                type="submit"
                disabled={!newLabel.trim()}
                className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:bg-gray-400 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-3 group"
              >
                <Plus size={20} strokeWidth={3} className="group-hover:rotate-90 transition-transform" />
                CRIAR TAG
              </button>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
