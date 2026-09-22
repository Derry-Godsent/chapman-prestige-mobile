import { useEffect, useState } from "react";

/**
 * A clock that ticks, so labels like "4 min ago" stay honest while a screen is
 * left open instead of freezing at the moment the screen loaded.
 */
export function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}
