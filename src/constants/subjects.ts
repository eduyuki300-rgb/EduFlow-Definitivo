export const SUBJECT_INFO: Record<string, { emoji: string; tagColor: string; cardBg: string }> = {
  Geral: { emoji: '📚', tagColor: 'bg-gray-100 text-gray-700 border-gray-200', cardBg: 'bg-white' },
  Biologia: { emoji: '🧬', tagColor: 'bg-green-100 text-green-700 border-green-200', cardBg: 'bg-green-50/50' },
  Física: { emoji: '⚛️', tagColor: 'bg-blue-100 text-blue-700 border-blue-200', cardBg: 'bg-blue-50/50' },
  Química: { emoji: '🧪', tagColor: 'bg-purple-100 text-purple-700 border-purple-200', cardBg: 'bg-purple-50/50' },
  Matemática: { emoji: '📐', tagColor: 'bg-red-100 text-red-700 border-red-200', cardBg: 'bg-red-50/50' },
  Linguagens: { emoji: '🗣️', tagColor: 'bg-yellow-100 text-yellow-700 border-yellow-200', cardBg: 'bg-yellow-50/50' },
  Humanas: { emoji: '🌍', tagColor: 'bg-orange-100 text-orange-700 border-orange-200', cardBg: 'bg-orange-50/50' },
  Redação: { emoji: '✍️', tagColor: 'bg-teal-100 text-teal-700 border-teal-200', cardBg: 'bg-teal-50/50' },
};

export const SUBJECTS = Object.keys(SUBJECT_INFO);
