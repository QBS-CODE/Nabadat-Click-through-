// M-10 Data Scope & Custom Rules API client — CLICKTHROUGH MOCK.
//
// Serves from the shared in-memory store in `@/data/mock-user-management` and never contacts a
// backend. Export surface identical to the real `features/data-scope/api.ts`.
//
// A user with no seeded scope gets an empty one (they inherit their persona baseline), which is
// what the real endpoint returns too — so the empty state on the scope screen is reachable.

import { delay, mockId, recordEvent, scopeStore } from "@/data/mock-user-management"
import { DataScopeApiError } from "./data-scope-api-error"
import type { CustomRuleData, CustomRuleResponse, UpdateUserScopeData, UserScope } from "./dto"

export type * from "./dto"
export { DataScopeApiError } from "./data-scope-api-error"

function scopeFor(userId: string) {
  let record = scopeStore.get(userId)
  if (!record) {
    record = { organizationNodeId: null, dataScopeAssignments: [], customRules: [] }
    scopeStore.set(userId, record)
  }
  return record
}

function snapshot(userId: string): UserScope {
  const s = scopeFor(userId)
  return {
    organizationNodeId: s.organizationNodeId,
    dataScopeAssignments: s.dataScopeAssignments.map((a) => ({ ...a, allowedValues: [...a.allowedValues] })),
    customRules: s.customRules.map((r) => ({ ...r })),
  }
}

/** Returns a user's hierarchy node, parameter scope assignments, and custom rules. */
export async function getUserScope(userId: string): Promise<UserScope> {
  return delay(snapshot(userId))
}

/** Replaces a user's hierarchy node and parameter scope assignments (422 on invalid values). */
export async function updateUserScope(userId: string, data: UpdateUserScopeData): Promise<UserScope> {
  const record = scopeFor(userId)
  const empty = data.dataScopeAssignments.find((a) => a.allowedValues.length === 0)
  if (empty) {
    throw new DataScopeApiError(422, {
      error: {
        code: "scope.invalid_values",
        message: `"${empty.parameterName}" needs at least one allowed value.`,
      },
    })
  }
  record.organizationNodeId = data.organizationNodeId
  record.dataScopeAssignments = data.dataScopeAssignments
  recordEvent({
    eventType: "scope.updated", entityType: "UserScope", entityId: userId,
    newValue: Object.fromEntries(data.dataScopeAssignments.map((a) => [a.parameterName, a.allowedValues])),
  })
  return delay(snapshot(userId))
}

/** Creates a custom authorization rule for a user. */
export async function createCustomRule(userId: string, data: CustomRuleData): Promise<CustomRuleResponse> {
  const record = scopeFor(userId)
  const rule = {
    ruleId: mockId(`rule-${userId}-${record.customRules.length}-${Date.now()}`),
    allowedActions: data.allowedActions,
    parameterScopeAssignments: data.parameterScopeAssignments,
  }
  record.customRules.push(rule)
  recordEvent({
    eventType: "custom_rule.created", entityType: "CustomRule", entityId: userId,
    newValue: { allowedActions: data.allowedActions },
  })
  return delay({ ...rule, createdAt: new Date().toISOString() })
}

/** Updates an existing custom authorization rule. */
export async function updateCustomRule(
  userId: string,
  ruleId: string,
  data: CustomRuleData,
): Promise<CustomRuleResponse> {
  const record = scopeFor(userId)
  const rule = record.customRules.find((r) => r.ruleId === ruleId)
  if (!rule) {
    throw new DataScopeApiError(404, {
      error: { code: "custom_rule.not_found", message: "Custom rule not found" },
    })
  }
  rule.allowedActions = data.allowedActions
  rule.parameterScopeAssignments = data.parameterScopeAssignments
  recordEvent({ eventType: "custom_rule.updated", entityType: "CustomRule", entityId: userId })
  return delay({ ...rule, createdAt: new Date().toISOString() })
}

/** Deletes a custom authorization rule. */
export async function deleteCustomRule(userId: string, ruleId: string): Promise<void> {
  const record = scopeFor(userId)
  record.customRules = record.customRules.filter((r) => r.ruleId !== ruleId)
  recordEvent({ eventType: "custom_rule.deleted", entityType: "CustomRule", entityId: userId })
  return delay(undefined)
}
