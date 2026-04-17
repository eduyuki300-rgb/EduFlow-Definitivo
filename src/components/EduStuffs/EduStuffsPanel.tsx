import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, Plus, Trash2, Heart, Sparkles, Smile,
  ChevronDown, ChevronUp, Clock, Edit3, Save, 
  BookOpen, Dumbbell, CheckSquare, Flame, Calendar as CalendarIcon,
  ChevronRight, ChevronLeft, Tag as TagIcon, Loader2
} from 'lucide-react';
import { useEduStuffs } from '../../hooks/useEduStuffs';
import { EduStuff } from '../../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============================================================================
// CONFIGURAÇÃO DE TAGS E CORES PASTEL
// ============================================================================
interface TagOption {
  value: string;
  label: string;
  emoji: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

const DEFAULT_TAGS: TagOption[] = [
  { value: 'compromisso', label: 'Compromisso', emoji: '📅', color: 'text-blue-600', bgColor: 'bg-blue-100', borderColor: 'border-blue-200' },
  { value: 'aniversario', label: 'Aniversário', emoji: '🎂', color: 'text-pink-600', bgColor: 'bg-pink-100', borderColor: 'border-pink-200' },
  { value: 'financeiro', label: 'Financeiro', emoji: '💰', color: 'text-green-600', bgColor: 'bg-green-100', borderColor: 'border-green-200' },
  { value: 'trabalho', label: 'Trabalho', emoji: '💼', color: 'text-purple-600', bgColor: 'bg-purple-100', borderColor: 'border-purple-200' },
  { value: 'obrigacoes', label: 'Obrigações', emoji: '✅', color: 'text-orange-600', bgColor: 'bg-orange-100', borderColor: 'border-orange-200' },
  { value: 'pessoal', label: 'Pessoal', emoji: '✨', color: 'text-indigo-600', bgColor: 'bg-indigo-100', borderColor: 'border-indigo-200' },
];

const MOOD_EMOJIS = [
  { value: 1, emoji: '😢', label: 'Péssimo' },
  { value: 2, emoji: '😕', label: 'Ruim' },
  { value: 3, emoji: '😐', label: 'Neutro' },
  { value: 4, emoji: '🙂', label: 'Bom' },
  { value: 5, emoji: '🤩', label: 'Ótimo' },
];

const getTodayKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function EduStuffsPanel({ isOpen, onToggle, userId }: { isOpen: boolean, onToggle: () => void, userId: string }) {
  const { stuffs, isLoading, addStuff, updateStuff, deleteStuff, toggleHabit } = useEduStuffs(userId);
  
  // States de Tags
  const [customTags, setCustomTags] = useState<TagOption[]>(() => {
    const saved = localStorage.getItem(`custom_tags_${userId}`);
    return saved ? JSON.parse(saved) : [];
  });
  const [newTagName, setNewTagName] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [isSubmittingChallenge, setIsSubmittingChallenge] = useState<string | null>(null);

  const TAG_OPTIONS = useMemo(() => [...DEFAULT_TAGS, ...customTags], [customTags]);

  // States de Formulário
  const [newTitle, setNewTitle] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('pessoal');
  const [isTagSelectorOpen, setIsTagSelectorOpen] = useState(false);
  const tagSelectorRef = useRef<HTMLDivElement>(null);
  
  // Mood Tracker
  const [mood, setMood] = useState<number | null>(() => {
    const saved = localStorage.getItem(`mood_${userId}_${getTodayKey()}`);
    return saved ? parseInt(saved) : null;
  });
  const [moodNote, setMoodNote] = useState(() => {
    return localStorage.getItem(`mood_note_${userId}_${getTodayKey()}`) || '';
  });
  const [isMoodNoteOpen, setIsMoodNoteOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tagSelectorRef.current && !tagSelectorRef.current.contains(event.target as Node)) {
        setIsTagSelectorOpen(false);
        setIsAddingTag(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    localStorage.setItem(`custom_tags_${userId}`, JSON.stringify(customTags));
  }, [customTags, userId]);

  const handleCreateTag = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newTagName.trim();
    if (!name) return;
    const normalizedName = name.toLowerCase().replace(/\s+/g, '_');
    const isDuplicate = TAG_OPTIONS.some(t => t.value === normalizedName || t.label.toLowerCase() === name.toLowerCase());
    if (isDuplicate) {
      alert('Esta categoria já existe!');
      return;
    }
    const newTag: TagOption = {
      value: normalizedName,
      label: name,
      emoji: '🏷️', color: 'text-slate-600', bgColor: 'bg-slate-100', borderColor: 'border-slate-200'
    };
    setCustomTags([...customTags, newTag]);
    setSelectedTag(newTag.value);
    setNewTagName('');
    setIsAddingTag(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    let type: 'todo' | 'habit' = 'todo';
    let habitType: EduStuff['habitType'] = 'custom';
    if (newTitle.toLowerCase().startsWith('h:') || newTitle.toLowerCase().includes('hábito')) {
      type = 'habit';
      if (newTitle.toLowerCase().includes('leitura') || newTitle.toLowerCase().includes('livro')) habitType = 'leitura_120';
      else if (newTitle.toLowerCase().includes('atividade') || newTitle.toLowerCase().includes('treino')) habitType = 'atividade_120';
    }
    await addStuff({
      title: newTitle.replace('h:', '').replace('H:', '').trim(),
      type,
      completed: false,
      category: selectedTag,
      habitType,
      progress: 0,
      targetDays: 120,
    });
    setNewTitle('');
  };

  // Log de clique global para diagnóstico
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('button')) {
        console.log('[EduStuffs] Button Clicked:', target.innerText || target.getAttribute('aria-label') || 'Icon Button');
      }
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  const handleMoodSelect = (val: number) => {
    setMood(val);
    localStorage.setItem(`mood_${userId}_${getTodayKey()}`, val.toString());
  };

  const handleSaveMoodNote = () => {
    localStorage.setItem(`mood_note_${userId}_${getTodayKey()}`, moodNote);
    setIsMoodNoteOpen(false);
  };

  const handleChallengeToggle = async (type: 'leitura' | 'atividade') => {
    if (isSubmittingChallenge) return;
    
    const habitType = type === 'leitura' ? 'leitura_120' : 'atividade_120';
    let habit = stuffs.find(h => h.habitType === habitType);
    
    setIsSubmittingChallenge(type);
    console.log(`[EduStuffs] Handle toggle for ${type}. Habit found:`, !!habit);

    try {
      if (!habit) {
        await addStuff({
          title: type === 'leitura' ? 'Leitura diária' : 'Atividade física',
          type: 'habit',
          completed: true,
          category: 'pessoal',
          habitType,
          progress: 1,
          targetDays: 120,
        });
      } else {
        await toggleHabit(habit);
      }
    } catch (err) {
      console.error(`[EduStuffs] Failed to toggle ${type}:`, err);
    } finally {
      setIsSubmittingChallenge(null);
    }
  };

  const extractTime = (title: string) => {
    const timeMatch = title.match(/às\s+(\d{1,2}[:h]\d{0,2})/i);
    return timeMatch ? timeMatch[1].replace('h', ':') : null;
  };

  const getHabitIcon = (title: string) => {
    const lower = title.toLowerCase();
    if (lower.includes('ler') || lower.includes('livro')) return <BookOpen size={16} />;
    if (lower.includes('atividade') || lower.includes('treino') || lower.includes('academia')) return <Dumbbell size={16} />;
    if (lower.includes('água') || lower.includes('beber')) return <Heart size={16} />;
    if (lower.includes('meditar')) return <Smile size={16} />;
    return <CheckCircle2 size={16} />;
  };

  const habits = stuffs.filter(s => s.type === 'habit');
  const todos = stuffs.filter(s => s.type === 'todo' && !s.completed);
  
  const leituraHabit = habits.find(h => h.habitType === 'leitura_120');
  const atividadeHabit = habits.find(h => h.habitType === 'atividade_120');

  const generateHeatmap = (dates: string[]) => {
    const days = [];
    const today = new Date();
    for (let i = 83; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      days.push({ key, done: dates.includes(key) });
    }
    return days;
  };

  const leituraHeatmap = useMemo(() => generateHeatmap(leituraHabit?.completedDates || []), [leituraHabit?.completedDates]);
  const atividadeHeatmap = useMemo(() => generateHeatmap(atividadeHabit?.completedDates || []), [atividadeHabit?.completedDates]);

  // Lista de hábitos que NÃO são desafios de 120 dias (para evitar duplicidade)
  const customHabits = habits.filter(h => h.habitType === 'custom' || !h.habitType);

  const selectedTagOption = TAG_OPTIONS.find(t => t.value === selectedTag) || TAG_OPTIONS[0];

  return (
    <motion.aside
      initial={false}
      animate={{ width: isOpen ? 380 : 64 }}
      transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
      className={cn(
        "h-full relative flex flex-col glass-premium border-l border-white/20 shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.1)] z-40 overflow-hidden",
        !isOpen && "items-center"
      )}
    >
      <button onClick={onToggle} className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-20 bg-black/5 hover:bg-black/10 flex items-center justify-center transition-colors group z-50 rounded-r-lg">
        {isOpen ? <ChevronRight size={14} className="text-gray-400 group-hover:text-gray-600" /> : <ChevronLeft size={14} className="text-gray-400 group-hover:text-gray-600" />}
      </button>

      {isOpen ? (
        <div className="flex-1 flex flex-col p-6 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="flex items-center justify-between mb-6">
            <div><h2 className="text-lg font-black tracking-tighter text-gray-900 leading-none">EDU STUFF'S</h2><p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Vida & Equilíbrio</p></div>
            <Sparkles size={18} className="text-amber-400 animate-pulse" />
          </div>

          {/* Mood Tracker */}
          <div className="mb-6 p-4 bg-linear-to-br from-orange-50/80 to-pink-50/80 border border-white/60 rounded-3xl shadow-sm">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 text-center">Humor de Hoje</p>
            <div className="flex justify-between items-center px-1">
              {MOOD_EMOJIS.map((item) => (
                <motion.button key={item.value} whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.95 }} onClick={() => handleMoodSelect(item.value)} className={cn("w-9 h-9 rounded-full flex items-center justify-center transition-all text-xl", mood === item.value ? "bg-white shadow-md scale-110" : "hover:bg-white/50")} title={item.label}>{item.emoji}</motion.button>
              ))}
            </div>
             <AnimatePresence>
              {mood !== null && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mt-4 pt-4 border-t border-white/40">
                  {isMoodNoteOpen ? (
                    <div className="space-y-2">
                      <textarea value={moodNote} onChange={(e) => setMoodNote(e.target.value)} placeholder="O que aconteceu hoje?" className="w-full bg-white/60 border border-white/80 rounded-2xl px-3 py-2 text-[10px] font-medium focus:ring-1 focus:ring-orange-200 outline-none resize-none h-16" />
                      <button onClick={handleSaveMoodNote} className="w-full py-1.5 bg-linear-to-r from-orange-400 to-pink-400 text-white rounded-xl text-[9px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm"><Save size={12} /> Salvar Reflexão</button>
                    </div>
                  ) : (
                    <button onClick={() => setIsMoodNoteOpen(true)} className="w-full py-2 bg-white/40 hover:bg-white/60 rounded-xl text-[9px] font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest transition-all flex items-center justify-center gap-2">{moodNote ? <Edit3 size={12} /> : <Plus size={12} />} {moodNote ? 'Editar Reflexão' : 'Adicionar Reflexão'}</button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Challenges Section */}
          <section className="mb-6 space-y-4">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1"><Sparkles size={12} className="text-amber-400" /> Desafios 120 Dias</h3>
            
            {/* Leitura */}
            <motion.div whileHover={{ scale: 1.02 }} className="p-3 bg-linear-to-br from-blue-50/80 to-indigo-50/80 border border-blue-100/50 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600"><BookOpen size={18} /></div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-700 uppercase">Leitura (5 págs)</p>
                    <div className="flex items-center gap-2"><span className="text-[9px] text-blue-600 font-black">{leituraHabit?.progress || 0}/120 dias</span>{(leituraHabit?.streak || 0) > 0 && <span className="text-[8px] flex items-center gap-0.5 text-orange-500 font-bold"><Flame size={8} fill="currentColor" /> {leituraHabit?.streak} dias</span>}</div>
                  </div>
                </div>
                <button 
                  onClick={() => handleChallengeToggle('leitura')} 
                  disabled={isSubmittingChallenge === 'leitura'}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase transition-all flex items-center gap-1",
                    isSubmittingChallenge === 'leitura' ? "opacity-50 cursor-wait" : "",
                    leituraHabit?.completedDates?.includes(getTodayKey()) 
                      ? "bg-green-100 text-green-700 hover:bg-green-200" 
                      : "bg-blue-500 hover:bg-blue-600 text-white"
                  )}
                >
                  {isSubmittingChallenge === 'leitura' ? <Loader2 size={10} className="animate-spin" /> : 
                    leituraHabit?.completedDates?.includes(getTodayKey()) ? <><CheckCircle2 size={10} /> Feito</> : <><Plus size={10} /> Marcar Dia</>}
                </button>
              </div>
              <div className="w-full h-1.5 bg-blue-100/50 rounded-full overflow-hidden mb-3"><motion.div initial={{ width: 0 }} animate={{ width: `${((leituraHabit?.progress || 0) / 120) * 100}%` }} className="h-full bg-blue-500 rounded-full" /></div>
              <div className="mt-2">
                <p className="text-[8px] text-gray-400 mb-2 flex items-center gap-1"><CalendarIcon size={8}/> Histórico (12 semanas)</p>
                <div className="flex flex-wrap gap-1 justify-start">
                  {leituraHeatmap.map((day, idx) => (<div key={idx} className={cn("w-[11px] h-[11px] rounded-[3px] transition-all flex items-center justify-center text-[7px]", day.done ? "bg-blue-500 text-white shadow-sm" : "bg-blue-100/50")} title={day.key}>{day.done && "🔥"}</div>))}
                </div>
              </div>
            </motion.div>

            {/* Atividade */}
            <motion.div whileHover={{ scale: 1.02 }} className="p-3 bg-linear-to-br from-emerald-50/80 to-teal-50/80 border border-emerald-100/50 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600"><Dumbbell size={18} /></div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-700 uppercase">Treino Diário</p>
                    <div className="flex items-center gap-2"><span className="text-[9px] text-emerald-600 font-black">{atividadeHabit?.progress || 0}/120 dias</span>{(atividadeHabit?.streak || 0) > 0 && <span className="text-[8px] flex items-center gap-0.5 text-orange-500 font-bold"><Flame size={8} fill="currentColor" /> {atividadeHabit?.streak} dias</span>}</div>
                  </div>
                </div>
                <button 
                  onClick={() => handleChallengeToggle('atividade')} 
                  disabled={isSubmittingChallenge === 'atividade'}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase transition-all flex items-center gap-1",
                    isSubmittingChallenge === 'atividade' ? "opacity-50 cursor-wait" : "",
                    atividadeHabit?.completedDates?.includes(getTodayKey()) 
                      ? "bg-green-100 text-green-700 hover:bg-green-200" 
                      : "bg-emerald-500 hover:bg-emerald-600 text-white"
                  )}
                >
                  {isSubmittingChallenge === 'atividade' ? <Loader2 size={10} className="animate-spin" /> :
                    atividadeHabit?.completedDates?.includes(getTodayKey()) ? <><CheckCircle2 size={10} /> Feito</> : <><Plus size={10} /> Marcar Dia</>}
                </button>
              </div>
              <div className="w-full h-1.5 bg-emerald-100/50 rounded-full overflow-hidden mb-3"><motion.div initial={{ width: 0 }} animate={{ width: `${((atividadeHabit?.progress || 0) / 120) * 100}%` }} className="h-full bg-emerald-500 rounded-full" /></div>
              <div className="mt-2 text-[8px] text-gray-400 mb-2 flex items-center gap-1"><CalendarIcon size={8}/> Histórico (12 semanas)</div>
              <div className="flex flex-wrap gap-1 justify-start">
                {atividadeHeatmap.map((day, idx) => (<div key={idx} className={cn("w-[11px] h-[11px] rounded-[3px] transition-all flex items-center justify-center text-[7px]", day.done ? "bg-emerald-500 text-white shadow-sm" : "bg-emerald-100/50")} title={day.key}>{day.done && "🔥"}</div>))}
              </div>
            </motion.div>
          </section>

          <form onSubmit={handleAdd} className="mb-6">
            <div className="relative mb-3"><input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Adicione uma tarefa..." className="w-full bg-white/60 border border-white/80 rounded-2xl pl-4 pr-12 py-3 text-sm font-medium placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-200" /><button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-linear-to-r from-blue-400 to-indigo-400 rounded-xl flex items-center justify-center text-white hover:opacity-90 transition-opacity"><Plus size={16} /></button></div>
            <div className="relative mb-4" ref={tagSelectorRef}><button type="button" onClick={() => setIsTagSelectorOpen(!isTagSelectorOpen)} className={cn("w-full py-3 px-4 rounded-2xl font-bold text-left transition-all border flex items-center justify-between", selectedTagOption.bgColor, selectedTagOption.borderColor)}><span className="flex items-center gap-2"><span>{selectedTagOption.emoji}</span><span className={cn("font-bold", selectedTagOption.color)}>{selectedTagOption.label}</span></span>{isTagSelectorOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
              <AnimatePresence>{isTagSelectorOpen && (<motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-sm rounded-2xl border border-white/60 shadow-lg z-50 overflow-hidden max-h-60 overflow-y-auto custom-scrollbar">{TAG_OPTIONS.map((option) => (<button key={option.value} type="button" onClick={() => { setSelectedTag(option.value); setIsTagSelectorOpen(false); }} className={cn("w-full px-4 py-3 text-left hover:bg-white/60 transition-colors flex items-center gap-3", selectedTag === option.value ? 'bg-white/80' : '')}><span className={option.color}>{option.emoji}</span><span className={cn("font-bold", option.color)}>{option.label}</span></button>))}<button type="button" onClick={() => { setIsAddingTag(true); setIsTagSelectorOpen(false); }} className="w-full px-4 py-3 text-left hover:bg-blue-50 text-blue-500 font-bold border-t border-gray-100 flex items-center gap-3"><Plus size={14} /> Nova Categoria</button></motion.div>)}</AnimatePresence>
            </div>
            {isAddingTag && (<motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mb-4 p-3 bg-white/80 border border-blue-200 rounded-2xl flex gap-2 shadow-sm"><input autoFocus value={newTagName} onChange={(e) => setNewTagName(e.target.value)} placeholder="Nome da tag..." className="flex-1 bg-transparent text-sm font-bold outline-none" onKeyDown={(e) => e.key === 'Enter' && handleCreateTag(e as any)} /><button type="button" onClick={handleCreateTag} className="p-2 bg-blue-500 text-white rounded-xl"><Plus size={16} /></button></motion.div>)}
          </form>

          {customHabits.length > 0 && (
            <section className="mb-6">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1"><Heart size={12} className="text-red-400" />Meus Hábitos</h3>
              <div className="space-y-2">
                {customHabits.map((habit) => (
                  <motion.div key={habit.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-3 bg-linear-to-br from-green-50/80 to-emerald-50/80 border border-green-100/50 rounded-2xl shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">{getHabitIcon(habit.title)}<span className="text-sm font-medium text-gray-700">{habit.title}</span></div>
                      <div className="flex items-center gap-2"><span className="text-xs font-bold text-green-600">{habit.streak} dias</span><button onClick={() => toggleHabit(habit)} className="text-green-500 hover:text-green-700"><CheckCircle2 size={20} className={habit.completedDates?.includes(getTodayKey()) ? "fill-green-500 text-white" : ""} /></button></div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {todos.length > 0 && (
            <section>
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1"><CheckSquare size={12} className="text-blue-400" />Tarefas Pendentes</h3>
              <div className="space-y-2">
                {todos.map((todo) => {
                  const tagOption = TAG_OPTIONS.find(t => t.value === todo.category) || TAG_OPTIONS[0];
                  const time = extractTime(todo.title);
                  return (
                    <motion.div key={todo.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-3 bg-linear-to-br from-gray-50/80 to-slate-50/80 border border-gray-100/50 rounded-2xl shadow-sm">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1"><span className={tagOption.color}>{tagOption.emoji}</span><span className="text-sm font-medium text-gray-700 truncate">{time ? todo.title.replace(` às ${time}`, '') : todo.title}</span></div>
                          {time && (<div className="flex items-center gap-1 ml-6"><Clock size={12} className="text-gray-400" /><span className="text-xs text-gray-500">{time}</span></div>)}
                        </div>
                        <div className="flex items-center gap-1"><button onClick={() => updateStuff(todo.id, { completed: true })} className="text-gray-400 hover:text-green-500 transition-colors"><CheckCircle2 size={20} /></button><button onClick={() => deleteStuff(todo.id)} className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button></div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-4 space-y-6">
          <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 3 }}><Sparkles size={24} className="text-amber-400" /></motion.div>
          <div className="flex flex-col items-center gap-6 opacity-40"><Flame size={20} className="text-orange-500" /><CheckSquare size={20} className="text-blue-500" /><Edit3 size={20} className="text-purple-500" /></div>
          <div className="text-center"><p className="text-[10px] font-black text-gray-400 rotate-90 whitespace-nowrap tracking-[0.2em] uppercase">EDU STUFF'S</p></div>
        </div>
      )}
    </motion.aside>
  );
}
