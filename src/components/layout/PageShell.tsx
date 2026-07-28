import { Header } from "./Header";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";

interface PageShellProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function PageShell({ title, description, children }: PageShellProps) {
  const connected = useConnectionStatus();

  return (
    <div className="flex h-full flex-col">
      <Header title={title} connected={connected} />

      <main className="flex-1 overflow-y-auto p-6">
        {description && (
          <p className="mb-4 text-sm text-muted-foreground">{description}</p>
        )}
        {children}
      </main>
    </div>
  );
}
