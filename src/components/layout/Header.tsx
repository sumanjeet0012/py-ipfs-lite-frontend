interface HeaderProps {
  title: string;
  connected?: boolean;
}

export function Header({ title, connected = true }: HeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-6">
      <h1 className="text-lg font-semibold">{title}</h1>

      <div className="flex items-center gap-2 text-sm">
        <span
          className={`h-2 w-2 rounded-full ${
            connected ? "bg-green-500" : "bg-red-500"
          }`}
        />
        <span className="text-muted-foreground">
          {connected ? "Connected" : "Disconnected"}
        </span>
      </div>
    </header>
  );
}
