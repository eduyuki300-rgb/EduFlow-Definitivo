import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  X, Plus, Trash2, BookOpen, BarChart2, Sparkles, Star, LayoutList, Loader2 
} from 'lucide-react';
import { User } from 'firebase/auth';
import { Task, Priority, Status, SubTask } from '../../types';
import { SUBJECT_INFO, SUBJECTS } from '../../constants/subjects';
import { cn } from '../../lib/cn';
import { useTasksContext } from '../../context/TasksContext';
import { playSuccessSound } from '../../utils/audio';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useRef } from 'react';

interface TaskModalProps {
  isOpen: boolean;
  onClose: (s?: string) => void;
  user: User;
  taskToEdit?: Task;
  initialStatus?: Status;
}

export function TaskModal({ isOpen, onClose, user, taskToEdit, initialStatus }: TaskModalProps) {
  const { createTask, updateTask, deleteTask } = useTasksContext();
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, isOpen);

  const [isProcessingJson, setIsProcessingJson] = useState(false);
  const [activeTab, setActiveTab] = useState<'geral' | 'metricas' | 'importar'>('geral');
  
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Geral');
  const [priority, setPriority] = useState<Priority>('media');
  const [status, setStatus] = useState<Status>('inbox');
  const [subtasks, setSubtasks] = useState<SubTask[]>([]);
  const [questionsTotal, setQuestionsTotal] = useState<number>(0);
  const [questionsCorrect, setQuestionsCorrect] = useState<number>(0);
  const [theoryCompleted, setTheoryCompleted] = useState(false);
  const [flashcardsCompleted, setFlashcardsCompleted] = useState(false);
  const [difficulty, setDifficulty] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [pomodoros, setPomodoros] = useState<number>(0);
  const [estimatedPomodoros, setEstimatedPomodoros] = useState<number>(0);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [jsonImportText, setJsonImportText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (taskToEdit) {
        setTitle(taskToEdit.title);
        setSubject(taskToEdit.subject);
        setPriority(taskToEdit.priority);
        setStatus(taskToEdit.status);
        setSubtasks(taskToEdit.subtasks || []);
        setQuestionsTotal(taskToEdit.questionsTotal || 0);
        setQuestionsCorrect(taskToEdit.questionsCorrect || 0);
        setTheoryCompleted(taskToEdit.theoryCompleted || false);
        setFlashcardsCompleted(taskToEdit.flashcardsCompleted || false);
        setDifficulty(taskToEdit.difficulty || 0);
        setNotes(taskToEdit.notes || '');
        setPomodoros(taskToEdit.pomodoros || 0);
        setEstimatedPomodoros(taskToEdit.estimatedPomodoros || 0);
        setTags(taskToEdit.tags || []);
      } else {
        setTitle('');
        setSubject('Geral');
        setPriority('media');
        setStatus(initialStatus ?? 'inbox');
        setSubtasks([]);
        setQuestionsTotal(0);
        setQuestionsCorrect(0);
        setTheoryCompleted(false);
        setFlashcardsCompleted(false);
        setDifficulty(0);
        setNotes('');
        setPomodoros(0);
        setEstimatedPomodoros(0);
        setTags([]);
      }
      setActiveTab('geral');
    }
  }, [isOpen, taskToEdit]);

  const processImportedJson = async () => {
    const rawText = jsonImportText.trim();
    if (!rawText) {
      alert("Cole o código JSON gerado pelo seu Gemini primeiro.");
      return;
    }
    
    if (!rawText.trim()) {
      setIsProcessingJson(false);
      return;
    }
    
    setIsProcessingJson(true);
    try {
      // Tentar extrair o objeto JSON do texto (tudo entre a primeira e a última chave)
      let cleanedText = "";
      const firstBrace = rawText.indexOf('{');
      const lastBrace = rawText.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
        cleanedText = rawText.substring(firstBrace, lastBrace + 1);
      } else {
        throw new Error("Formato JSON não encontrado (chaves ausentes).");
      }

      const data = JSON.parse(cleanedText);
      
      // Validação básica e preenchimento
      if (data.title) setTitle(data.title.trim());
      
      if (data.subject) {
        // Tenta encontrar a matéria ignorando case ou emojis
        const foundSubject = SUBJECTS.find(s => 
          s.toLowerCase() === data.subject.toLowerCase() || 
          data.subject.toLowerCase().includes(s.toLowerCase())
        );
        if (foundSubject) setSubject(foundSubject);
      }

      if (data.estimatedPomodoros !== undefined) setEstimatedPomodoros(Number(data.estimatedPomodoros) || 0);
      if (data.difficulty !== undefined) setDifficulty(Math.min(3, Math.max(0, Number(data.difficulty) || 0)));
      
      if (data.tags && Array.isArray(data.tags)) {
        const validTags = data.tags.filter(t => typeof t === 'string' && t.trim()).map(t => t.trim());
        setTags(prev => Array.from(new Set([...prev, ...validTags])));
      }
      
      if (data.subtasks && Array.isArray(data.subtasks)) {
        const newSubtasks: SubTask[] = data.subtasks.map((st: any) => ({
          id: crypto.randomUUID(),
          title: st.title?.trim() || 'Grupo',
          completed: false,
          items: Array.isArray(st.items) ? st.items.map((item: any) => ({
            id: crypto.randomUUID(),
            title: typeof item === 'string' ? item.trim() : (item.title?.trim() || 'Item'),
            completed: false
          })) : []
        }));
        
        if (newSubtasks.length > 0) setSubtasks(newSubtasks);
      }
      
      if (data.notes) setNotes(prev => prev ? `${prev}\n\n${data.notes}` : data.notes);

      setJsonImportText('');
      setActiveTab('geral');
    } catch (error) {
      console.error('[Import JSON] Erro detalhado:', error);
      alert('Erro ao processar JSON. Certifique-se de que o texto colado é um JSON válido. Exemplo esperado: { "title": "Nome do Módulo", ... }');
    } finally {
      setIsProcessingJson(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    if (isSubmitting) return;

    setIsSubmitting(true);
    const cleanedSubtasks = subtasks
      .map(st => ({
        ...st,
        title: st.title.trim() || 'Sem título',
        items: (st.items || []).filter(item => item.title.trim() !== '')
      }))
      .filter(st => st.title !== 'Sem título' || st.items.length > 0);

    const taskData = {
      title: title.trim(),
      subject,
      priority,
      status,
      subtasks: cleanedSubtasks,
      questionsTotal: Number(questionsTotal) || 0,
      questionsCorrect: Number(questionsCorrect) || 0,
      theoryCompleted,
      flashcardsCompleted,
      difficulty,
      notes: notes.trim(),
      pomodoros: Number(pomodoros) || 0,
      estimatedPomodoros: Number(estimatedPomodoros) || 0,
      tags
    };

    try {
      if (taskToEdit) {
        await updateTask(taskToEdit.id, taskData);
      } else {
        await createTask(taskData);
      }
      playSuccessSound();
      onClose(taskData.status);
    } catch (error) {
      alert("Erro ao salvar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!taskToEdit || isSubmitting || isDeleting || !confirm("Permanente?")) return;
    setIsDeleting(true);
    try {
      await deleteTask(taskToEdit.id);
      onClose();
    } catch (error) {
      alert("Erro ao excluir.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 h-dvh z-100 flex flex-col sm:items-center sm:justify-center bg-black/20 backdrop-blur-sm sm:p-4 animate-in fade-in duration-200">
      <div 
        ref={modalRef}
        className="bg-white w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-4xl flex flex-col sm:flex-row sm:rounded-4xl shadow-2xl animate-in slide-in-from-bottom-8 duration-300 border border-gray-100 overflow-hidden"
      >
        <div className="bg-gray-50/50 border-b sm:border-b-0 sm:border-r border-gray-100 sm:w-64 shrink-0 flex flex-col">
          <div className="p-8 hidden sm:block">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              {taskToEdit ? '✏️ Módulo' : '✨ Novo'}
            </h2>
          </div>
          <div className="p-5 flex justify-between items-center sm:hidden bg-white border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">{taskToEdit ? '✏️ Editar' : '✨ Novo'}</h2>
            <button onClick={() => onClose()} className="p-2.5 bg-gray-100 rounded-full"><X size={20} /></button>
          </div>
          <div className="flex sm:flex-col gap-1.5 p-4 sm:p-5 overflow-x-auto sm:overflow-visible custom-scrollbar">
            {[
              { id: 'geral', label: 'Conteúdo', icon: <BookOpen size={16} />, color: 'bg-emerald-500' },
              { id: 'metricas', label: 'Métricas', icon: <BarChart2 size={16} />, color: 'bg-blue-500' },
              { id: 'importar', label: 'Importar', icon: <LayoutList size={16} />, color: 'bg-purple-500' },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={cn("flex items-center gap-3 px-5 py-3 rounded-2xl text-xs font-bold transition-all whitespace-nowrap uppercase tracking-widest", activeTab === tab.id ? "bg-white text-gray-900 shadow-sm border border-gray-100" : "text-gray-500 hover:bg-gray-100/50")}>
                {tab.icon}
                <span className={cn("w-2 h-2 rounded-full", tab.color, activeTab === tab.id ? "opacity-100" : "opacity-40")} />
                {tab.label}
              </button>
            ))}
          </div>
          <div className="mt-auto p-4 hidden sm:block">
            <button onClick={handleSubmit} disabled={!title.trim() || isSubmitting || isDeleting} className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold text-sm disabled:opacity-50 hover:bg-black">
              {isSubmitting ? 'Salvando...' : (taskToEdit ? 'Salvar' : 'Criar')}
            </button>
            {taskToEdit && (
              <button 
                onClick={handleDelete} 
                disabled={isSubmitting || isDeleting}
                className="w-full mt-2 py-3 text-red-500 text-sm font-bold hover:bg-red-50 hover:text-red-600 transition-colors rounded-xl disabled:opacity-50 border border-transparent hover:border-red-100"
              >
                {isDeleting ? 'Excluindo...' : 'Excluir Missão'}
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0 relative overflow-hidden bg-white">
          <button onClick={() => onClose()} className="hidden sm:flex absolute top-8 right-8 p-3 bg-gray-50 border border-gray-100 rounded-full text-gray-400 hover:text-gray-900 transition-all z-10 active:scale-90 shadow-sm"><X size={24} /></button>
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
            {activeTab === 'geral' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-3 uppercase tracking-widest">📚 Nome do Módulo</label>
                  <motion.div animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}} transition={{ duration: 0.4 }}>
                    <input 
                      autoFocus 
                      type="text" 
                      value={title} 
                      onChange={(e) => setTitle(e.target.value)} 
                      placeholder="Ex: Genética (Obrigatório)" 
                      className={cn(
                        "w-full bg-gray-50/50 border border-transparent hover:border-gray-200 rounded-2xl px-6 py-4 text-gray-900 font-bold focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-200 text-xl placeholder:text-gray-300 transition-all shadow-sm",
                        shake && "border-red-400 bg-red-50 focus:border-red-400"
                      )} 
                    />
                  </motion.div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-muted mb-3 uppercase tracking-widest opacity-50">🏷️ Matéria</label>
                  <div className="flex flex-wrap gap-2">
                    {SUBJECTS.map(sub => (
                      <button key={sub} type="button" onClick={() => setSubject(sub)} className={cn("px-3 py-1.5 rounded-lg text-sm font-semibold transition-all border flex items-center gap-1.5", subject === sub ? cn(SUBJECT_INFO[sub]?.tagColor || '', "scale-105 shadow-sm") : "bg-gray-50 text-gray-500 border-gray-100")}>
                        <span>{SUBJECT_INFO[sub]?.emoji || '📓'}</span> {sub}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-text-muted mb-2 uppercase tracking-wider">⚡ Prioridade</label>
                    <div className="relative flex items-center">
                      <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 pr-10 text-gray-900 appearance-none font-semibold text-sm cursor-pointer hover:bg-gray-100/50 transition-colors">
                        <option value="baixa">Baixa</option>
                        <option value="media">Média</option>
                        <option value="alta">Alta</option>
                      </select>
                      <div className="absolute right-4 pointer-events-none text-gray-400">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted mb-2 uppercase tracking-widest opacity-50">🎯 Destino</label>
                    <div className="relative flex items-center">
                      <select value={status} onChange={(e) => setStatus(e.target.value as Status)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 pr-10 text-gray-900 appearance-none font-semibold text-sm cursor-pointer hover:bg-gray-100/50 transition-colors">
                        <option value="inbox">📥 Inbox</option>
                        <option value="hoje">🎯 Hoje</option>
                        <option value="semana">🗓️ Semana</option>
                      </select>
                      <div className="absolute right-4 pointer-events-none text-gray-400">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">🤯 Dificuldade</label>
                    <div className="flex gap-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 items-center">
                      {[1, 2, 3].map((star) => (
                        <button key={star} type="button" onClick={() => setDifficulty(star)}><Star size={22} className={cn("transition-colors", difficulty >= star ? "fill-orange-400 text-orange-400" : "text-gray-200")} /></button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">⏱️ Pomodoros Estimados</label>
                    <div className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-2 py-1.5">
                      <button type="button" onClick={() => setEstimatedPomodoros(Math.max(0, estimatedPomodoros - 1))} className="w-8 h-8 rounded-lg bg-white border border-gray-100">-</button>
                      <span className="font-bold text-lg text-gray-900">{estimatedPomodoros}</span>
                      <button type="button" onClick={() => setEstimatedPomodoros(estimatedPomodoros + 1)} className="w-8 h-8 rounded-lg bg-white border border-gray-100">+</button>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Checklist</label>
                  <div className="space-y-4">
                    {subtasks.map((group) => (
                      <div key={group.id} className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm">
                        <div className="flex items-center gap-4 mb-4">
                          <input type="text" value={group.title} onChange={(e) => setSubtasks(prev => prev.map(g => g.id === group.id ? { ...g, title: e.target.value } : g))} placeholder="Grupo" className="flex-1 bg-transparent font-black text-gray-900 text-lg focus:outline-none placeholder:text-gray-300" />
                          <button onClick={() => setSubtasks(subtasks.filter(g => g.id !== group.id))} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                        </div>
                        <div className="space-y-3">
                          {group.items.map(item => (
                            <div key={item.id} className="flex items-center gap-3 bg-gray-50/50 p-2 rounded-xl border border-transparent focus-within:bg-white focus-within:border-indigo-100 focus-within:shadow-sm transition-all group/item">
                              <input type="text" value={item.title} onChange={(e) => setSubtasks(prev => prev.map(g => g.id === group.id ? { ...g, items: g.items.map(it => it.id === item.id ? { ...it, title: e.target.value } : it) } : g))} placeholder="Acesse o material, Leia a página X..." className="flex-1 text-sm font-medium text-gray-700 bg-transparent focus:outline-none placeholder:text-gray-400" />
                              <button onClick={() => setSubtasks(prev => prev.map(g => g.id === group.id ? { ...g, items: g.items.filter(it => it.id !== item.id) } : g))} className="opacity-0 group-hover/item:opacity-100 text-gray-400 hover:text-red-500 transition-all"><X size={14} /></button>
                            </div>
                          ))}
                          <button onClick={() => setSubtasks(prev => prev.map(g => g.id === group.id ? { ...g, items: [...g.items, { id: crypto.randomUUID(), title: '', completed: false }] } : g))} className="text-[10px] font-bold text-orange-500 hover:text-orange-600 transition-colors uppercase tracking-widest flex items-center gap-1 mt-2"><Plus size={12}/> Adicionar Item</button>
                        </div>
                      </div>
                    ))}
                    <button onClick={() => setSubtasks([...subtasks, { id: crypto.randomUUID(), title: '', completed: false, items: [] }])} className="w-full py-4 bg-transparent border-2 border-dashed border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors rounded-2xl text-gray-400 hover:text-gray-600 font-bold text-xs">+ CRIAR NOVO GRUPO</button>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'metricas' && (
              <div className="space-y-8 animate-in fade-in">
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-gray-50 p-6 rounded-4xl text-center">
                    <label className="block text-[10px] font-bold text-gray-400 mb-4 uppercase">🍅 Pomodoros Feitos</label>
                    <div className="flex items-center justify-between">
                      <button onClick={() => setPomodoros(Math.max(0, pomodoros - 1))} className="w-10 h-10 bg-white rounded-xl shadow-sm text-gray-500 hover:text-gray-900 active:scale-95 transition-all">-</button>
                      <span className="text-4xl font-black tabular-nums">{pomodoros}</span>
                      <button onClick={() => setPomodoros(pomodoros + 1)} className="w-10 h-10 bg-orange-500 text-white rounded-xl shadow-lg hover:bg-orange-600 active:scale-95 transition-all font-bold">+</button>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-6 rounded-4xl text-center">
                    <label className="block text-[10px] font-bold text-gray-400 mb-4 uppercase">📝 Questões</label>
                    <div className="flex items-center gap-2">
                       <input type="number" value={questionsCorrect || ''} onChange={e => setQuestionsCorrect(Number(e.target.value))} placeholder="0" className="w-full bg-emerald-50 text-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-500/20 font-black text-2xl text-center rounded-xl py-3 border border-transparent focus:border-emerald-200 transition-all outline-none" />
                       <span className="text-gray-300 font-bold text-xl">/</span>
                       <input type="number" value={questionsTotal || ''} onChange={e => setQuestionsTotal(Number(e.target.value))} placeholder="0" className="w-full bg-white font-black text-2xl text-center rounded-xl py-3 border border-gray-100 focus:border-indigo-200 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none" />
                    </div>
                  </div>
                </div>
                <div>
                   <label className="block text-[10px] font-bold text-gray-400 mb-4 uppercase">Fixação</label>
                   <div className="flex gap-4">
                     <button onClick={() => setTheoryCompleted(!theoryCompleted)} className={cn("flex-1 py-4 rounded-2xl border font-bold text-xs uppercase transition-all", theoryCompleted ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "bg-gray-50 border-gray-100 text-gray-400")}>Teoria</button>
                     <button onClick={() => setFlashcardsCompleted(!flashcardsCompleted)} className={cn("flex-1 py-4 rounded-2xl border font-bold text-xs uppercase transition-all", flashcardsCompleted ? "bg-purple-50 border-purple-200 text-purple-600" : "bg-gray-50 border-gray-100 text-gray-400")}>Flashcards</button>
                   </div>
                </div>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anotações e detalhes que não cabem no checklist..." className="w-full bg-gray-50/50 border border-transparent hover:border-gray-200 focus:bg-white focus:border-indigo-200 focus:ring-4 focus:ring-indigo-500/10 transition-all rounded-2xl p-5 text-sm h-48 focus:outline-none shadow-sm" />
              </div>
            )}
            {activeTab === 'importar' && (
              <div className="space-y-6 animate-in fade-in">
                <div className="bg-purple-50/30 p-8 rounded-4xl border border-purple-100 text-center">
                  <LayoutList size={32} className="mx-auto text-purple-500 mb-4" />
                  <h3 className="text-lg font-bold">Importação Manual</h3>
                  <p className="text-xs text-purple-400 mt-2">Cole o JSON gerado pelo seu Gemini externo abaixo para preencher os campos rapidamente.</p>
                  <textarea value={jsonImportText} onChange={e => setJsonImportText(e.target.value)} placeholder="Cole o JSON aqui..." className="w-full bg-white border border-gray-200 rounded-2xl p-4 text-xs font-mono h-48 mt-4" />
                  <div className="flex gap-4 mt-6">
                    <button onClick={processImportedJson} disabled={isProcessingJson || !jsonImportText.trim()} className="flex-1 bg-gray-900 text-white font-bold py-4 rounded-xl uppercase tracking-widest text-[10px]">{isProcessingJson ? <Loader2 className="animate-spin mx-auto" /> : 'Importar JSON'}</button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="p-6 border-t border-gray-100 bg-gray-50 sm:hidden">
            <button 
              onClick={handleSubmit} 
              disabled={!title.trim() || isSubmitting || isDeleting} 
              className="w-full bg-orange-500 text-white py-4 rounded-2xl font-black shadow-lg shadow-orange-500/20 disabled:opacity-50"
            >
              {isSubmitting ? 'Salvando...' : isDeleting ? 'Excluindo...' : 'Salvar Alterações'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
