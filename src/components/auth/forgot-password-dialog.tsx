"use client";

import { CheckCircle2, KeyRound, LoaderCircle } from "lucide-react";
import { useState } from "react";
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

type RecoveryStage = "verify" | "reset" | "done";

export function ForgotPasswordDialog({
  defaultEmail,
  onComplete,
}: {
  defaultEmail: string;
  onComplete: (email: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<RecoveryStage>("verify");
  const [email, setEmail] = useState(defaultEmail);
  const [proof, setProof] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const resetState = () => {
    setStage("verify");
    setProof("");
    setResetToken("");
    setPassword("");
    setConfirmPassword("");
    setError("");
    setSubmitting(false);
  };

  const verifyIdentity = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), proof }),
      });
      const payload = (await response.json()) as { resetToken?: string; error?: string };
      if (!response.ok || !payload.resetToken) {
        throw new Error(payload.error ?? "Баталгаажуулах боломжгүй.");
      }
      setResetToken(payload.resetToken);
      setStage("reset");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Баталгаажуулах боломжгүй.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8) {
      setError("Нууц үг хамгийн багадаа 8 тэмдэгттэй байна.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Нууц үгнүүд хоорондоо тохирохгүй байна.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken, password }),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Нууц үг шинэчлэх боломжгүй.");
      }
      setStage("done");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Нууц үг шинэчлэх боломжгүй.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="text-brand hover:underline"
        onClick={() => {
          setEmail(defaultEmail);
          setOpen(true);
        }}
      >
        Нууц үг мартсан?
      </button>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) resetState();
        }}
      >
        <DialogContent className="w-[min(430px,calc(100vw-24px))] max-w-none gap-0 overflow-hidden rounded-2xl bg-surface-raised p-0 shadow-[var(--shadow-lg)] ring-1 ring-border sm:max-w-none">
          <DialogHeader className="gap-1 border-b border-border px-6 py-5 pr-14">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <KeyRound className="text-brand" size={20} /> Нууц үг сэргээх
            </DialogTitle>
            <DialogDescription className="text-xs leading-5">
              Authenticator эсвэл хадгалсан recovery code-оор эрхээ баталгаажуулна.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 px-6 py-5">
            {stage === "verify" && (
              <form className="grid gap-4" onSubmit={verifyIdentity}>
                <div className="grid gap-2">
                  <Label htmlFor="recovery-email">И-мэйл</Label>
                  <Input
                    id="recovery-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="recovery-proof">Authenticator эсвэл recovery code</Label>
                  <Input
                    id="recovery-proof"
                    value={proof}
                    onChange={(event) => {
                      setProof(event.target.value);
                      setError("");
                    }}
                    autoComplete="one-time-code"
                    placeholder="000000 эсвэл ABCD-EFGH"
                    required
                  />
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Button type="submit" disabled={submitting}>
                  {submitting && <LoaderCircle className="animate-spin" size={16} />}
                  Баталгаажуулах
                </Button>
              </form>
            )}

            {stage === "reset" && (
              <form className="grid gap-4" onSubmit={resetPassword}>
                <div className="grid gap-2">
                  <Label htmlFor="recovery-password">Шинэ нууц үг</Label>
                  <Input
                    id="recovery-password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="recovery-confirm">Шинэ нууц үг давтах</Label>
                  <Input
                    id="recovery-confirm"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => {
                      setConfirmPassword(event.target.value);
                      setError("");
                    }}
                    autoComplete="new-password"
                    required
                  />
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Button type="submit" disabled={submitting}>
                  {submitting && <LoaderCircle className="animate-spin" size={16} />}
                  Нууц үг шинэчлэх
                </Button>
              </form>
            )}

            {stage === "done" && (
              <>
                <Alert className="border-success/30 bg-success/10">
                  <CheckCircle2 size={16} />
                  <AlertDescription>
                    Нууц үг амжилттай шинэчлэгдлээ. Шинэ нууц үгээрээ нэвтэрнэ үү.
                  </AlertDescription>
                </Alert>
                <Button
                  type="button"
                  onClick={() => {
                    onComplete(email.trim());
                    setOpen(false);
                    resetState();
                  }}
                >
                  Нэвтрэх хэсэг рүү буцах
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
