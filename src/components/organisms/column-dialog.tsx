"use client";

import { Check, Trash2 } from "lucide-react";
import { useState } from "react";
import { ColumnTypeIcon } from "@/features/task-manager/components/custom-cell";
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
  CUSTOM_COLUMN_TYPES,
  type CustomColumn,
  type CustomColumnType,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const typeLabels: Record<CustomColumnType, string> = {
  text: "Текст",
  number: "Тоо",
  date: "Огноо",
  status: "Төлөв",
  person: "Хүн",
  dropdown: "Сонголт",
  checkbox: "Чекбокс",
  progress: "Гүйцэтгэл",
  tags: "Таг",
};

export function ColumnDialog({
  column,
  onClose,
  onSave,
  onDelete,
}: {
  column: CustomColumn | null;
  onClose: () => void;
  onSave: (
    draft: Pick<CustomColumn, "name" | "type" | "options">,
    id?: string,
  ) => void;
  onDelete?: (column: CustomColumn) => void;
}) {
  const [name, setName] = useState(column?.name ?? "");
  const [type, setType] = useState<CustomColumnType>(column?.type ?? "text");
  const [options, setOptions] = useState(column?.options.join(", ") ?? "");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const usesOptions = type === "dropdown" || type === "status";

  return (
    <>
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <DialogContent
          className="w-[min(530px,calc(100vw-24px))] max-w-none gap-0 overflow-hidden rounded-2xl bg-surface-raised p-0 shadow-[var(--shadow-lg)] ring-1 ring-border sm:max-w-none"
        >
          <DialogHeader className="gap-1 border-b border-border px-[23px] py-[15px] pr-14">
            <DialogDescription className="text-[9px] font-bold tracking-[0.9px] text-brand uppercase">
              {column ? "Багана тохируулах" : "Нэмэлт талбар"}
            </DialogDescription>
            <DialogTitle className="font-heading text-xl font-bold tracking-[-0.45px]">
              {column ? "Багана засах" : "Багана нэмэх"}
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!name.trim()) return;
              onSave(
                {
                  name: name.trim(),
                  type,
                  options: usesOptions
                    ? options
                        .split(",")
                        .map((option) => option.trim())
                        .filter(Boolean)
                    : [],
                },
                column?.id,
              );
            }}
          >
            <div className="grid gap-[18px] px-6 py-5">
              <div className="grid gap-[7px]">
                <Label className="text-[10px]" htmlFor="column-name">
                  Баганын нэр
                </Label>
                <Input
                  id="column-name"
                  className="h-10 rounded-[9px] bg-surface-soft px-3 text-[11px]"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Жишээ: Хүчин чармайлт, Харилцагч, Sprint"
                  autoFocus
                  required
                />
              </div>
              <div className="grid gap-[7px]">
                <Label className="text-[10px]">Баганын төрөл</Label>
                <div className="grid grid-cols-3 gap-2 max-mobile:grid-cols-2">
                  {CUSTOM_COLUMN_TYPES.map((columnType) => (
                    <button
                      type="button"
                      className={cn(
                        "grid h-11 grid-cols-[18px_1fr_14px] items-center gap-1.5 rounded-[9px] border border-border bg-surface-soft px-2.5 text-left text-[9px] text-[var(--text-soft)] hover:bg-surface-hover",
                        type === columnType &&
                          "border-[color-mix(in_srgb,var(--brand)_38%,var(--border))] bg-brand-subtle text-brand",
                      )}
                      onClick={() => {
                        setType(columnType);
                        if (columnType === "status" && !options.trim()) {
                          setOptions(
                            "Not started, Working on it, In review, Done",
                          );
                        }
                      }}
                      aria-pressed={type === columnType}
                      key={columnType}
                    >
                      <ColumnTypeIcon type={columnType} />
                      {typeLabels[columnType]}
                      {type === columnType && <Check size={13} />}
                    </button>
                  ))}
                </div>
              </div>
              {usesOptions && (
                <div className="grid gap-[7px]">
                  <Label className="text-[10px]" htmlFor="column-options">
                    Сонголтууд
                  </Label>
                  <Input
                    id="column-options"
                    className="h-10 rounded-[9px] bg-surface-soft px-3 text-[11px]"
                    value={options}
                    onChange={(event) => setOptions(event.target.value)}
                    placeholder="Сонголт нэг, Сонголт хоёр, Сонголт гурав"
                  />
                  <small className="text-[8px] text-muted-foreground">
                    Сонголтуудыг таслалаар тусгаарлана. Дараа нь засах
                    боломжтой.
                  </small>
                </div>
              )}
              {column && column.type !== type && (
                <div className="rounded-[9px] border border-warning/25 bg-warning/10 p-3 text-[9px] text-warning">
                  Одоогийн утгууд хадгалагдах боловч шинэ төрлөөр өөр харагдаж
                  болно.
                </div>
              )}
            </div>
            <footer className="flex items-center justify-between gap-3 border-t border-border bg-surface-soft px-6 py-4">
              {column && onDelete ? (
                <Button
                  type="button"
                  variant="destructive"
                  className="h-9 text-[10px]"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 size={16} />
                  Багана устгах
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 px-4 text-[10px]"
                  onClick={onClose}
                >
                  Цуцлах
                </Button>
                <Button
                  type="submit"
                  className="h-9 bg-brand px-4 text-[10px] text-brand-foreground hover:bg-brand-hover"
                >
                  {column ? "Багана хадгалах" : "Багана нэмэх"}
                </Button>
              </div>
            </footer>
          </form>
        </DialogContent>
      </Dialog>

      {column && onDelete && (
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Баганыг устгах уу?</AlertDialogTitle>
              <AlertDialogDescription>
                “{column.name}” баганын одоогийн утгууд харагдахгүй болно.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Цуцлах</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => onDelete(column)}
              >
                Устгах
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
