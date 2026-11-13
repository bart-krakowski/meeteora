import type { ReactNode } from "react";

/**
 * The top of a dashboard page: its title, one line on what it holds, and
 * page-level actions on the right (stacked below on narrow screens).
 */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="font-heading text-xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}

/** Standard padding and spacing for a dashboard page's content. */
export function PageBody({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-6 p-4 lg:p-6">{children}</div>;
}
