export const teacherStickers = {
  books: { icon: "📚", label: "English books", note: "A little reading goes a long way." },
  practice: { icon: "✏️", label: "English practice", note: "Try writing a little English today." },
  purple: { icon: "💜", label: "BTS-inspired purple heart", note: "A purple heart for BTS fans." },
  music: { icon: "🎤", label: "K-pop microphone", note: "Practise listening with a favourite song." },
  study: { icon: "📖", accent: "✨", label: "Open English book", note: "Pick a new English word and use it in a sentence." },
  hello: { icon: "👋", accent: "💬", label: "Hello in English", note: "Try saying: Hello! How are you today?" },
  listening: { icon: "🎧", accent: "♫", label: "Listening practice", note: "Listen for a phrase you recognise and repeat it aloud." },
  tour: { icon: "🎫", accent: "✦", label: "K-pop concert ticket", note: "How would you describe your favourite concert in English?" },
  lightstick: { icon: "🔮", accent: "✧", label: "Purple concert light", note: "Wave your light and sing along." },
  group: { icon: "💜", accent: "✦", label: "BTS-inspired seven-member group", note: "Seven performers, one stage. Can you introduce your favourite group in English?" },
  stars: { icon: "✨", label: "Sparkles", note: "Celebrate every little step." },
} as const;

export type TeacherSticker = keyof typeof teacherStickers;
export const maxTeacherStickers = 3;
