import { useState, useEffect } from "react";
import { api } from "@/lib/api";

const POLL_MS = 10_000;

export function useConnectionStatus(): boolean {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function check() {
      try {
        await api.version();
        if (isMounted) setConnected(true);
      } catch {
        if (isMounted) setConnected(false);
      }
    }
    check();
    const interval = setInterval(check, POLL_MS);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return connected;
}
