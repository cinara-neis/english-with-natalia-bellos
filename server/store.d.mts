import type { Manifest } from "../shared/content";
export function acquireFileLock(file: string): Promise<() => void>;
export function fileStore(root: string): {
  read(): Promise<Manifest>;
  saveAppearance(
    id: string,
    appearance: { font: string; background: string },
  ): Promise<unknown>;
};
export function githubStore(
  env: Record<string, string | undefined>,
): ReturnType<typeof fileStore>;
