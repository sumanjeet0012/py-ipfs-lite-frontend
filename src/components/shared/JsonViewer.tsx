import { cn } from "@/lib/utils";

interface JsonViewerProps {
  data: any;
}

function syntaxHighlight(json: string): React.ReactNode {
  if (!json) return null;
  let key = 0;

  const replaced = json.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      let colorClass = "text-cyan-400"; // numbers
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          colorClass = "text-blue-400"; // keys
        } else {
          colorClass = "text-green-400"; // strings
        }
      } else if (/true|false/.test(match)) {
        colorClass = "text-purple-400"; // booleans
      } else if (/null/.test(match)) {
        colorClass = "text-gray-400"; // null
      }
      return `<span class="${colorClass}">${match}</span>`;
    }
  );

  const parts2 = replaced.split(/(<span class="[^"]*">|<\/span>)/g);

  const stack: React.ReactNode[] = [];
  let currentClass = "";

  for (const part of parts2) {
    if (part.startsWith('<span class="')) {
      currentClass = part.match(/class="([^"]*)"/)?.[1] ?? "";
    } else if (part === "</span>") {
      currentClass = "";
    } else if (part) {
      stack.push(
        currentClass ? (
          <span key={key++} className={currentClass}>
            {part}
          </span>
        ) : (
          <span key={key++}>{part}</span>
        )
      );
    }
  }

  return stack;
}

export function JsonViewer({ data }: JsonViewerProps) {
  let formatted = "";
  try {
    if (data === undefined) {
      formatted = "undefined";
    } else if (typeof data === "string") {
      try {
        formatted = JSON.stringify(JSON.parse(data), null, 2);
      } catch {
        formatted = data;
      }
    } else {
      formatted = JSON.stringify(data, null, 2) ?? "";
    }
  } catch {
    formatted = String(data);
  }

  return (
    <pre
      className={cn(
        "bg-secondary rounded-lg p-4 overflow-auto text-sm font-mono"
      )}
    >
      <code>{syntaxHighlight(formatted)}</code>
    </pre>
  );
}
