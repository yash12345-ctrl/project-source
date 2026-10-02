import { monitorEventLoopDelay } from 'perf_hooks';

export function startEventLoopMonitor(thresholdMs: number = 100, logIntervalMs: number = 5000) {
  console.log(`[Performance] Event Loop Monitor started. Threshold: ${thresholdMs}ms`);
  
  const histogram = monitorEventLoopDelay({ resolution: 10 });
  histogram.enable();

  setInterval(() => {
    const maxDelayMs = histogram.max / 1e6;
    const meanDelayMs = histogram.mean / 1e6;

    if (maxDelayMs > thresholdMs) {
      console.warn(`[Performance] ⚠️ Event loop blocked! Max delay: ${maxDelayMs.toFixed(2)} ms (Mean: ${meanDelayMs.toFixed(2)} ms)`);
    }

    histogram.reset();
  }, logIntervalMs);
}
