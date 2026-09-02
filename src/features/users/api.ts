// M-10 User Management API client — CLICKTHROUGH MOCK.
//
// Serves entirely from the in-memory store in `@/data/mock-user-management` and NEVER contacts a
// backend (no fetch / callJson / http.ts import). The export surface is identical to the real
// `features/users/api.ts` — same function names, signatures, return types and re-exports — so the
// pages and components that import from "@/features/users/api" compile and render unchanged.
//
// Writes mutate the store, so add/edit/deactivate all take effect for the rest of the session and
// are appended to the audit log. They reset on refresh; the clickthrough has no database.

import { recordEvent, delay, mockId, summaryOf, userStore } from "@/data/mock-user-management"
import { UsersApiError } from "./users-api-error"
import type {
  CreateUserData,
  ListUsersParams,
  ModuleAssignment,
  UpdateUserData,
  UserDetail,
  UserListResponse,
  UserSummary,
} from "./dto"

export type * from "./dto"
export { UsersApiError } from "./users-api-error"

function find(id: string): UserDetail {
  const user = userStore.find((u) => u.userId === id)
  if (!user) {
    throw new UsersApiError(404, { error: { code: "user.not_found", message: "User not found" } })
  }
  return user
}

function touch(user: UserDetail) {
  user.updatedAt = new Date().toISOString()
}

/** Lists tenant users (cursor-paginated) with optional status/persona/search filters. */
export async function listUsers(params: ListUsersParams = {}): Promise<UserListResponse> {
  const q = params.q?.trim().toLowerCase()
  const filtered = userStore.filter((u) => {
    if (params.status && u.status !== params.status) return false
    if (params.persona && u.persona !== params.persona) return false
    if (q && !u.username.toLowerCase().includes(q)) return false
    return true
  })

  // Cursor pagination, same contract as the real endpoint: the token is the next offset.
  const size = params.pageSize ?? 25
  const start = params.pageToken ? Number(params.pageToken) : 0
  const page = filtered.slice(start, start + size)
  const next = start + size < filtered.length ? String(start + size) : null

  return delay({ items: page.map(summaryOf), nextPageToken: next, totalCount: filtered.length })
}

/** Invites a new tenant user (P-01/P-07 only). */
export async function createUser(data: CreateUserData): Promise<UserSummary> {
  if (userStore.some((u) => u.username.toLowerCase() === data.username.toLowerCase())) {
    throw new UsersApiError(409, {
      error: { code: "user.duplicate_username", message: "A user with this username already exists." },
    })
  }
  const now = new Date().toISOString()
  const created: UserDetail = {
    userId: mockId(`${data.username}-${Date.now()}`),
    username: data.username,
    persona: data.persona,
    status: "pending-enrollment",
    isMfaEnrolled: false,
    organizationNodeId: data.organizationNodeId ?? null,
    createdAt: now,
    updatedAt: now,
    lastPermissionSnapshotVersion: 1,
    permissionModuleAssignments: [],
  }
  userStore.unshift(created)
  recordEvent({ eventType: "user.invited", entityType: "User", entityId: created.userId, newValue: { persona: data.persona } })
  return delay(summaryOf(created))
}

/** Returns a user's profile plus permission module assignments. */
export async function getUser(id: string): Promise<UserDetail> {
  return delay({ ...find(id) })
}

/** Updates a user's profile (persona change is P-01-only). */
export async function updateUser(id: string, data: UpdateUserData): Promise<void> {
  const user = find(id)
  const previous = user.persona
  if (data.persona) user.persona = data.persona
  if (data.organizationNodeId !== undefined) user.organizationNodeId = data.organizationNodeId
  touch(user)
  if (data.persona && data.persona !== previous) {
    recordEvent({
      eventType: "user.persona_changed", entityType: "User", entityId: id,
      oldValue: { persona: previous }, newValue: { persona: data.persona },
    })
  }
  return delay(undefined)
}

/** Soft-deletes a user and revokes their sessions. */
export async function deactivateUser(id: string): Promise<void> {
  const user = find(id)
  user.status = "inactive"
  touch(user)
  recordEvent({ eventType: "user.deactivated", entityType: "User", entityId: id, oldValue: { status: "active" }, newValue: { status: "inactive" } })
  return delay(undefined)
}

/** Re-activates an inactive user. */
export async function reactivateUser(id: string): Promise<void> {
  const user = find(id)
  user.status = user.isMfaEnrolled ? "active" : "pending-enrollment"
  touch(user)
  recordEvent({ eventType: "user.reactivated", entityType: "User", entityId: id, oldValue: { status: "inactive" }, newValue: { status: user.status } })
  return delay(undefined)
}

/** Manually unlocks a locked account. */
export async function unlockUser(id: string): Promise<void> {
  const user = find(id)
  user.status = "active"
  touch(user)
  recordEvent({ eventType: "user.unlocked", entityType: "User", entityId: id })
  return delay(undefined)
}

/** Admin-triggered MFA reset (forces re-enrollment). */
export async function resetMfa(id: string): Promise<void> {
  const user = find(id)
  user.isMfaEnrolled = false
  user.status = "pending-enrollment"
  touch(user)
  recordEvent({ eventType: "user.mfa_reset", entityType: "User", entityId: id })
  return delay(undefined)
}

/** Admin-triggered password reset (notifies the user via M-09). */
export async function adminPasswordReset(id: string): Promise<void> {
  find(id)
  recordEvent({ eventType: "user.password_reset", entityType: "User", entityId: id })
  return delay(undefined)
}

/** Replaces a user's full set of permission module assignments. */
export async function updatePermissions(id: string, assignments: ModuleAssignment[]): Promise<void> {
  const user = find(id)
  const before = user.permissionModuleAssignments.length
  user.permissionModuleAssignments = assignments
  user.lastPermissionSnapshotVersion += 1
  touch(user)
  recordEvent({
    eventType: "user.permissions.updated", entityType: "User", entityId: id,
    oldValue: { modules: before }, newValue: { modules: assignments.length },
  })
  return delay(undefined)
}
