"use client";

import { CheckCircle2, Clipboard, KeyRound, LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { WorkspaceUser } from "@/lib/types";

type SetupPayload = {
  secret: string;
  otpAuthUri: string;
  qrCodeDataUrl: string;
};

export function TotpSetupDialog({
  open,
  mandatory = false,
  user,
  onOpenChange,
  onComplete,
}: {
  open: boolean;
  mandatory?: boolean;
  user: WorkspaceUser;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}) {
  const [setup, setSetup] = useState<SetupPayload | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const startSetup = useCallback(async () => {
    setLoading(true);
    setError("");
    setSetup(null);
    setCode("");
    setRecoveryCodes([]);
    try {
      const response = await fetch("/api/auth/totp/setup", { method: "POST" });
      const payload = (await response.json()) as SetupPayload & { error?: string };
      if (!response.ok || !payload.secret) {
        throw new Error(payload.error ?? "Authenticator тохиргоог эхлүүлэх боломжгүй.");
      }
      setSetup(payload);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Authenticator тохиргоог эхлүүлэх боломжгүй.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void startSetup();
  }, [open, startSetup, user.id]);

  const confirmSetup = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/auth/totp/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const payload = (await response.json()) as {
        recoveryCodes?: string[];
        error?: string;
      };
      if (!response.ok || !payload.recoveryCodes?.length) {
        throw new Error(payload.error ?? "Authenticator кодыг баталгаажуулах боломжгүй.");
      }
      setRecoveryCodes(payload.recoveryCodes);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Authenticator кодыг баталгаажуулах боломжгүй.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const finish = () => {
    onComplete?.();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && mandatory && !recoveryCodes.length) return;
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent
        showCloseButton={!mandatory || recoveryCodes.length > 0}
        className="w-[min(480px,calc(100vw-24px))] max-w-none gap-0 overflow-hidden rounded-2xl bg-surface-raised p-0 shadow-[var(--shadow-lg)] ring-1 ring-border sm:max-w-none"
      >
        <DialogHeader className="gap-1 border-b border-border px-6 py-5 pr-14">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <KeyRound className="text-brand" size={20} />
            Authenticator тохируулах
          </DialogTitle>
          <DialogDescription className="text-xs leading-5">
            {user.email} эрхийн password recovery кодыг Google эсвэл Microsoft Authenticator-аас авна.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 px-6 py-5">
          {recoveryCodes.length ? (
            <>
              <Alert className="border-success/30 bg-success/10">
                <CheckCircle2 size={16} />
                <AlertDescription>
                  Authenticator амжилттай идэвхжлээ. Доорх кодуудыг аюулгүй газар хадгална уу.
                </AlertDescription>
              </Alert>
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-surface-soft p-4 font-mono text-sm tracking-wide">
                {recoveryCodes.map((recoveryCode) => (
                  <code key={recoveryCode}>{recoveryCode}</code>
                ))}
              </div>
              <p className="text-[11px] leading-5 text-muted-foreground">
                Утсаа ашиглах боломжгүй үед нэг recovery code-оор password сэргээнэ. Код бүр зөвхөн нэг удаа ажиллана.
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    void navigator.clipboard.writeText(recoveryCodes.join("\n"));
                    setCopied(true);
                  }}
                >
                  <Clipboard size={16} /> {copied ? "Хуулагдлаа" : "Код хуулах"}
                </Button>
                <Button type="button" className="flex-1" onClick={finish}>
                  Дуусгах
                </Button>
              </div>
            </>
          ) : loading ? (
            <div className="flex min-h-56 items-center justify-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="animate-spin" size={18} /> QR code үүсгэж байна…
            </div>
          ) : setup ? (
            <form className="grid gap-4" onSubmit={confirmSetup}>
              <div className="grid place-items-center rounded-xl border border-border bg-white p-3">
                <img
                  className="size-52"
                  src={setup.qrCodeDataUrl}
                  alt="Pro Team Authenticator QR code"
                />
              </div>
              <div className="grid gap-1.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">
                  QR ажиллахгүй бол setup key
                </span>
                <code className="break-all rounded-lg bg-surface-soft px-3 py-2 text-center text-xs tracking-[0.16em]">
                  {setup.secret}
                </code>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="totp-setup-code">Authenticator-ийн 6 оронтой код</Label>
                <Input
                  id="totp-setup-code"
                  value={code}
                  onChange={(event) => {
                    setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                    setError("");
                  }}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  minLength={6}
                  maxLength={6}
                  required
                />
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" disabled={submitting || code.length !== 6}>
                {submitting && <LoaderCircle className="animate-spin" size={16} />}
                Код баталгаажуулах
              </Button>
            </form>
          ) : (
            <>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button type="button" onClick={() => void startSetup()}>
                Дахин оролдох
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
