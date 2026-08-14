import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Copy, Check } from "lucide-react";

interface PeerBadgeProps {
  peerId: string;
  showFull?: boolean;
}

function truncatePeerId(peerId: string): string {
  if (!peerId || typeof peerId !== "string") return String(peerId ?? "");
  if (peerId.length <= 24) return peerId;
  return `${peerId.slice(0, 12)}...${peerId.slice(-8)}`;
}

export function PeerBadge({ peerId, showFull = false }: PeerBadgeProps) {
  const [copied, setCopied] = useState(false);
  const [hovering, setHovering] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const safePeerId = typeof peerId === "string" ? peerId : String(peerId ?? "");
  const displayId = showFull ? safePeerId : truncatePeerId(safePeerId);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(safePeerId);
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleCopy();
    }
  };

  return (
    <Badge
      variant="secondary"
      className="group/peer cursor-pointer gap-1.5 font-mono"
      role="button"
      tabIndex={0}
      aria-label={`Copy peer ID ${displayId}`}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onClick={handleCopy}
      onKeyDown={handleKeyDown}
    >
      <span>{displayId}</span>
      {(hovering || copied) && (
        copied ? (
          <Check className="size-3 text-green-500" />
        ) : (
          <Copy className="size-3 text-muted-foreground" />
        )
      )}
    </Badge>
  );
}
