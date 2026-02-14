const SUBJECT_COLOR_PALETTE = [
  {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-900',
    subtle: 'text-blue-700',
    accent: 'bg-blue-400'
  },
  {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-900',
    subtle: 'text-emerald-700',
    accent: 'bg-emerald-400'
  },
  {
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    text: 'text-violet-900',
    subtle: 'text-violet-700',
    accent: 'bg-violet-400'
  },
  {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-900',
    subtle: 'text-amber-700',
    accent: 'bg-amber-400'
  },
  {
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    text: 'text-rose-900',
    subtle: 'text-rose-700',
    accent: 'bg-rose-400'
  },
  {
    bg: 'bg-cyan-50',
    border: 'border-cyan-200',
    text: 'text-cyan-900',
    subtle: 'text-cyan-700',
    accent: 'bg-cyan-400'
  },
  {
    bg: 'bg-teal-50',
    border: 'border-teal-200',
    text: 'text-teal-900',
    subtle: 'text-teal-700',
    accent: 'bg-teal-400'
  },
  {
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    text: 'text-indigo-900',
    subtle: 'text-indigo-700',
    accent: 'bg-indigo-400'
  }
] as const;

const hashString = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) - hash) + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

export const getSubjectColorClasses = (subjectKey: string) => {
  const key = subjectKey || 'default-subject';
  const idx = hashString(key) % SUBJECT_COLOR_PALETTE.length;
  return SUBJECT_COLOR_PALETTE[idx];
};
