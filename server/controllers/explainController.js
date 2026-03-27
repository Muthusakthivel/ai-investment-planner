import { explainAllocationsBatch } from '../ai/openaiService.js';

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 20;
const ipHits = new Map();

function rateLimit(ip) {
    const now = Date.now();
    let entry = ipHits.get(ip);
    if (!entry || now - entry.start > RATE_WINDOW_MS) {
        entry = { start: now, count: 0 };
        ipHits.set(ip, entry);
    }
    entry.count += 1;
    if (entry.count > RATE_MAX) {
        return false;
    }
    return true;
}

export const explainAllocations = async (req, res) => {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    if (!rateLimit(ip)) {
        return res.status(429).json({ error: 'Too many requests. Try again shortly.' });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        return res.status(503).json({
            error: 'AI explanations are not configured. Set GEMINI_API_KEY on the server.',
        });
    }

    const { age, riskAppetite, incomeStability, monthlyInvestment, lumpsumInvestment, goals } = req.body || {};
    if (!Array.isArray(goals) || goals.length === 0) {
        return res.status(400).json({ error: 'goals array required' });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);

    try {
        const items = goals.map((g) => ({
            age: Number(age),
            riskAppetite,
            incomeStability,
            monthlyInvestment: Number(monthlyInvestment) || 0,
            lumpsumInvestment: Number(lumpsumInvestment) || 0,
            goalName: g.goalName || g.name || 'Goal',
            horizonYears: Number(g.horizonYears),
            monthlyAllocation: g.monthlyAllocation || {},
            lumpsumAllocation: g.lumpsumAllocation || {},
            combinedAllocation: g.combinedAllocation || {},
            targetAmount: g.targetAmount,
            inflatedTarget: g.inflatedTarget,
            projectedValue: g.projectedValue,
            successRatio: g.successRatio,
            goalStatus: g.goalStatus,
            goalType: g.goalType,
            priority: g.priority,
            monthlySafeAllocationPercentage: g.monthlySafeAllocationPercentage,
            monthlyGrowthAllocationPercentage: g.monthlyGrowthAllocationPercentage,
            lumpsumSafeAllocationPercentage: g.lumpsumSafeAllocationPercentage,
            lumpsumGrowthAllocationPercentage: g.lumpsumGrowthAllocationPercentage,
            monthlyInvestmentAllocated: g.monthlyInvestmentAllocated,
            lumpsumInvestmentAllocated: g.lumpsumInvestmentAllocated,
            monthlyRupeeAllocation: g.monthlyRupeeAllocation,
            lumpsumRupeeAllocation: g.lumpsumRupeeAllocation,
            instrumentBreakdown: g.instrumentBreakdown,
        }));

        const explanations = await explainAllocationsBatch({
            apiKey,
            items,
            signal: controller.signal,
        });
        res.json({ explanations });
    } catch (e) {
        if (e.name === 'AbortError') {
            return res.status(503).json({ error: 'Explanation request timed out.' });
        }
        const status = e.status >= 400 && e.status < 600 ? e.status : 503;
        res.status(status).json({
            error: e.message || 'Failed to generate explanation',
        });
    } finally {
        clearTimeout(timeout);
    }
};
