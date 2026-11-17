export type MemoryItem = { word: string; picture: string; colour?: string };
export const memoryCategories: Record<string, { label: string; items: MemoryItem[] }> = {
  animals: {
    label: "Animals",
    items: [
      { word: "cat", picture: "🐈" }, { word: "dog", picture: "🐕" },
      { word: "bird", picture: "🐦" }, { word: "fish", picture: "🐟" },
      { word: "rabbit", picture: "🐇" }, { word: "turtle", picture: "🐢" },
      { word: "elephant", picture: "🐘" }, { word: "giraffe", picture: "🦒" },
      { word: "lion", picture: "🦁" }, { word: "butterfly", picture: "🦋" },
      { word: "horse", picture: "🐎" }, { word: "penguin", picture: "🐧" },
    ],
  },
  professions: {
    label: "Professions",
    items: [
      { word: "doctor", picture: "🧑‍⚕️" }, { word: "teacher", picture: "🧑‍🏫" },
      { word: "chef", picture: "🧑‍🍳" }, { word: "farmer", picture: "🧑‍🌾" },
      { word: "artist", picture: "🧑‍🎨" }, { word: "firefighter", picture: "🧑‍🚒" },
      { word: "pilot", picture: "🧑‍✈️" }, { word: "astronaut", picture: "🧑‍🚀" },
      { word: "mechanic", picture: "🧑‍🔧" }, { word: "scientist", picture: "🧑‍🔬" },
      { word: "singer", picture: "🧑‍🎤" }, { word: "police officer", picture: "👮" },
    ],
  },
  fruits: {
    label: "Fruits",
    items: [
      { word: "apple", picture: "🍎" }, { word: "banana", picture: "🍌" },
      { word: "grapes", picture: "🍇" }, { word: "strawberry", picture: "🍓" },
      { word: "orange", picture: "🍊" }, { word: "pineapple", picture: "🍍" },
      { word: "watermelon", picture: "🍉" }, { word: "pear", picture: "🍐" },
      { word: "cherries", picture: "🍒" }, { word: "lemon", picture: "🍋" },
      { word: "peach", picture: "🍑" }, { word: "kiwi", picture: "🥝" },
    ],
  },
  colours: {
    label: "Colours",
    items: [
      { word: "red", picture: "", colour: "#e23636" },
      { word: "blue", picture: "", colour: "#2673df" },
      { word: "yellow", picture: "", colour: "#ffdf36" },
      { word: "green", picture: "", colour: "#248e4e" },
      { word: "orange", picture: "", colour: "#f58d26" },
      { word: "purple", picture: "", colour: "#7941ad" },
      { word: "pink", picture: "", colour: "#f29abc" },
      { word: "brown", picture: "", colour: "#87522e" },
      { word: "black", picture: "", colour: "#202020" },
      { word: "white", picture: "", colour: "#ffffff" },
      { word: "grey", picture: "", colour: "#999999" },
      { word: "turquoise", picture: "", colour: "#36c8c2" },
    ],
  },
};

export type MemoryCard = MemoryItem & { id: string; side: "word" | "picture" };

function shuffled<T>(items: T[]) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

export function memoryDeck(category: string, size: number): MemoryCard[] {
  const selected = shuffled(memoryCategories[category].items).slice(0, size / 2);
  return shuffled(selected.flatMap(item => [
    { ...item, id: item.word + "-word", side: "word" as const },
    { ...item, id: item.word + "-picture", side: "picture" as const },
  ]));
}
