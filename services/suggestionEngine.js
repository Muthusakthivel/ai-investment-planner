import { sipFutureValue } from './allocationEngine.js';

/**
 * Monthly SIP needed to reach future value FV at annualRate over years.
 * SIP = FV * r / ((1+r)^n - 1), r = annual/12, n = months
 */
export function calculateRequiredSIP(inflatedTarget, annualRate, years) {
  const fv = Math.max(0, Number(inflatedTarget) || 0);
  const y = Math.max(0, Number(years) || 0);
  const m = Math.round(y * 12);
  if (m <= 0 || fv <= 0) return 0;
  const ar = Number(annualRate);
  if (!Number.isFinite(ar) || ar < 0) return 0;
  const mr = ar / 12;
  if (mr === 0) return Math.ceil((fv / m) * 100) / 100;
  const denom = Math.pow(1 + mr, m) - 1;
  if (!Number.isFinite(denom) || denom <= 0) return 0;
  const sip = (fv * mr) / denom;
  return Number.isFinite(sip) ? Math.ceil(sip) : 0;
}

/** Minimum extra years (step 0.25) so current SIP reaches inflated target at given rate */
export function minYearsToReachTarget(monthlySip, inflatedTarget, annualRate, fromYears) {
  const sip = Math.max(0, Number(monthlySip) || 0);
  const target = Math.max(0, Number(inflatedTarget) || 0);
  if (target <= 0 || sip <= 0) return null;
  const start = Math.max(0.25, Number(fromYears) || 0);
  const ar = Number(annualRate) || 0.08;
  if (sipFutureValue(sip, ar, start) >= target) return 0;
  let low = start;
  let high = Math.max(start + 0.25, 50);
  if (sipFutureValue(sip, ar, high) < target) return null;
  for (let i = 0; i < 48; i++) {
    const mid = (low + high) / 2;
    if (sipFutureValue(sip, ar, mid) >= target) high = mid;
    else low = mid;
  }
  const extra = Math.max(0, high - start);
  return Math.round(extra * 4) / 4;
}

const RECOMMENDED_MIN_YEARS_EQUITY_HEAVY = 5;

/**
 * @param {object} goal - enriched goal from computeAllocation
 * @returns {{ type: string, message: string, delta?: number, years?: number }[]}
 */
export function buildSuggestionsForGoal(goal) {
  const suggestions = [];
  const sr = Number(goal.successRatio);
  if (!Number.isFinite(sr) || sr >= 1) return suggestions;

  const inflatedTarget = Number(goal.inflatedTarget) || 0;
  const years = Number(goal.horizonYears) || 0;
  const sip = Number(goal.monthlyInvestmentAllocated ?? goal.monthlyShare) || 0;
  const blend = Number(goal.blendedExpectedReturnAnnual) || 0.08;

  if (inflatedTarget > 0 && years > 0) {
    const required = calculateRequiredSIP(inflatedTarget, blend, years);
    if (required > sip) {
      const delta = Math.max(0, Math.ceil(required - sip));
      if (delta > 0) {
        suggestions.push({
          type: 'increase_sip',
          message: `Increase SIP by ₹${delta.toLocaleString('en-IN')}/mo to align with inflation-adjusted target.`,
          delta,
        });
      }
    }
  }

  const extendBy = minYearsToReachTarget(sip, inflatedTarget, blend, years);
  if (extendBy != null && extendBy > 0) {
    suggestions.push({
      type: 'extend_timeline',
      message: `Extend timeline by ~${extendBy} years to reach the target at current SIP.`,
      years: extendBy,
    });
  }

  if (years > 0 && years < RECOMMENDED_MIN_YEARS_EQUITY_HEAVY && goal.horizonClass === 'short') {
    suggestions.push({
      type: 'horizon_tip',
      message:
        'Longer horizons allow more growth assets; short goals rely more on debt for stability.',
    });
  }

  return suggestions;
}

export function buildAllSuggestions(goals) {
  if (!Array.isArray(goals)) return [];
  return goals.map((g) => ({
    goalName: g.goalName,
    suggestions: buildSuggestionsForGoal(g),
  }));
}
