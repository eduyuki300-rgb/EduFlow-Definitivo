/**
 * Smart Parser 3.0 - EduFlow Core Logic
 * Centraliza a extração de metadados de strings de tarefas.
 */

export interface TaskMetadata {
  cleanTitle: string;
  priority: 'alta' | 'media' | 'baixa' | null;
  time: string | null;
  tags: string[];
}

const PRIORITY_REGEX = /!(alta|media|baixa)/i;
const TAG_REGEX = /#([\wáàâãéèêíïóôõöúç]+)/gi;
const TIME_REGEX = /às\s+(\d{1,2}[:h]\d{0,2})/i;

export function parseTaskTitle(title: string): TaskMetadata {
  if (!title) {
    return { cleanTitle: '', priority: null, time: null, tags: [] };
  }

  const priorityMatch = title.match(PRIORITY_REGEX);
  const timeMatch = title.match(TIME_REGEX);
  
  // Extração de tags com suporte a acentos
  const tagsResults = Array.from(title.matchAll(TAG_REGEX));
  const tags = tagsResults.map(m => m[1].toLowerCase());

  // Limpeza profunda da string
  let cleanTitle = title
    .replace(PRIORITY_REGEX, '')
    .replace(TIME_REGEX, '')
    .replace(TAG_REGEX, '')
    .replace(/h:/i, '') // Remove prefixo de hábito antigo se existir
    .replace(/\s+/g, ' ') // Remove espaços duplicados
    .trim();

  return {
    cleanTitle,
    priority: priorityMatch ? (priorityMatch[1].toLowerCase() as any) : null,
    time: timeMatch ? timeMatch[1].replace('h', ':') : null,
    tags
  };
}
