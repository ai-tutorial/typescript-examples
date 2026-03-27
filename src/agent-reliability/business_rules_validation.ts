/**
 * Costs & Safety: Uses LLM API. Multiple calls per demo.
 * Env: AI_PROVIDER (openai|gemini), OPENAI_API_KEY, OPENAI_MODEL, GOOGLE_GENERATIVE_AI_API_KEY, GEMINI_MODEL
 * Module reference: [Business Rules & Guardrails](https://aitutorial.dev/agent-reliability-and-optimization/business-rules-and-guardrails)
 * Why: Business rules in prompts are enforced ~85% of the time. Deterministic validation tools enforce them 100%.
 */

import 'dotenv/config';
import { createAgent, tool } from 'langchain';
import { MemorySaver } from '@langchain/langgraph';
import { z } from 'zod';
import { createModel } from '../agents/langchain_utils.js';

// ============================================================
// Pattern 1: Validation Tool (deterministic rule enforcement)
// ============================================================

/**
 * Expense report validation — rules enforced in code, not prompts.
 *
 * Why not prompts? LLMs enforce rules ~85% of the time.
 * A validation tool enforces them 100%.
 */
interface ExpenseItem {
    category: string;
    amount: number;
    description: string;
    receipt: boolean;
}

interface ValidationResult {
    approved: boolean;
    violations: string[];
    warnings: string[];
    requiresApproval: boolean;
    approver?: string;
}

function validateExpense(expense: ExpenseItem): ValidationResult {
    const violations: string[] = [];
    const warnings: string[] = [];

    // Rule 1: Category limits (deterministic, not LLM judgment)
    const limits: Record<string, number> = { meals: 75, transport: 200, lodging: 300, supplies: 150 };
    const limit = limits[expense.category];
    if (limit && expense.amount > limit) {
        violations.push(`${expense.category} exceeds $${limit} limit (submitted: $${expense.amount})`);
    }

    // Rule 2: Receipt required over $25
    if (expense.amount > 25 && !expense.receipt) {
        violations.push(`Receipt required for expenses over $25`);
    }

    // Rule 3: Director approval over $500
    const requiresApproval = expense.amount > 500;
    if (requiresApproval) {
        warnings.push(`Requires director approval (amount > $500)`);
    }

    return {
        approved: violations.length === 0,
        violations,
        warnings,
        requiresApproval,
        approver: requiresApproval ? 'director' : undefined,
    };
}

// ============================================================
// Pattern 2: Pre/Post Execution Guardrails
// ============================================================

/**
 * Pre-execution: validate BEFORE the tool runs.
 * Post-execution: validate the result AFTER.
 */
function preValidateRefund(amount: number, orderAge: number): { allowed: boolean; reason?: string } {
    if (amount > 1000) return { allowed: false, reason: 'Refunds over $1000 require manager approval' };
    if (orderAge > 90) return { allowed: false, reason: 'Order is older than 90 days — refund period expired' };
    return { allowed: true };
}

function postValidateResponse(response: string): { safe: boolean; issues: string[] } {
    const issues: string[] = [];
    // Check for accidental data exposure
    if (/\b\d{3}-\d{2}-\d{4}\b/.test(response)) issues.push('SSN pattern detected in response');
    if (/\b\d{16}\b/.test(response)) issues.push('Credit card number detected in response');
    if (/sk-[a-zA-Z0-9]{20,}/.test(response)) issues.push('API key detected in response');
    return { safe: issues.length === 0, issues };
}

// ============================================================
// Demo
// ============================================================

async function main(): Promise<void> {
    const model = await createModel();

    // Create validation tool that the agent can call
    const validateExpenseTool = tool(
        async ({ category, amount, description, receipt }: { category: string; amount: number; description: string; receipt: boolean }) => {
            console.log(`  [Validating] ${category}: $${amount}`);
            const result = validateExpense({ category, amount, description, receipt });
            return JSON.stringify(result, null, 2);
        },
        {
            name: 'validate_expense',
            description: `Validate an expense report item against company policy. Returns approval status, violations, and warnings. Always call this before approving any expense.`,
            schema: z.object({
                category: z.enum(['meals', 'transport', 'lodging', 'supplies']).describe('Expense category'),
                amount: z.number().describe('Amount in dollars'),
                description: z.string().describe('What the expense is for'),
                receipt: z.boolean().describe('Whether a receipt is attached'),
            }),
        }
    );

    const agent = createAgent({
        model,
        tools: [validateExpenseTool],
        checkpointer: new MemorySaver(),
        systemPrompt: `You are an expense report processor. Always validate expenses using the validate_expense tool before making any decision. Report violations clearly. Be concise.`,
    });

    const ask = async (query: string) => {
        console.log(`User: ${query}`);
        const result = await agent.invoke(
            { messages: [{ role: 'user', content: query }] },
            { configurable: { thread_id: `demo-${Date.now()}` } }
        );
        console.log(`Agent: ${result.messages[result.messages.length - 1].text}`);
        console.log('');
    };

    console.log('=== Expense Validation Demo ===');
    console.log('');

    // Valid expense
    await ask('I had a $45 team lunch with receipt.');

    // Violation: over limit
    await ask('Client dinner, $120, meals category, receipt attached.');

    // Violation: no receipt
    await ask('$50 taxi, no receipt.');

    // Pre/post guardrails demo
    console.log('=== Pre/Post Guardrails Demo ===');
    console.log('');

    const preCheck = preValidateRefund(500, 30);
    console.log(`Pre-validate refund $500, 30 days old: ${JSON.stringify(preCheck)}`);

    const preCheck2 = preValidateRefund(2000, 30);
    console.log(`Pre-validate refund $2000, 30 days old: ${JSON.stringify(preCheck2)}`);

    const postCheck = postValidateResponse('Your SSN is 123-45-6789');
    console.log(`Post-validate response with SSN: ${JSON.stringify(postCheck)}`);

    const postCheck2 = postValidateResponse('Your refund has been processed.');
    console.log(`Post-validate clean response: ${JSON.stringify(postCheck2)}`);
}

await main();
