export type RankingGroup = "students" | "visitors";
export type RankingGame = "memory" | "hangman" | "doku" | "crossword";
export type RankingConfig = { game: RankingGame; topic?: string; size?: number; key?: string };
export type PlayerIdentity = { session: string; cohort: RankingGroup; nickname: string; enabled: boolean };
export type RankedFace = { word: string; side: "word" | "picture"; picture: string; colour?: string };
export type RankedRun = {
  id: string; version: number; config: RankingConfig; won: boolean; lost: boolean;
  metric: number; message: string; recorded: boolean;
  cards?: (RankedFace | null)[]; matched?: boolean[]; needsCover?: boolean;
  word?: string; clue?: string; guesses?: string[]; remaining?: number;
  regions?: number[]; cats?: number[]; marks?: number[]; lives?: number;
  cells?: boolean[]; clues?: string[]; incorrect?: number[];
};
export type RankingEntry = { nickname: string; wins: number; best: number; milliseconds: number };
export const rankingGames: { id: RankingGame; label: string; metric: string }[] = [
  { id: "memory", label: "Memory", metric: "Fewest turns" },
  { id: "hangman", label: "Hangman", metric: "Fewest wrong guesses" },
  { id: "doku", label: "Meow-doku", metric: "Fewest hearts lost" },
  { id: "crossword", label: "Crossword", metric: "Fewest incorrect checks" },
];
