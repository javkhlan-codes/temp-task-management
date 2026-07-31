import type { ReactNode } from "react";

export function WorkspaceShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div
      className="grid min-h-screen grid-cols-[252px_minmax(0,1fr)] max-tablet:block"
      data-ui="app-shell"
    >
      {children}
    </div>
  );
}
