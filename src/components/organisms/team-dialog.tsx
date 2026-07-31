"use client";

import { Check, Plus, ShieldCheck, UserX, X } from "lucide-react";
import { useMemo, useState } from "react";
import { UserAvatar } from "@/components/atoms/user-avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  hasPermission,
} from "@/lib/permissions";
import {
  USER_ROLES,
  type UserRole,
  type WorkspaceUser,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const roleClasses: Record<UserRole, string> = {
  admin: "bg-brand-subtle text-brand",
  manager: "bg-info/10 text-info",
  member: "bg-success/10 text-success",
  guest: "bg-warning/15 text-warning",
  viewer: "bg-muted text-muted-foreground",
};

const inputClass =
  "h-[39px] rounded-[9px] border-input bg-surface px-3 text-[10px] data-[size=default]:h-[39px]";

export function TeamDialog({
  currentUser,
  users,
  onClose,
  onSave,
  onDeactivate,
}: {
  currentUser: WorkspaceUser;
  users: WorkspaceUser[];
  onClose: () => void;
  onSave: (user: WorkspaceUser, isNew: boolean) => void;
  onDeactivate: (user: WorkspaceUser) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("member");
  const [deactivateTarget, setDeactivateTarget] =
    useState<WorkspaceUser | null>(null);
  const canManage = hasPermission(currentUser, "manageUsers");
  const activeUsers = useMemo(
    () => users.filter((user) => user.id !== "unassigned"),
    [users],
  );

  const addUser = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !email.trim()) return;
    const initials = name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
    onSave(
      {
        id: crypto.randomUUID(),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        initials: initials || "U",
        tone: ["violet", "cyan", "amber", "rose"][
          activeUsers.length % 4
        ],
        role,
        active: true,
      },
      true,
    );
    setName("");
    setEmail("");
    setRole("member");
    setAdding(false);
  };

  return (
    <>
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <DialogContent
          className="max-h-[calc(100vh-40px)] w-[min(760px,calc(100vw-24px))] max-w-none gap-0 overflow-hidden rounded-2xl bg-surface-raised p-0 shadow-[var(--shadow-lg)] ring-1 ring-border sm:max-w-none"
        >
          <DialogHeader className="gap-0 border-b border-border px-[23px] py-5 pr-14">
            <DialogDescription className="mb-[3px] text-[8px] leading-[normal] font-bold tracking-[0.8px] text-brand uppercase">
              Workspace хандалт
            </DialogDescription>
            <DialogTitle className="font-heading text-lg leading-[normal] font-bold tracking-[-0.4px]">
              Баг ба эрх
            </DialogTitle>
          </DialogHeader>

          <div className="min-h-0">
            <section className="grid grid-cols-4 gap-2.5 border-b border-border bg-surface-soft px-5 py-[15px] max-tablet:grid-cols-3 max-mobile:grid-cols-2">
              {USER_ROLES.map((item) => (
                <div
                  className="min-w-0"
                  key={item}
                >
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-[7px] py-1 text-[8px] leading-[normal] font-bold",
                      roleClasses[item],
                    )}
                  >
                    <ShieldCheck size={12} />
                    {ROLE_LABELS[item]}
                  </span>
                  <p className="mt-1.5 mb-0 text-[7.5px] leading-[1.4] text-muted-foreground">
                    {ROLE_DESCRIPTIONS[item]}
                  </p>
                </div>
              ))}
            </section>

            <div className="flex items-center justify-between px-5 pt-4 pb-[9px]">
              <span className="text-[10px] font-bold text-[var(--text-soft)]">
                {activeUsers.length} workspace гишүүн
              </span>
              {canManage && (
                <Button
                  variant="outline"
                  className="h-8 text-[9px]"
                  onClick={() => setAdding(true)}
                >
                  <Plus size={15} />
                  Гишүүн нэмэх
                </Button>
              )}
            </div>

            {adding && (
              <form
                className="mx-5 mt-1 mb-2.5 grid grid-cols-[1fr_1.35fr_0.8fr_auto] items-end gap-[9px] rounded-[10px] border border-[color-mix(in_srgb,var(--brand)_18%,var(--border))] bg-brand-subtle p-3 max-tablet:grid-cols-2 max-mobile:grid-cols-1"
                onSubmit={addUser}
              >
                <div className="grid gap-1.5">
                  <Label className="text-[9px]" htmlFor="member-name">
                    Нэр
                  </Label>
                  <Input
                    id="member-name"
                    className={inputClass}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Овог нэр"
                    autoFocus
                    required
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-[9px]" htmlFor="member-email">
                    И-мэйл
                  </Label>
                  <Input
                    id="member-email"
                    className={inputClass}
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@company.com"
                    required
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-[9px]">Эрх</Label>
                  <Select
                    value={role}
                    onValueChange={(value) => setRole(value as UserRole)}
                  >
                    <SelectTrigger className={cn(inputClass, "w-full")}>
                      <SelectValue>{ROLE_LABELS[role]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {USER_ROLES.map((item) => (
                        <SelectItem value={item} key={item}>
                          {ROLE_LABELS[item]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setAdding(false)}
                    aria-label="Нэмэх форм хаах"
                  >
                    <X size={17} />
                  </Button>
                  <Button
                    type="submit"
                    className="h-8 bg-brand text-[9px] text-brand-foreground hover:bg-brand-hover"
                  >
                    <Check size={15} />
                    Нэмэх
                  </Button>
                </div>
              </form>
            )}

            <div className="max-h-[330px] overflow-y-auto px-5 pt-1 pb-5">
              {activeUsers.map((user) => (
                <div
                  className={cn(
                    "grid min-h-[61px] grid-cols-[36px_minmax(150px,1fr)_120px_30px] items-center gap-2.5 border-b border-border max-mobile:grid-cols-[34px_minmax(110px,1fr)_95px_28px]",
                    !user.active && "opacity-50",
                  )}
                  key={user.id}
                >
                  <UserAvatar user={user} size="lg" />
                  <div className="min-w-0">
                    <strong className="flex items-center gap-1.5 text-[10px]">
                      {user.name}
                      {user.id === currentUser.id && (
                        <small className="rounded-full bg-brand-subtle px-1.5 py-0.5 text-[7px] text-brand">
                          Та
                        </small>
                      )}
                    </strong>
                    <span className="mt-0.5 block truncate text-[8px] text-muted-foreground">
                      {user.email}
                    </span>
                  </div>
                  <Select
                    value={user.role}
                    disabled={!canManage || user.id === currentUser.id}
                    onValueChange={(value) =>
                      onSave({ ...user, role: value as UserRole }, false)
                    }
                  >
                    <SelectTrigger className="w-full text-[9px] data-[size=default]:h-[31px] max-mobile:hidden">
                      <SelectValue>{ROLE_LABELS[user.role]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {USER_ROLES.map((item) => (
                        <SelectItem value={item} key={item}>
                          {ROLE_LABELS[item]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {canManage &&
                    user.id !== currentUser.id &&
                    user.active && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-danger"
                        onClick={() => setDeactivateTarget(user)}
                        aria-label={`${user.name}-г идэвхгүй болгох`}
                      >
                        <UserX size={16} />
                      </Button>
                    )}
                </div>
              ))}
            </div>

            {!canManage && (
              <div className="border-t border-border bg-surface-soft px-5 py-3 text-[9px] leading-[normal] text-muted-foreground">
                Таны {ROLE_LABELS[currentUser.role]} эрх багийг харах боломжтой
                боловч хандалтыг өөрчлөх боломжгүй.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deactivateTarget)}
        onOpenChange={(open) => {
          if (!open) setDeactivateTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Гишүүнийг идэвхгүй болгох уу?</AlertDialogTitle>
            <AlertDialogDescription>
              {deactivateTarget?.name} workspace-д хандах боломжгүй болно.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Цуцлах</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deactivateTarget) onDeactivate(deactivateTarget);
                setDeactivateTarget(null);
              }}
            >
              Идэвхгүй болгох
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
