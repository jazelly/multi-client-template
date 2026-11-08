// Role-based access. The product fixes the list of permissions; each org decides which roles it has and which
// permissions each role holds (stored in the roles table). The server is the one that enforces them; clients use
// can() only to hide controls the signed-in person cannot use.

export const PERMISSIONS = [
  { key: 'notes.write', label: 'Write notes' },
  { key: 'members.manage', label: 'Manage members and roles' },
] as const;

export type Permission = (typeof PERMISSIONS)[number]['key'];

export interface Role {
  key: string;
  name: string;
  permissions: Permission[];
}

/** The roles a new org starts with. */
export const DEFAULT_ROLES: Role[] = [
  { key: 'owner', name: 'Owner', permissions: PERMISSIONS.map((p) => p.key) },
  { key: 'editor', name: 'Editor', permissions: ['notes.write'] },
  { key: 'viewer', name: 'Viewer', permissions: [] },
];

export const can = (role: { permissions: readonly string[] } | undefined, p: Permission) => !!role?.permissions.includes(p);

export const permissionLabel = (p: Permission) => PERMISSIONS.find((x) => x.key === p)!.label;
