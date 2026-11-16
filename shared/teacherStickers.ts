export const teacherStickers = {
  books: { icon: "📚", label: "English books", note: "A little reading goes a long way." },
  practice: { icon: "✏️", label: "English practice", note: "Try writing a little English today." },
  purple: { icon: "💜", label: "BTS-inspired purple heart", note: "A purple heart for BTS fans." },
  music: { icon: "🎤", label: "K-pop microphone", note: "Practise listening with a favourite song." },
  stars: { icon: "✨", label: "Sparkles", note: "Celebrate every little step." },
} as const;

export type TeacherSticker = keyof typeof teacherStickers;
export const maxTeacherStickers = 3;
