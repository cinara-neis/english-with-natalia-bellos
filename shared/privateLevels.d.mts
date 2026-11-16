import type { Manifest } from "./content";
export function newLevelsKey(): string;
export function readPrivateLevels(sealed?: string, secret?: string): Promise<Record<string, string>>;
export function protectLevels(manifest: Manifest, secret?: string): Promise<Manifest>;
export function revealLevels(manifest: Manifest, secret?: string): Promise<Manifest>;
