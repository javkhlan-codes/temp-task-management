import type { ReactNode } from "react";

export function AuthLayout({
  showcase,
  children,
}: {
  showcase: ReactNode;
  children: ReactNode;
}) {
  return (
    <main
      className="grid min-h-screen grid-cols-[minmax(420px,0.92fr)_minmax(520px,1.08fr)] bg-surface max-auth:grid-cols-[minmax(320px,0.8fr)_minmax(440px,1.2fr)] max-mobile:block"
      data-ui="login-page"
    >
      {showcase}
      {children}
    </main>
  );
}
