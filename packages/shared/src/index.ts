// Types and rules every client and the server share. Source is imported directly (no build step): Vite, Metro and
// tsx all compile TypeScript from the workspace.

export * from './access';

export interface Note {
  id: string;
  text: string;
  authorName: string;
  createdAt: string;
}

/** GET /api/me */
export interface Me {
  user: { id: string; name: string; email: string };
  org: { id: string; name: string };
  role: { key: string; name: string; permissions: string[] };
}
