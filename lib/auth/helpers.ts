// Re-export auth helpers from permissions module for backward compatibility
export { requireAuth, requirePermission, hasPermission } from "./permissions"
export type { Permission } from "./permissions"
