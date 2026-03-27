/**
 * Costs & Safety: No API calls. Local analytics only.
 * Module reference: [Tool Selection & Optimization](https://aitutorial.dev/agents/tool-selection-and-optimization#advanced-optimization-techniques)
 * Why: Monitors tool usage patterns (calls, successes, failures, latency) and generates optimization recommendations.
 */

/**
 * Tracks tool call metrics and generates optimization recommendations.
 *
 * Wrap every tool call with callWithAnalytics() to collect:
 * - Call count, success/failure rates
 * - Average latency per tool
 * - Unused tool detection
 *
 * Call getRecommendations() to get actionable suggestions.
 */
export class ToolAnalytics {
    private stats: Record<string, {
        calls: number;
        successes: number;
        failures: number;
        avgLatencyMs: number;
    }> = {};

    async callWithAnalytics(toolName: string, fn: () => Promise<any>): Promise<any> {
        const start = Date.now();

        if (!this.stats[toolName]) {
            this.stats[toolName] = { calls: 0, successes: 0, failures: 0, avgLatencyMs: 0 };
        }
        const s = this.stats[toolName];

        try {
            const result = await fn();
            s.calls++;
            s.successes++;
            const latency = Date.now() - start;
            s.avgLatencyMs = ((s.avgLatencyMs * (s.calls - 1)) + latency) / s.calls;
            return result;
        } catch (e) {
            s.calls++;
            s.failures++;
            throw e;
        }
    }

    getRecommendations(registeredTools: string[]): string[] {
        const recs: string[] = [];

        for (const toolName of registeredTools) {
            const s = this.stats[toolName];

            if (!s || s.calls === 0) {
                recs.push(`Remove unused tool: ${toolName}`);
                continue;
            }

            const failRate = s.failures / s.calls;
            if (failRate > 0.3) {
                recs.push(`${toolName} fails ${(failRate * 100).toFixed(0)}% — review error handling or simplify params`);
            }

            if (s.avgLatencyMs > 2000) {
                recs.push(`${toolName} averages ${s.avgLatencyMs.toFixed(0)}ms — consider caching`);
            }
        }

        return recs;
    }

    printReport(): void {
        console.log('Tool Usage Report:');
        for (const [name, s] of Object.entries(this.stats)) {
            console.log(`  ${name}: ${s.calls} calls, ${s.successes} ok, ${s.failures} fail, ${s.avgLatencyMs.toFixed(0)}ms avg`);
        }
    }
}

// ============================================================
// Demo
// ============================================================

async function main(): Promise<void> {
    const analytics = new ToolAnalytics();

    // Simulate tool calls
    const mockTools: Record<string, () => Promise<string>> = {
        'search_products': async () => { await sleep(50); return 'found 3 products'; },
        'get_order': async () => { await sleep(100); return 'order details'; },
        'slow_tool': async () => { await sleep(3000); return 'slow result'; },
        'flaky_tool': async () => { if (Math.random() > 0.5) throw new Error('random fail'); return 'ok'; },
    };

    console.log('Simulating 20 tool calls...');
    console.log('');

    for (let i = 0; i < 20; i++) {
        const toolName = Object.keys(mockTools)[i % 4];
        try {
            await analytics.callWithAnalytics(toolName, mockTools[toolName]);
        } catch {
            // Expected failures from flaky_tool
        }
    }

    analytics.printReport();
    console.log('');

    const recs = analytics.getRecommendations([
        'search_products', 'get_order', 'slow_tool', 'flaky_tool', 'unused_tool'
    ]);
    console.log('Recommendations:');
    for (const r of recs) console.log(`  - ${r}`);
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

await main();
