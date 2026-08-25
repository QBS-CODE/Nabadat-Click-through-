// SCR-02 Step-2 credential lifecycle controls (T196, US8) — the edit-mode half of authentication.
//
// Initial generation happens inside the create wizard (US3). This panel covers the ONGOING
// operations on an existing integration:
//   • Revoke (Dialog D-3) — immediate and irreversible; every later request signed with it gets
//     401 E-1401. There is no "un-revoke" anywhere (Status Lifecycle).
//   • Generate a replacement — implicitly revokes the current active credential with NO separate
//     confirmation (BR-16, `[Derived from UI]`).
//
// Two things deliberately absent, both ratified removals guarded by T190's field-set test:
// no expiry / sandbox / IP-allow-list fields, and no grant-type / token-lifetime fields — the
// OAuth values are fixed in code and appear only as hint text (BR-17, `[PO-G13]`).
//
// The current credential is identified by its LABEL, not a masked secret: the server's
// `CredentialResponse` carries no masked form (the plaintext is hashed at rest, BR-16), so the
// label is the only stable human handle for it.

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { KeyRound, Loader2, ShieldOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Credential, CredentialInput, OAuthScope } from "@/features/integration-hub/api"

export interface CredentialManagementPanelProps {
  /** The integration's current credential; null when none has been generated. */
  credential: Credential | null
  /** Fixed at first generation — the replacement must use the same mechanism. */
  mechanism: "api_key" | "oauth_client"
  /** Existing scopes, reused for an OAuth replacement. */
  scopes: OAuthScope[]
  busy: boolean
  onGenerate: (input: CredentialInput) => Promise<void>
  onRevoke: () => Promise<void>
}

export function CredentialManagementPanel({
  credential,
  mechanism,
  scopes,
  busy,
  onGenerate,
  onRevoke,
}: CredentialManagementPanelProps) {
  const { t } = useTranslation()
  const [confirmRevoke, setConfirmRevoke] = useState(false)
  const [replacementLabel, setReplacementLabel] = useState("")

  const isActive = credential?.status === "active"

  async function handleGenerate() {
    const label = replacementLabel.trim() || credential?.labelOrClientName || "Replacement"
    await onGenerate(
      mechanism === "api_key"
        ? { mechanism: "api_key", keyLabel: label }
        : { mechanism: "oauth_client", clientName: label, scopes },
    )
    setReplacementLabel("")
  }

  async function handleRevoke() {
    await onRevoke()
    setConfirmRevoke(false)
  }

  return (
    // No card/border of its own: this renders INSIDE the mechanism's configuration card as its
    // second grid column, so the current credential sits beside the label it belongs to (reference
    // layout). A separate "Credential" card repeated the heading and split one decision in two.
    <>
      <div className="flex flex-col gap-1.5" data-testid="credential-panel">
        <Label htmlFor="current-credential">
          {mechanism === "api_key"
            ? t("integrationHub.credentials.currentKey")
            : t("integrationHub.credentials.currentClient")}
        </Label>
        {credential ? (
          <>
            <div className="flex items-center gap-2">
              {/* Shows the credential's LABEL, not a masked secret. The reference mock displays
                  `nbd_live_•••••••6H4D`, but `CredentialResponse` carries no masked form — the
                  plaintext is hashed at rest and shown once at generation (BR-16) — so the label is
                  the only stable handle the server can give us. Rendering a fake mask here would
                  imply the secret is recoverable. */}
              <Input
                id="current-credential"
                readOnly
                dir="ltr"
                value={credential.labelOrClientName}
                className="bg-muted font-mono text-xs text-muted-foreground md:text-xs"
                data-testid="credential-label"
              />
              {isActive && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  className="shrink-0 text-destructive hover:text-destructive"
                  data-testid="credential-revoke"
                  onClick={() => setConfirmRevoke(true)}
                >
                  <ShieldOff className="size-4" />
                  {t("integrationHub.credentials.revoke")}
                </Button>
              )}
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {isActive
                ? t("integrationHub.credentials.activeHelp", {
                    date: new Date(credential.generatedAt).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    }),
                  })
                : t("integrationHub.credentials.revokedHelp")}
            </p>
          </>
        ) : (
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t("integrationHub.credentials.none")}
          </p>
        )}
      </div>

      {/* Rotation spans the card: it replaces whatever is above it, so it should not read as a
          third column. The label is optional — blank reuses the current one. */}
      <div className="flex flex-col gap-3 md:col-span-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-1.5 sm:max-w-xs sm:flex-1">
            <Label htmlFor="replacement-label">
              {mechanism === "api_key"
                ? t("integrationHub.credentials.newKeyLabel")
                : t("integrationHub.credentials.newClientName")}
            </Label>
            <Input
              id="replacement-label"
              value={replacementLabel}
              className="text-xs md:text-xs"
              placeholder={credential?.labelOrClientName ?? ""}
              data-testid="replacement-label"
              onChange={(e) => setReplacementLabel(e.target.value)}
            />
          </div>
          {/* The primary action of this card — filled, per the reference. */}
          <Button
            type="button"
            disabled={busy}
            data-testid="credential-generate"
            onClick={() => void handleGenerate()}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
            {mechanism === "api_key"
              ? t("integrationHub.credentials.generateKey")
              : t("integrationHub.credentials.generateClient")}
          </Button>
        </div>
        {/* BR-16 — generating while one is active revokes it with NO separate confirmation. Say so
            up front rather than surprising the user after the fact. */}
        {isActive && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t("integrationHub.credentials.regenerateWarning")}
          </p>
        )}
      </div>

      {/* Dialog D-3 — names the credential and the consequence; destructive, irreversible. */}
      <Dialog open={confirmRevoke} onOpenChange={setConfirmRevoke}>
        <DialogContent className="sm:max-w-md" data-testid="revoke-dialog">
          <DialogHeader>
            <DialogTitle>{t("integrationHub.credentials.revokeTitle")}</DialogTitle>
            <DialogDescription>
              {t("integrationHub.credentials.revokeBody", {
                label: credential?.labelOrClientName ?? "",
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setConfirmRevoke(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              data-testid="confirm-revoke"
              onClick={() => void handleRevoke()}
            >
              {t("integrationHub.credentials.revokeConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
