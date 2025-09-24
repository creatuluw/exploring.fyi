## Performance Test Plan: AI Loading & Streaming

### Budgets
- TTFCP (first visible skeleton or center node): ≤ 1s
- Outline visible (first batch of nodes/sections): ≤ 1.5s
- First paragraph content start (chunk received): ≤ 2s
- Max wait for any visible placeholder: ≤ 3s (fallback/cached data shown)

### Scenarios
1) Explore page, topic analysis (cold cache)
2) Explore page, topic analysis (warm cache)
3) Topic page, content streaming (cold cache)
4) Topic page, content streaming (warm cache)
5) Navigation cancel during generation (abort propagation)

### Signals to capture
- Server-Timing headers: `ai_ttfb`, `ai_outline_ms`, `ai_paragraph_ms_avg`
- SSE event timings: `metadata`, `outline`, `paragraph`, `paragraph_chunk`, `paragraph_complete`
- Paint markers / time to first DOM node in mind map

### Tooling
- Playwright for e2e timing; custom event listeners for SSE
- CI thresholds: fail if p95 exceeds budget in any scenario

### Example (pseudo-code excerpt)
```ts
import { test, expect } from '@playwright/test';

test('Explore streaming TTFCP and outline within budget', async ({ page }) => {
  const t0 = Date.now();
  await page.goto('/explore?topic=graph%20databases');

  // Wait for first contentful element (center node or skeleton)
  await page.waitForSelector('[data-test="mindmap-center"], [data-test="skeleton-mindmap"]', { timeout: 1500 });
  const ttfcp = Date.now() - t0;
  expect(ttfcp).toBeLessThanOrEqual(1000);

  // Wait for first outline batch rendered (>= 4 nodes)
  await page.waitForFunction(() => {
    const nodes = document.querySelectorAll('[data-test^="mindmap-node-"]');
    return nodes.length >= 4;
  }, { timeout: 1500 });
});
```

### Notes
- Warm cache runs should seed cache via API before measurements
- Record traces for slow failures to aid diagnosis


