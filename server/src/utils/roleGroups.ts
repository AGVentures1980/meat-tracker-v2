export const DIRECTOR_ROLES = [
  'admin', 'director', 'partner',
  'corporate_director', 'regional_director'
] as const;

export const MANAGER_ROLES = [
  'admin', 'director', 'manager', 'area_manager', 'partner',
  'corporate_director', 'regional_director',
  'property_manager', 'executive_chef'
] as const;

export const OPERATOR_ROLES = [
  ...MANAGER_ROLES,
  'outlet_manager', 'kitchen_operator'
] as const;

export const VIEWER_ROLES = [
  ...OPERATOR_ROLES,
  'viewer', 'read_only_viewer'
] as const;

// Helper: check if role is in group
export function hasRole(userRole: string, group: readonly string[]): boolean {
  return group.includes(userRole as any);
}
