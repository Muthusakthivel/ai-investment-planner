import { computeAllocation } from '../../services/allocationEngine.js';
import { buildAllSuggestions } from '../../services/suggestionEngine.js';

export const createPlan = (req, res) => {
    try {
        const body = req.body || {};
        const result = computeAllocation({
            age: Number(body.age),
            monthlyIncome: Number(body.monthlyIncome),
            monthlyInvestment: Number(body.monthlyInvestment),
            lumpsumInvestment: Number(body.lumpsumInvestment),
            incomeStability: body.incomeStability,
            riskAppetite: body.riskAppetite,
            goals: Array.isArray(body.goals) ? body.goals : [],
        });
        if (result.hasGoals && result.goals?.length) {
            result.suggestions = buildAllSuggestions(result.goals);
        } else {
            result.suggestions = [];
        }
        res.json(result);
    } catch (e) {
        res.status(400).json({ error: e.message || 'Invalid input' });
    }
};
