export function localStudentAccounts(root: string): { read: () => Promise<Record<string, unknown>>; update: (change: (current: any) => any) => Promise<void> };
export function createStudentInvite(accounts: unknown, catalog: unknown, studentId: unknown): Promise<{ status: number; data: unknown }>;
