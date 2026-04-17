"use client";

import { useEffect, useState } from "react";

import { formatMinutes } from "@/lib/format";

function calculateMinutes(startedAt: string) {
  const diffMs = Date.now() - new Date(startedAt).getTime();
  return Math.max(1, Math.round(diffMs / 60000));
}

export function LiveDuration({ startedAt }: { startedAt: string }) {
  const [minutes, setMinutes] = useState(() => calculateMinutes(startedAt));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setMinutes(calculateMinutes(startedAt));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [startedAt]);

  return <span>{formatMinutes(minutes)}</span>;
}
