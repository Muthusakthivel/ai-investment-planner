import { describe, it, expect } from 'vitest';
import {
  computeAllocation,
  computeRiskScore,
  profileFromScore,
  normalizeTo100,
} from './allocationEngine.js';
import { BUCKETS } from './allocationConfig.js';

function sumPct(w) {
  return BUCKETS.reduce((s, k) => s + w[k], 0);
}

describe('normalizeTo100', () => {
  it('sums to 100', () => {
    const w = normalizeTo100({ Equity: 10, MutualFunds: 20, Debt: 30, Bonds: 25, Gold: 15 });
    expect(sumPct(w)).toBeCloseTo(100, 1);
  });
});

describe('computeRiskScore', () => {
  it('young high risk stable scores high', () => {
    const s = computeRiskScore({
      age: 25,
      riskAppetite: 'High',
      incomeStability: 'Stable',
      goals: [{ name: 'x', targetAmount: 1, horizonYears: 10 }],
    });
    expect(s).toBeGreaterThanOrEqual(5);
  });

  it('applies short-term penalty once', () => {
    const withShort = computeRiskScore({
      age: 40,
      riskAppetite: 'Medium',
      incomeStability: 'Stable',
      goals: [{ name: 'a', targetAmount: 1, horizonYears: 1 }],
    });
    const noShort = computeRiskScore({
      age: 40,
      riskAppetite: 'Medium',
      incomeStability: 'Stable',
      goals: [{ name: 'a', targetAmount: 1, horizonYears: 5 }],
    });
    expect(withShort).toBe(noShort - 3);
  });
});

describe('profileFromScore', () => {
  it('maps thresholds', () => {
    expect(profileFromScore(6)).toBe('Aggressive');
    expect(profileFromScore(3)).toBe('Moderate');
    expect(profileFromScore(0)).toBe('Conservative');
  });
});

describe('computeAllocation', () => {
  it('empty goals returns default allocation and full monthly to buckets', () => {
    const r = computeAllocation({
      age: 30,
      monthlyIncome: 50000,
      monthlyInvestment: 10000,
      incomeStability: 'Stable',
      riskAppetite: 'Medium',
      goals: [],
    });
    expect(r.goals).toHaveLength(0);
    expect(r.hasGoals).toBe(false);
    expect(r.usesDefaultAllocation).toBe(true);
    expect(r.defaultPlan).toBeDefined();
    expect(r.defaultPlan.horizonYears).toBeGreaterThan(0);
    const sumRupee = BUCKETS.reduce((s, k) => s + r.portfolioSummary.rupeeByCategory[k], 0);
    expect(sumRupee).toBeCloseTo(10000, 0);
    expect(r.portfolioSummary.percentBlend.Equity).toBeGreaterThan(0);
  });

  it('each goal allocation sums to ~100%', () => {
    const r = computeAllocation({
      age: 35,
      monthlyIncome: 100000,
      monthlyInvestment: 50000,
      incomeStability: 'Stable',
      riskAppetite: 'Medium',
      goals: [
        { name: 'A', targetAmount: 100000, horizonYears: 2 },
        { name: 'B', targetAmount: 100000, horizonYears: 10 },
      ],
    });
    r.goals.forEach((g) => {
      expect(sumPct(g.allocationPercent)).toBeCloseTo(100, 0);
    });
  });

  it('short-term goal caps equity', () => {
    const r = computeAllocation({
      age: 28,
      monthlyIncome: 80000,
      monthlyInvestment: 20000,
      incomeStability: 'Stable',
      riskAppetite: 'High',
      goals: [{ name: 'Car', targetAmount: 500000, horizonYears: 2 }],
    });
    expect(r.goals[0].allocationPercent.Equity).toBeLessThanOrEqual(19.5);
  });

  it('conservative profile has bonds+debt >= 50% per goal', () => {
    const r = computeAllocation({
      age: 50,
      monthlyIncome: 50000,
      monthlyInvestment: 10000,
      incomeStability: 'Stable',
      riskAppetite: 'Low',
      goals: [{ name: 'Retire', targetAmount: 1e7, horizonYears: 15 }],
    });
    expect(r.profile).toBe('Conservative');
    r.goals.forEach((g) => {
      const bd = g.allocationPercent.Bonds + g.allocationPercent.Debt;
      expect(bd).toBeGreaterThanOrEqual(49.5);
    });
  });

  it('rupee totals match monthly investment', () => {
    const monthly = 25000;
    const r = computeAllocation({
      age: 32,
      monthlyIncome: 80000,
      monthlyInvestment: monthly,
      incomeStability: 'Stable',
      riskAppetite: 'Medium',
      goals: [
        { name: 'A', targetAmount: 300000, horizonYears: 5 },
        { name: 'B', targetAmount: 700000, horizonYears: 12 },
      ],
    });
    const totalRupee = BUCKETS.reduce((s, k) => s + r.portfolioSummary.rupeeByCategory[k], 0);
    expect(totalRupee).toBeCloseTo(monthly, 0);
  });

  it('returns riskIndicator', () => {
    const r = computeAllocation({
      age: 25,
      monthlyIncome: 100000,
      monthlyInvestment: 5000,
      incomeStability: 'Stable',
      riskAppetite: 'High',
      goals: [{ name: 'x', targetAmount: 1, horizonYears: 20 }],
    });
    expect(['Low', 'Medium', 'High']).toContain(r.riskIndicator);
  });

  it('enriches goals with inflation, success ratio, projections', () => {
    const r = computeAllocation({
      age: 35,
      monthlyIncome: 100000,
      monthlyInvestment: 10000,
      incomeStability: 'Stable',
      riskAppetite: 'Medium',
      goals: [{ name: 'Home', targetAmount: 500000, horizonYears: 10 }],
    });
    const g = r.goals[0];
    expect(g.inflatedTarget).toBeGreaterThan(500000);
    expect(g).toHaveProperty('successRatio');
    expect(g).toHaveProperty('goalStatus');
    expect(['On Track', 'Needs Improvement', 'High Risk']).toContain(g.goalStatus);
    expect(g.projections).toHaveProperty('expected');
    expect(Array.isArray(g.projections.expected)).toBe(true);
    expect(g.projections.expected.length).toBe(120);
    expect(r.portfolioMetrics).toHaveProperty('overallSuccessScore');
    expect(r.projections).toHaveLength(1);
  });

  it('empty goals includes portfolioMetrics and default projections', () => {
    const r = computeAllocation({
      age: 30,
      monthlyIncome: 50000,
      monthlyInvestment: 10000,
      incomeStability: 'Stable',
      riskAppetite: 'Medium',
      goals: [],
    });
    expect(r.portfolioMetrics.weightedExpectedReturnAnnual).toBeGreaterThan(0);
    expect(r.projections).toHaveLength(1);
  });

  it('short-term goal gets safe-first allocation and instrument breakdown', () => {
    const r = computeAllocation({
      age: 35,
      monthlyIncome: 100000,
      monthlyInvestment: 15000,
      incomeStability: 'Stable',
      riskAppetite: 'Medium',
      goals: [{ name: 'Emergency fund', targetAmount: 500000, horizonYears: 2 }],
    });
    const g = r.goals[0];
    expect(g.goalType).toBe('short_term');
    expect(g.safeAllocationPercentage).toBeGreaterThanOrEqual(70);
    expect(g.growthAllocationPercentage).toBeLessThanOrEqual(30);
    expect(g.instrumentBreakdown).toBeDefined();
    expect(g.instrumentBreakdown.rd).toBeGreaterThan(0);
    // FD is not part of monthly SIP instruments (treated as bond-like / lumpsum only)
    expect(g.instrumentBreakdown.fd).toBe(0);
    expect(g.instrumentAmountBreakdown).toBeDefined();
    expect(g.instrumentAmountBreakdown.rd).toBeGreaterThanOrEqual(0);
  });

  it('high-priority short-term goal caps equity at 10%', () => {
    const r = computeAllocation({
      age: 32,
      monthlyIncome: 80000,
      monthlyInvestment: 20000,
      incomeStability: 'Stable',
      riskAppetite: 'High',
      goals: [{ name: 'House down payment', targetAmount: 2000000, horizonYears: 3 }],
    });
    const g = r.goals[0];
    expect(g.priority).toBe('high');
    expect(g.goalType).toBe('short_term');
    expect(g.allocationPercent.Equity).toBeLessThanOrEqual(10.5);
  });

  it('monthly SIP allocation excludes bonds for all goals', () => {
    const r = computeAllocation({
      age: 34,
      monthlyIncome: 120000,
      monthlyInvestment: 30000,
      lumpsumInvestment: 500000,
      incomeStability: 'Stable',
      riskAppetite: 'Medium',
      goals: [
        { name: 'Car', targetAmount: 1000000, horizonYears: 2 },
        { name: 'Retirement', targetAmount: 20000000, horizonYears: 20 },
      ],
    });

    r.goals.forEach((g) => {
      expect(g.monthlyAllocationPercent.Bonds).toBeUndefined();
      const monthlySum =
        Number(g.monthlyAllocationPercent.Equity || 0) +
        Number(g.monthlyAllocationPercent.MutualFunds || 0) +
        Number(g.monthlyAllocationPercent.Debt || 0) +
        Number(g.monthlyAllocationPercent.Gold || 0);
      expect(monthlySum).toBeCloseTo(100, 0);
      expect(g.allocationPercent.Bonds).toBeCloseTo(0, 5);
    });
  });

  it('lumpsum allocation includes bonds when lumpsum amount is provided', () => {
    const r = computeAllocation({
      age: 40,
      monthlyIncome: 90000,
      monthlyInvestment: 10000,
      lumpsumInvestment: 300000,
      incomeStability: 'Stable',
      riskAppetite: 'High',
      goals: [{ name: 'House', targetAmount: 5000000, horizonYears: 6 }],
    });

    const g = r.goals[0];
    expect(g.lumpsumAllocationPercent.Bonds).toBeGreaterThan(0);
    expect(sumPct(g.lumpsumAllocationPercent)).toBeCloseTo(100, 0);
    expect(g.lumpsumRupeeAllocation.Bonds).toBeGreaterThan(0);
  });

  it('lumpsum zero keeps lumpsum rupee allocation at zero', () => {
    const r = computeAllocation({
      age: 30,
      monthlyIncome: 70000,
      monthlyInvestment: 12000,
      lumpsumInvestment: 0,
      incomeStability: 'Stable',
      riskAppetite: 'Low',
      goals: [{ name: 'Emergency', targetAmount: 300000, horizonYears: 2 }],
    });

    const g = r.goals[0];
    expect(g.lumpsumRupeeAllocation.Bonds).toBe(0);
    expect(g.lumpsumRupeeAllocation.Debt).toBe(0);
    expect(r.portfolioSummary.lumpsum.rupeeByCategory.Bonds).toBe(0);
  });
});
