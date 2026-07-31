export function perfStart(): number {
  return typeof performance === "undefined" ? Date.now() : performance.now();
}

export function logDevelopmentTiming(label: string, startedAt: number): void {
  if (process.env.NODE_ENV !== "development") return;
  const finishedAt =
    typeof performance === "undefined" ? Date.now() : performance.now();
  console.info(`[perf] ${label} ${Math.round(finishedAt - startedAt)}ms`);
}
