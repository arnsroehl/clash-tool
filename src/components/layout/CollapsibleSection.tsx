import type { ReactNode } from "react";

type CollapsibleSectionProps = {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
};

export function CollapsibleSection({ title, children, defaultOpen = true }: CollapsibleSectionProps) {
  return (
    <details open={defaultOpen} className="rounded-3xl border border-white/10 bg-white/[0.02]">
      <summary className="cursor-pointer list-none px-6 py-4 text-xl font-bold text-amber-300">
        {title}
      </summary>
      <div className="border-t border-white/10 p-3 md:p-5">{children}</div>
    </details>
  );
}
