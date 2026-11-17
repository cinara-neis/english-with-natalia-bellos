import catalog from "../../../shared/gameCatalog.json";
export type MemoryItem = { word: string; picture: string; colour?: string };
export const memoryCategories: Record<string, { label: string; items: MemoryItem[] }> = catalog.memoryCategories;

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
