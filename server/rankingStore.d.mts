export type RankingStore = {
  read(): Promise<any>;
  update(change: (value: any) => any): Promise<any>;
};
export function localRankings(root: string): RankingStore;
export function emptyRanking(): any;
