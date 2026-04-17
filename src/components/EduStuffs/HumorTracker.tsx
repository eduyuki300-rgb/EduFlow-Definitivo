import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Smile, Save, Edit3, Plus } from 'lucide-react';
import { cn } from '../../lib/cn';

const MOODS = [
  { val: 1, emoji: '😔', label: 'Péssimo' },
  { val: 2, emoji: '😕', label: 'Ruim' },
  { val: 3, emoji: '😐', label: 'Ok' },
  { val: 4, emoji: '🙂', label: 'Bom' },
  { val: 5, emoji: '😄', label: 'Ótimo' },
];

interface HumorTrackerProps {
  userId: string;
}

export function HumorTracker({ userId }: HumorTrackerProps) {
  const [mood, setMood] = useState<number | null>(() => {
    const saved = localStorage.getItem(`mood_${userId}_${new Date().toDateString()}`);
    return saved ? parseInt(saved) : null;
  });
  
  const [moodNote, setMoodNote] = useState(() => {
    return localStorage.getItem(`mood_note_${userId}_${new Date().toDateString()}`) || '';
  });
  
  const [isMoodNoteOpen, setIsMoodNoteOpen] = useState(false);

  // Auto-save mood note with debounce (Item #12)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (moodNote) {
        localStorage.setItem(`mood_note_${userId}_${new Date().toDateString()}`, moodNote);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [moodNote, userId]);

  const handleMoodSelect = (val: number) => {
    setMood(val);
    localStorage.setItem(`mood_${userId}_${new Date().toDateString()}`, val.toString());
  };

  const handleSaveMoodNote = () => {
    localStorage.setItem(`mood_note_${userId}_${new Date().toDateString()}`, moodNote);
    setIsMoodNoteOpen(false);
  };

  return (
    <div className="mb-8 p-4 bg-white/40 border border-white/60 rounded-3xl shadow-sm">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 text-center">Humor de Hoje</p>
      <div className="flex justify-between items-center px-2">
        {MOODS.map((m) => (
          <button
            key={m.val}
            onClick={() => handleMoodSelect(m.val)}
            className={cn(
              "w-10 h-10 rounded-full flex flex-col items-center justify-center transition-all hover:scale-110 relative group",
              mood === m.val ? "bg-orange-100 scale-110 shadow-sm" : "hover:bg-gray-50 text-gray-300"
            )}
          >
            <span className={cn(
              "text-xl transition-all",
              mood === m.val ? "filter-none" : "grayscale opacity-50"
            )}>
              {m.emoji}
            </span>
            <span className="absolute -bottom-6 text-[8px] font-bold text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap uppercase tracking-tighter">
              {m.label}
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {mood !== null && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="mt-6 pt-4 border-t border-white/40"
          >
            {isMoodNoteOpen ? (
              <div className="space-y-2">
                <textarea
                  value={moodNote}
                  onChange={(e) => setMoodNote(e.target.value)}
                  placeholder="O que aconteceu hoje?"
                  className="w-full bg-white/60 border border-white/80 rounded-2xl px-3 py-2 text-[10px] font-medium focus:ring-1 focus:ring-orange-200 outline-none resize-none h-16"
                  autoFocus
                />
                <button 
                  onClick={handleSaveMoodNote}
                  className="w-full py-1.5 bg-orange-500 text-white rounded-xl text-[9px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-orange-600 transition-colors"
                >
                  <Save size={12} /> Salvar Reflexão
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setIsMoodNoteOpen(true)}
                className="w-full py-2 bg-white/40 hover:bg-white/60 rounded-xl text-[9px] font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-dashed border-white/60"
              >
                {moodNote ? <Edit3 size={12} /> : <Plus size={12} />}
                {moodNote ? 'Editar Reflexão' : 'Adicionar Reflexão'}
              </button>
            )}
            {moodNote && !isMoodNoteOpen && (
              <p className="mt-2 text-[10px] text-gray-500 italic px-2 line-clamp-2 text-center">"{moodNote}"</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
