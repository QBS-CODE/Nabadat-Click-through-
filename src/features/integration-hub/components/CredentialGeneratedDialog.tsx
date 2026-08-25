// Dialogs D-1 (API key generated) and D-2 (client credentials generated) — T086, US3.
//
// The single most security-sensitive component in the module: this is the ONLY moment the
// plaintext secret exists in the UI (BR-16, show-once). Three rules it must obey:
//   1. The secret is held in the parent's component state and passed as a prop — never written to
//      localStorage/sessionStorage, never logged, never re-fetchable after Done.
//   2. Closing (Done / Esc / scrim) discards it; there is no "show again".
//   3. The dialog states plainly that it is shown only once and that a lost key must be revoked
//      and regenerated.
//
// One component covers both dialogs — D-2 is D-1 plus the client_id and the fixed grant-type /
// token-lifetime hints (BR-17: both fixed in code, never configurable fields).

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { AlertTriangle, Check, Copy } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import type { GeneratedCredential } from "@/features/integration-hub/api"

export interface CredentialGeneratedDialogProps {
  /** The show-once payload; `null` closes the dialog. */
  credential: GeneratedCredential | null
  onDone: () => void
}

/** One copyable read-only value with a Copy button that flips to "Copied ✓". */
function CopyableValue({
  id,
  label,
  value,
  testId,
}: {
  id: string
  label: string
  value: string
  testId: string
}) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard can be blocked (insecure origin / denied permission) — the value stays
      // selectable on screen, so a copy failure must never break the flow or hide the secret.
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <code
          id={id}
          dir="ltr"
          data-testid={testId}
          className="min-w-0 flex-1 overflow-x-auto rounded-md bg-muted px-3 py-2 font-mono text-sm"
        >
          {value}
        </code>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={t("integrationHub.credentialDialog.copy")}
          data-testid={`${testId}-copy`}
          onClick={() => void copy()}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </Button>
      </div>
      {copied && (
        <p className="text-sm text-muted-foreground" role="status">
          {t("integrationHub.credentialDialog.copied")}
        </p>
      )}
    </div>
  )
}

export function CredentialGeneratedDialog({
  credential,
  onDone,
}: CredentialGeneratedDialogProps) {
  const { t } = useTranslation()
  const isOAuth = credential?.credential.mechanism === "oauth_client"

  return (
    <Dialog open={credential != null} onOpenChange={(open) => !open && onDone()}>
      <DialogContent
        className="flex max-h-[90vh] flex-col sm:max-w-lg"
        data-testid="credential-dialog"
      >
        <DialogHeader className="shrink-0">
          <DialogTitle>
            {isOAuth
              ? t("integrationHub.credentialDialog.oauthTitle")
              : t("integrationHub.credentialDialog.apiKeyTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("integrationHub.credentialDialog.showOnce")}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-1">
          {credential && (
            <>
              {isOAuth && credential.clientId && (
                <CopyableValue
                  id="cred-client-id"
                  testId="cred-client-id"
                  label={t("integrationHub.credentialDialog.clientId")}
                  value={credential.clientId}
                />
              )}

              <CopyableValue
                id="cred-secret"
                testId="cred-secret"
                label={
                  isOAuth
                    ? t("integrationHub.credentialDialog.clientSecret")
                    : t("integrationHub.credentialDialog.apiKey")
                }
                value={credential.secret}
              />

              <Alert variant="destructive">
                <AlertTriangle className="size-4" />
                <AlertDescription>
                  {t("integrationHub.credentialDialog.storeWarning")}
                </AlertDescription>
              </Alert>

              {isOAuth && (
                <div className="space-y-1 rounded-md border border-border p-4 text-sm text-muted-foreground">
                  {credential.tokenEndpoint && (
                    <p dir="ltr" className="font-mono break-all">
                      {credential.tokenEndpoint}
                    </p>
                  )}
                  {/* BR-17 — grant type and token lifetime are fixed in code; shown as hints
                      only, never as editable fields. */}
                  <p>{t("integrationHub.credentialDialog.oauthFixedHint")}</p>
                  {credential.credential.scopes.length > 0 && (
                    <p dir="ltr" className="font-mono break-all">
                      {credential.credential.scopes.join("  ")}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="shrink-0">
          <Button onClick={onDone} data-testid="credential-done">
            {t("integrationHub.credentialDialog.done")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
