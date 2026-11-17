export const teacherStickers = {
  btsTogether: { icon: "💜", photo: "together", label: "BTS group photo", note: "Open a photo of all seven members." },
  btsCarpet: { icon: "📸", photo: "carpet", label: "BTS red carpet photo", note: "Open a photo of BTS on the red carpet." },
  btsStage: { icon: "🎶", photo: "stage", label: "BTS concert photo", note: "Open a photo of BTS on stage." },
  tea: { icon: "🍵", label: "Tea time", note: "Would you like a cup of tea? Practise offering a drink in English." },
  cat: { icon: "🐈", label: "Study cat", note: "The cat is studying with us. What is your cat doing?" },
  art: { icon: "🎨", label: "Art studio", note: "Describe your favourite painting in English." },
  history: { icon: "🏛️", label: "History lover", note: "Tell your teacher about a historical place you would like to visit." },
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
