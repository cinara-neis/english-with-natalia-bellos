import type { IncomingMessage, ServerResponse } from "node:http";
import type { Duplex } from "node:stream";
export function accountLoader(
  root: string,
  env?: Record<string, string | undefined>,
): () => Promise<Record<string, { salt: string; hash: string }>>;
export function createCommunity(options: {
  store: unknown;
  accounts: () => Promise<unknown>;
  allowedOrigin: (origin: string | undefined, req: IncomingMessage) => boolean;
}): {
  handleHttp(req: IncomingMessage, res: ServerResponse): Promise<void>;
  upgrade(req: IncomingMessage, socket: Duplex, head: Buffer): boolean;
  close(): void;
};
