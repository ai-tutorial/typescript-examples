/**
 * Costs & Safety: Uses LLM API. Multiple calls per demo.
 * Env: AI_PROVIDER (openai|gemini), OPENAI_API_KEY, OPENAI_MODEL, GOOGLE_GENERATIVE_AI_API_KEY, GEMINI_MODEL
 * Module reference: [Business Rules & Guardrails](https://aitutorial.dev/agents/business-rules-and-guardrails#full-example-insurance-claims-processing)
 * Why: Full end-to-end example combining deterministic validation, guardrails, and LLM generation for insurance claims.
 */

import 'dotenv/config';
import { createAgent, tool } from 'langchain';
import { MemorySaver } from '@langchain/langgraph';
import { z } from 'zod';
import { createModel } from './langchain_utils.js';

// ============================================================
// Insurance Claims Validation (deterministic rules)
// ============================================================

interface Claim {
    claimType: string;
    amount: number;
    dateOfIncident: string;
    description: string;
    policyNumber: string;
}

interface ClaimValidation {
    valid: boolean;
    violations: string[];
    warnings: string[];
    autoApproved: boolean;
    requiresReview: boolean;
    reason?: string;
}

/**
 * Validate insurance claim against policy rules.
 * These rules are enforced deterministically — not by the LLM.
 */
function validateClaim(claim: Claim): ClaimValidation {
    const violations: string[] = [];
    const warnings: string[] = [];

    // Rule 1: Filing deadline (30 days from incident)
    const incident = new Date(claim.dateOfIncident);
    const daysSince = Math.floor((Date.now() - incident.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince > 30) {
        violations.push(`Claim filed ${daysSince} days after incident (30-day limit)`);
    }

    // Rule 2: Coverage limits by type
    const limits: Record<string, number> = {
        'auto_collision': 50000,
        'auto_comprehensive': 25000,
        'home_damage': 100000,
        'medical': 500000,
        'liability': 1000000,
    };
    const limit = limits[claim.claimType];
    if (limit && claim.amount > limit) {
        violations.push(`Amount $${claim.amount} exceeds ${claim.claimType} limit of $${limit}`);
    }

    // Rule 3: Auto-approval for small claims
    const autoApproved = claim.amount < 500 && violations.length === 0;
    if (autoApproved) {
        warnings.push('Auto-approved: amount under $500 with no violations');
    }

    // Rule 4: Review required for large claims
    const requiresReview = claim.amount > 10000;
    if (requiresReview) {
        warnings.push('Requires adjuster review: amount over $10,000');
    }

    // Rule 5: Valid policy number format
    if (!/^POL-\d{6}$/.test(claim.policyNumber)) {
        violations.push(`Invalid policy number format: ${claim.policyNumber} (expected POL-XXXXXX)`);
    }

    return {
        valid: violations.length === 0,
        violations,
        warnings,
        autoApproved,
        requiresReview,
        reason: violations.length > 0 ? violations.join('; ') : undefined,
    };
}

// ============================================================
// Agent with Claims Tools
// ============================================================

async function main(): Promise<void> {
    const model = await createModel();

    const validateClaimTool = tool(
        async (args: { claimType: string; amount: number; dateOfIncident: string; description: string; policyNumber: string }) => {
            console.log(`  [Validating claim] ${args.claimType}: $${args.amount}`);
            const result = validateClaim(args);
            return JSON.stringify(result, null, 2);
        },
        {
            name: 'validate_insurance_claim',
            description: `Validate an insurance claim against policy rules. Always call this before processing any claim. Returns approval status, violations, and whether adjuster review is needed.`,
            schema: z.object({
                claimType: z.enum(['auto_collision', 'auto_comprehensive', 'home_damage', 'medical', 'liability']).describe('Type of claim'),
                amount: z.number().describe('Claim amount in dollars'),
                dateOfIncident: z.string().describe('Date of incident (YYYY-MM-DD)'),
                description: z.string().describe('Description of the incident'),
                policyNumber: z.string().describe('Policy number (format: POL-XXXXXX)'),
            }),
        }
    );

    const lookupPolicyTool = tool(
        async ({ policyNumber }: { policyNumber: string }) => {
            const policies: Record<string, any> = {
                'POL-123456': { holder: 'Alice Johnson', type: 'auto', status: 'active', deductible: 500 },
                'POL-789012': { holder: 'Bob Smith', type: 'home', status: 'active', deductible: 1000 },
            };
            const policy = policies[policyNumber];
            return policy ? JSON.stringify(policy) : JSON.stringify({ error: 'Policy not found' });
        },
        {
            name: 'lookup_policy',
            description: 'Look up policy details by policy number.',
            schema: z.object({ policyNumber: z.string().describe('Policy number') }),
        }
    );

    const agent = createAgent({
        model,
        tools: [validateClaimTool, lookupPolicyTool],
        checkpointer: new MemorySaver(),
        systemPrompt: `You are an insurance claims processor. For every claim:
1. Look up the policy to verify it's active
2. Validate the claim using validate_insurance_claim
3. Report the result clearly: approved, denied (with reasons), or needs review
Be concise and factual.`,
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

    console.log('=== Insurance Claims Processing ===');
    console.log('');

    // Small claim — auto-approved
    await ask('Auto collision claim. Policy POL-123456. Incident date: 2026-03-26. Damage: $350. Minor fender bender in parking lot.');

    // Over limit — denied
    await ask('Home damage claim. Policy POL-789012. Incident date: 2026-03-20. Amount: $150,000. Storm damaged roof and siding.');

    // Late filing — denied
    await ask('Auto collision claim. Policy POL-123456. Incident date: 2026-02-01. Amount: $5,000. Rear-ended at intersection.');
}

await main();
