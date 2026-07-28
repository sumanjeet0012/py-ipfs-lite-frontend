import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";

const POLL_MS = 10_000;

export function useConnectionStatus(): boolean {
  const [connected, setConnected] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    async function check() {
      try {
        await api.version();
        setConnected(true);
      } catch {
        setConnected(false);
      }
    }
    check();
    timer.current = setInterval(check, POLL_MS);
    return () => clearInterval(timer.current);
  }, []);

  return connected;
}
