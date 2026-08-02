import { FolderKanban, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex min-h-[350px] flex-col items-center justify-center p-10 text-center">
      <div className="flex size-14 items-center justify-center rounded-[14px] bg-brand-subtle text-brand">
        <FolderKanban size={28} />
      </div>
      <h3 className="mt-3.5 mb-[5px] font-heading text-[15px] font-bold">
        Таск олдсонгүй
      </h3>
      <p className="mt-0 mb-[17px] text-[10px] text-muted-foreground">
        Шүүлтүүрээ өөрчлөх эсвэл энэ төсөлд шинэ таск нэмнэ үү.
      </p>
      <Button
        className="h-[38px] gap-[7px] rounded-lg bg-brand px-3.5 text-[10px] font-semibold text-brand-foreground hover:bg-brand-hover"
        onClick={onAdd}
      >
        <Plus size={17} />
        Шинэ таск
      </Button>
    </div>
  );
}
