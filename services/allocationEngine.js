import {
  BUCKETS,
  MONTHLY_BUCKETS,
  LUMPSUM_BUCKETS,
  allocationConfig as cfg,
} from './allocationConfig.js';

function cloneBuckets(obj) {
  return Object.fromEntries(BUCKETS.map((k) => [k, Number(obj[k]) || 0]));
}

function cloneForBuckets(keys, obj) {
  return Object.fromEntries(keys.map((k) => [k, Number(obj?.[k]) || 0]));
}

function zerosForBuckets(keys) {
  return Object.fromEntries(keys.map((k) => [k, 0]));
}

function sumBuckets(w) {
  return BUCKETS.reduce((s, k) => s + (w[k] || 0), 0);
}

function sumForBuckets(keys, w) {
  return keys.reduce((s, k) => s + (Number(w?.[k]) || 0), 0);
}

/**
 * Normalize weights to sum 100; non-negative.
 */
export function normalizeTo100(w) {
  const out = cloneBuckets(w);
  BUCKETS.forEach((k) => {
    out[k] = Math.max(0, out[k]);
  });
  let sum = sumBuckets(out);
  if (sum <= 0) {
    const even = 100 / BUCKETS.length;
    BUCKETS.forEach((k) => {
      out[k] = even;
    });
    return out;
  }
  BUCKETS.forEach((k) => {
    out[k] = (out[k] / sum) * 100;
  });
  return out;
}

function normalizeTo100ForBuckets(keys, weights) {
  const out = cloneForBuckets(keys, weights);
  keys.forEach((k) => {
    out[k] = Math.max(0, out[k]);
  });
  let sum = sumForBuckets(keys, out);
  if (sum <= 0) {
    const even = 100 / keys.length;
    keys.forEach((k) => {
      out[k] = even;
    });
    return out;
  }
  keys.forEach((k) => {
    out[k] = (out[k] / sum) * 100;
  });
  return out;
}

function normalizeMonthlyTo100(w) {
  return normalizeTo100ForBuckets(MONTHLY_BUCKETS, w);
}

function normalizeLumpsumTo100(w) {
  return normalizeTo100ForBuckets(LUMPSUM_BUCKETS, w);
}

function fullBucketsFromMonthly(monthlyWeights) {
  const out = cloneBuckets({});
  out.Equity = Number(monthlyWeights?.Equity) || 0;
  out.MutualFunds = Number(monthlyWeights?.MutualFunds) || 0;
  out.Debt = Number(monthlyWeights?.Debt) || 0;
  out.Gold = Number(monthlyWeights?.Gold) || 0;
  out.Bonds = 0;
  return normalizeTo100(out);
}

function monthlyFromFullBuckets(fullWeights) {
  const out = {
    Equity: Number(fullWeights?.Equity) || 0,
    MutualFunds: Number(fullWeights?.MutualFunds) || 0,
    Debt: (Number(fullWeights?.Debt) || 0) + (Number(fullWeights?.Bonds) || 0),
    Gold: Number(fullWeights?.Gold) || 0,
  };
  return normalizeMonthlyTo100(out);
}

function horizonClass(years) {
  if (years < cfg.horizon.shortMaxExclusive) return 'short';
  if (years <= cfg.horizon.midMaxInclusive) return 'mid';
  return 'long';
}

const INSTRUMENT_KEYS = ['rd', 'fd', 'bonds', 'debt', 'equity', 'mutualFunds'];

/** goalType: 'short_term' when years <= shortTermYearsForSafeFirst, else follows horizon. priority: 'high' if name matches critical keywords */
function classifyGoal(goal) {
  const years = Number(goal.horizonYears) || 0;
  const name = (goal.name || goal.goalName || '').toLowerCase();
  const goalType = years <= cfg.shortTermYearsForSafeFirst ? 'short_term' : 'standard';
  const keywords = cfg.criticalGoalKeywords || [];
  const priority = keywords.some((kw) => name.includes(kw.toLowerCase())) ? 'high' : 'normal';
  return { goalType, priority };
}

/** Build short-term safe-first monthly allocation (Bonds excluded for SIP). */
function computeShortTermSafeFirstAllocation(profile, isHighPriority) {
  const { safe, growth } = cfg.safeFirstByProfile[profile] || cfg.safeFirstByProfile.Moderate;
  const safeShare = cfg.monthlySafeBucketInstrumentShare || { rd: 45, fd: 25, debt: 30 };
  const growthShare = cfg.growthBucketInstrumentShare || { equity: 70, mutualFunds: 30 };
  const capEquity = cfg.highPriorityEquityCapTotal ?? 10;

  let safePct = safe;
  let growthPct = growth;
  let rd = (safePct * (safeShare.rd || 0)) / 100;
  let fd = (safePct * (safeShare.fd || 0)) / 100;
  let debt = (safePct * (safeShare.debt || 0)) / 100;
  let equity = (growthPct * (growthShare.equity || 0)) / 100;
  let mutualFunds = (growthPct * (growthShare.mutualFunds || 0)) / 100;

  if (isHighPriority && equity > capEquity) {
    const excess = equity - capEquity;
    equity = capEquity;
    debt += excess;
    safePct += excess;
    growthPct -= excess;
  }

  const instrumentBreakdown = {
    rd: Math.round(rd * 100) / 100,
    fd: Math.round(fd * 100) / 100,
    bonds: 0,
    debt: Math.round(debt * 100) / 100,
    equity: Math.round(equity * 100) / 100,
    mutualFunds: Math.round(mutualFunds * 100) / 100,
  };
  const sumInst = INSTRUMENT_KEYS.reduce((s, k) => s + instrumentBreakdown[k], 0);
  if (Math.abs(sumInst - 100) > 0.01) {
    instrumentBreakdown.debt = Math.round((100 - (sumInst - instrumentBreakdown.debt)) * 100) / 100;
  }

  const allocationPercent = {
    Equity: equity,
    MutualFunds: mutualFunds,
    Debt: rd + fd + debt,
    Gold: 0,
  };
  return {
    allocationPercent: normalizeMonthlyTo100(allocationPercent),
    safeAllocationPercentage: Math.round(safePct * 100) / 100,
    growthAllocationPercentage: Math.round(growthPct * 100) / 100,
    instrumentBreakdown,
  };
}

/** Derive monthly instrument breakdown (RD/FD/Debt from Debt bucket; Bonds fixed to zero). */
function instrumentBreakdownFromMonthlyBuckets(allocationPercent) {
  const d = cfg.debtBucketToInstruments || { rd: 33.33, fd: 33.33, debt: 33.34 };
  const debtPct = Number(allocationPercent.Debt) || 0;
  const goldPct = Number(allocationPercent.Gold) || 0;
  return {
    rd: Math.round((debtPct * (d.rd / 100)) * 100) / 100,
    fd: 0,
    bonds: 0,
    debt: Math.round((debtPct * (d.debt / 100) + goldPct) * 100) / 100,
    equity: Math.round((Number(allocationPercent.Equity) || 0) * 100) / 100,
    mutualFunds: Math.round((Number(allocationPercent.MutualFunds) || 0) * 100) / 100,
  };
}

/**
 * Compute dynamic equity sub-allocation (compounding/growth/multibagger).
 * Global constraints: multibagger <= 20%, compounding >= 30%.
 */
function computeEquitySubAllocation(params) {
  const { horizonClass, riskAppetite, priority } = params;
  let comp;
  let growth;
  let multibagger;

  if (horizonClass === 'short') {
    if (riskAppetite === 'High') {
      comp = 70; growth = 30; multibagger = 0;
    } else if (riskAppetite === 'Low') {
      comp = 90; growth = 10; multibagger = 0;
    } else {
      comp = 80; growth = 20; multibagger = 0;
    }
  } else if (horizonClass === 'mid') {
    if (riskAppetite === 'High') {
      comp = 40; growth = 40; multibagger = 20;
    } else if (riskAppetite === 'Low') {
      comp = 60; growth = 30; multibagger = 10;
    } else {
      comp = 50; growth = 35; multibagger = 15;
    }
  } else {
    if (riskAppetite === 'High') {
      comp = 30; growth = 50; multibagger = 20;
    } else if (riskAppetite === 'Low') {
      comp = 40; growth = 45; multibagger = 15;
    } else {
      comp = 35; growth = 45; multibagger = 20;
    }
  }

  if (priority === 'high' && horizonClass === 'short') {
    multibagger = 0;
    growth = Math.min(growth, 20);
    comp = 100 - growth;
  }

  multibagger = Math.min(Math.max(0, multibagger), 20);
  comp = Math.max(comp, 30);
  growth = Math.max(0, growth);

  const total = comp + growth + multibagger;
  if (total <= 0) return { compounding: 100, growth: 0, multibagger: 0 };
  return {
    compounding: Math.round((comp / total) * 10000) / 100,
    growth: Math.round((growth / total) * 10000) / 100,
    multibagger: Math.round((multibagger / total) * 10000) / 100,
  };
}

/**
 * Compute dynamic mutual fund sub-allocation (core/flexi/global/thematic).
 * Short-term suppresses thematic and heavily favors core funds.
 */
function computeMutualFundSubAllocation(params) {
  const { horizonClass, riskAppetite, priority } = params;
  let core;
  let flexi;
  let global;
  let thematic;

  if (horizonClass === 'short') {
    if (riskAppetite === 'High') {
      core = 70; flexi = 25; global = 5; thematic = 0;
    } else if (riskAppetite === 'Low') {
      core = 80; flexi = 20; global = 0; thematic = 0;
    } else {
      core = 75; flexi = 20; global = 5; thematic = 0;
    }
  } else if (horizonClass === 'mid') {
    if (riskAppetite === 'High') {
      core = 45; flexi = 30; global = 10; thematic = 15;
    } else if (riskAppetite === 'Low') {
      core = 55; flexi = 30; global = 10; thematic = 5;
    } else {
      core = 50; flexi = 30; global = 10; thematic = 10;
    }
  } else {
    if (riskAppetite === 'High') {
      core = 35; flexi = 30; global = 15; thematic = 20;
    } else if (riskAppetite === 'Low') {
      core = 40; flexi = 30; global = 15; thematic = 15;
    } else {
      core = 40; flexi = 30; global = 15; thematic = 15;
    }
  }

  if (priority === 'high' && horizonClass === 'short') {
    thematic = 0;
    global = Math.min(global, 5);
    core = Math.max(core, 75);
  }

  const total = core + flexi + global + thematic;
  if (total <= 0) return { core: 100, flexicap: 0, global: 0, thematic: 0 };
  return {
    core: Math.round((core / total) * 10000) / 100,
    flexicap: Math.round((flexi / total) * 10000) / 100,
    global: Math.round((global / total) * 10000) / 100,
    thematic: Math.round((thematic / total) * 10000) / 100,
  };
}

function computeLumpsumAllocation(profile, isShortTerm) {
  const byProfile = isShortTerm
    ? cfg.shortTermLumpsumByProfile
    : cfg.lumpsumByProfile;
  const fallback = byProfile?.Moderate || {
    Equity: 25,
    MutualFunds: 20,
    Bonds: 30,
    Debt: 15,
    Gold: 10,
  };
  const base = byProfile?.[profile] || fallback;
  const out = normalizeLumpsumTo100(base);
  return {
    allocationPercent: out,
    safeAllocationPercentage:
      Math.round((out.Bonds + out.Debt + out.Gold) * 100) / 100,
    growthAllocationPercentage:
      Math.round((out.Equity + out.MutualFunds) * 100) / 100,
  };
}

export function computeRiskScore(input) {
  const { age, riskAppetite, incomeStability, goals } = input;
  let score = 0;
  const ageN = Number(age);
  if (Number.isFinite(ageN) && ageN >= 18 && ageN <= 100) {
    if (ageN < cfg.ageScore.under30.maxExclusive) score += cfg.ageScore.under30.delta;
    else if (ageN <= cfg.ageScore.between30_45.maxInclusive) score += cfg.ageScore.between30_45.delta;
    else score += cfg.ageScore.over45.delta;
  }

  score += cfg.riskAppetiteScore[riskAppetite] ?? 0;
  score += cfg.incomeStabilityScore[incomeStability] ?? 0;

  const hasShortTerm = (goals || []).some(
    (g) => Number(g.horizonYears) <= cfg.shortTermMaxYears
  );
  if (hasShortTerm) score += cfg.shortTermGoalPenalty;

  return score;
}

export function profileFromScore(score) {
  if (score >= cfg.profileThresholds.aggressiveMin) return 'Aggressive';
  if (score >= cfg.profileThresholds.moderateMin) return 'Moderate';
  return 'Conservative';
}

function applyAggressiveDeltas(w) {
  const d = cfg.riskAdjustmentDeltas.Aggressive;
  const out = cloneBuckets(w);
  BUCKETS.forEach((k) => {
    out[k] += d[k] || 0;
  });
  return normalizeTo100(out);
}

function applyConservativeDeltas(w) {
  const { bondsExtra, debtExtra } = cfg.riskAdjustmentDeltas.Conservative;
  const out = normalizeTo100(cloneBuckets(w));
  out.Bonds += bondsExtra;
  out.Debt += debtExtra;
  const extra = bondsExtra + debtExtra;
  let need = extra;
  const fromEq = Math.min(out.Equity, need);
  out.Equity -= fromEq;
  need -= fromEq;
  out.MutualFunds -= Math.min(out.MutualFunds, need);
  return normalizeTo100(out);
}

function applyAgeOver45(w, age) {
  if (age <= cfg.ageOver45Threshold) return cloneBuckets(w);
  const { totalPercent, bondsShare, debtShare } = cfg.ageOver45BondsDebtBoost;
  const out = cloneBuckets(w);
  out.Bonds += totalPercent * bondsShare;
  out.Debt += totalPercent * debtShare;
  const take = totalPercent;
  const reducible = ['Equity', 'MutualFunds', 'Gold'];
  let s = reducible.reduce((sum, k) => sum + out[k], 0);
  if (s <= 0) return normalizeTo100(out);
  reducible.forEach((k) => {
    const portion = s > 0 ? out[k] / s : 0;
    out[k] = Math.max(0, out[k] - take * portion);
  });
  return normalizeTo100(out);
}

function applyUnstableIncome(w, incomeStability) {
  if (incomeStability !== 'Unstable') return cloneBuckets(w);
  const shift = cfg.unstableIncomeBondsShift;
  const out = cloneBuckets(w);
  out.Bonds += shift;
  let left = shift;
  const fromDebt = Math.min(out.Debt, shift * 0.5);
  out.Debt -= fromDebt;
  left -= fromDebt;
  const fromEq = Math.min(out.Equity, left * 0.65);
  out.Equity -= fromEq;
  left -= fromEq;
  out.MutualFunds -= Math.min(out.MutualFunds, Math.max(0, left));
  return normalizeTo100(out);
}

function applyShortTermEquityCap(w, isShortTerm) {
  if (!isShortTerm) return cloneBuckets(w);
  const cap = cfg.shortTermEquityCap;
  const out = cloneBuckets(w);
  if (out.Equity <= cap) return out;
  const excess = out.Equity - cap;
  out.Equity = cap;
  out.Debt += excess * 0.5;
  out.Bonds += excess * 0.5;
  return normalizeTo100(out);
}

function applyConservativeFloor(w, profile) {
  if (profile !== 'Conservative') return cloneBuckets(w);
  const out = cloneBuckets(w);
  const floor = cfg.conservativeBondsDebtFloor;
  const bd = out.Bonds + out.Debt;
  if (bd >= floor - 0.01) return out;
  const need = floor - bd;
  out.Bonds += need * 0.55;
  out.Debt += need * 0.45;
  let take = need;
  const fromEq = Math.min(out.Equity, take);
  out.Equity -= fromEq;
  take -= fromEq;
  const fromMf = Math.min(out.MutualFunds, take);
  out.MutualFunds -= fromMf;
  take -= fromMf;
  out.Gold -= Math.min(out.Gold, take);
  return normalizeTo100(out);
}

/** Rebalance Equity vs MutualFunds split by risk appetite; total Equity+MF stays the same. */
function applyEquityMfSplitByRisk(w, riskAppetite) {
  const split =
    cfg.equityMfSplitByRisk?.[riskAppetite] ||
    cfg.equityMfSplitByRisk?.Medium ||
    { directShare: 0.44, mfShare: 0.56 };
  const out = cloneBuckets(w);
  const totalEqMf = out.Equity + out.MutualFunds;
  if (totalEqMf <= 0) return out;
  out.Equity = totalEqMf * split.directShare;
  out.MutualFunds = totalEqMf * split.mfShare;
  return normalizeTo100(out);
}

/** Cap Gold % based on age; redistribute excess proportionally to Equity+MF. */
function applyGoldCapByAge(w, age) {
  const ageN = Number(age) || 30;
  const goldMax =
    ageN < 30
      ? (cfg.goldMaxByAge?.under30 ?? 5)
      : ageN <= 45
        ? (cfg.goldMaxByAge?.between30_45 ?? 10)
        : (cfg.goldMaxByAge?.over45 ?? 15);
  const out = cloneBuckets(w);
  if (out.Gold <= goldMax) return out;
  const excess = out.Gold - goldMax;
  out.Gold = goldMax;
  const eqMf = out.Equity + out.MutualFunds;
  if (eqMf > 0) {
    out.Equity += excess * (out.Equity / eqMf);
    out.MutualFunds += excess * (out.MutualFunds / eqMf);
  } else {
    out.Debt += excess;
  }
  return normalizeTo100(out);
}

/** Ensure Debt+Bonds >= minDebtPercent; fund from Gold first, then Equity+MF. */
function applyDebtMinimum(w) {
  const minDebt = cfg.minDebtPercent ?? 5;
  const out = cloneBuckets(w);
  const totalDebt = out.Debt + out.Bonds;
  if (totalDebt >= minDebt) return out;
  const need = minDebt - totalDebt;
  const fromGold = Math.min(out.Gold, need);
  out.Gold -= fromGold;
  out.Debt += fromGold;
  const remaining = need - fromGold;
  if (remaining > 0) {
    const eqMf = out.Equity + out.MutualFunds;
    if (eqMf > 0) {
      const fromEq = Math.min(out.Equity, remaining * (out.Equity / eqMf));
      const fromMf = Math.min(out.MutualFunds, remaining - fromEq);
      out.Equity -= fromEq;
      out.MutualFunds -= fromMf;
      out.Debt += fromEq + fromMf;
    }
  }
  return normalizeTo100(out);
}

function wealthCreationAgeBucket(age) {
  const ageN = Number(age) || 30;
  if (ageN < 30) return 'under30';
  if (ageN <= 45) return 'between30_45';
  return 'over45';
}

function wealthCreationTarget(age, riskAppetite) {
  const bucket = wealthCreationAgeBucket(age);

  if (bucket === 'under30') {
    if (riskAppetite === 'High') return { totalEqMf: 83, debt: 12, gold: 5 };
    if (riskAppetite === 'Low') return { totalEqMf: 65, debt: 27, gold: 8 };
    return { totalEqMf: 75, debt: 20, gold: 5 };
  }

  if (bucket === 'between30_45') {
    if (riskAppetite === 'High') return { totalEqMf: 75, debt: 17, gold: 8 };
    if (riskAppetite === 'Low') return { totalEqMf: 60, debt: 30, gold: 10 };
    return { totalEqMf: 68, debt: 22, gold: 10 };
  }

  if (riskAppetite === 'High') return { totalEqMf: 60, debt: 28, gold: 12 };
  if (riskAppetite === 'Low') return { totalEqMf: 50, debt: 35, gold: 15 };
  return { totalEqMf: 55, debt: 32, gold: 13 };
}

function goalMonthlyTarget(horizon, riskAppetite) {
  if (horizon === 'short') {
    if (riskAppetite === 'High') return { Equity: 10, MutualFunds: 8, Debt: 78, Gold: 4 };
    if (riskAppetite === 'Low') return { Equity: 2, MutualFunds: 3, Debt: 90, Gold: 5 };
    return { Equity: 6, MutualFunds: 7, Debt: 83, Gold: 4 };
  }

  if (horizon === 'mid') {
    if (riskAppetite === 'High') return { Equity: 45, MutualFunds: 30, Debt: 18, Gold: 7 };
    if (riskAppetite === 'Low') return { Equity: 25, MutualFunds: 35, Debt: 32, Gold: 8 };
    return { Equity: 35, MutualFunds: 35, Debt: 22, Gold: 8 };
  }

  if (riskAppetite === 'High') return { Equity: 65, MutualFunds: 23, Debt: 7, Gold: 5 };
  if (riskAppetite === 'Low') return { Equity: 45, MutualFunds: 30, Debt: 15, Gold: 10 };
  return { Equity: 55, MutualFunds: 28, Debt: 10, Gold: 7 };
}

function applyHighPriorityGoalGuardrails(weights, horizonClass, priority) {
  if (priority !== 'high') return normalizeMonthlyTo100(weights);

  const out = { ...weights };
  if (horizonClass === 'short') {
    out.Equity = Math.min(out.Equity, 5);
    out.MutualFunds = Math.min(out.MutualFunds, 5);
    out.Gold = Math.max(out.Gold, 5);
    out.Debt = 100 - out.Equity - out.MutualFunds - out.Gold;
    return normalizeMonthlyTo100(out);
  }

  if (horizonClass === 'mid') {
    const shiftFromEquity = Math.min(out.Equity, 5);
    const shiftFromMf = Math.min(out.MutualFunds, 3);
    out.Equity -= shiftFromEquity;
    out.MutualFunds -= shiftFromMf;
    out.Debt += shiftFromEquity + shiftFromMf;
    return normalizeMonthlyTo100(out);
  }

  return normalizeMonthlyTo100(out);
}

/**
 * Compute allocation for wealth-creation mode (no goals).
 * Age drives base Equity+MF vs Debt vs Gold split; risk appetite adjusts the Equity/MF ratio.
 */
function computeWealthCreationAllocation(input, profile) {
  const riskAppetite = input.riskAppetite || 'Medium';

  let { totalEqMf, debt, gold } = wealthCreationTarget(input.age, riskAppetite);

  if (input.incomeStability === 'Unstable') {
    const shift = Math.min(totalEqMf - 20, 8);
    if (shift > 0) { totalEqMf -= shift; debt += shift; }
  }

  const ageN = Number(input.age) || 30;
  const goldMax =
    ageN < 30    ? (cfg.goldMaxByAge?.under30 ?? 5)
    : ageN <= 45 ? (cfg.goldMaxByAge?.between30_45 ?? 10)
                 : (cfg.goldMaxByAge?.over45 ?? 15);
  gold = Math.min(gold, goldMax);
  debt = Math.max(cfg.minDebtPercent ?? 5, debt);

  const rawTotal = totalEqMf + debt + gold;
  if (Math.abs(rawTotal - 100) > 0.1) {
    const scale = 100 / rawTotal;
    totalEqMf = Math.round(totalEqMf * scale * 100) / 100;
    debt      = Math.round(debt      * scale * 100) / 100;
    gold      = Math.round((100 - totalEqMf - debt) * 100) / 100;
  }

  const split =
    cfg.equityMfSplitByRisk?.[riskAppetite] ||
    cfg.equityMfSplitByRisk?.Medium ||
    { directShare: 0.44, mfShare: 0.56 };

  const monthlyAllocationPercent = normalizeMonthlyTo100({
    Equity: totalEqMf * split.directShare,
    MutualFunds: totalEqMf * split.mfShare,
    Debt: debt,
    Gold: gold,
  });
  const instrumentBreakdown = instrumentBreakdownFromMonthlyBuckets(monthlyAllocationPercent);
  const safePct   = Math.round((monthlyAllocationPercent.Debt  + monthlyAllocationPercent.Gold)        * 100) / 100;
  const growthPct = Math.round((monthlyAllocationPercent.Equity + monthlyAllocationPercent.MutualFunds) * 100) / 100;
  const lumpsumAlloc = computeLumpsumAllocation(profile, false);

  return {
    horizonClass: 'long',
    horizonYears: cfg.defaultHorizonWhenNoGoals,
    monthlyAllocationPercent,
    lumpsumAllocationPercent: lumpsumAlloc.allocationPercent,
    goalType: 'standard',
    priority: 'normal',
    monthlySafeAllocationPercentage:   safePct,
    monthlyGrowthAllocationPercentage: growthPct,
    lumpsumSafeAllocationPercentage:   lumpsumAlloc.safeAllocationPercentage,
    lumpsumGrowthAllocationPercentage: lumpsumAlloc.growthAllocationPercentage,
    instrumentBreakdown,
  };
}

function computeGoalAllocation(goal, globalInput, profile) {
  const years = Number(goal.horizonYears) || 0;
  const h = horizonClass(years);
  const { goalType, priority } = classifyGoal(goal);
  const isShortTerm = goalType === 'short_term';

  let monthlyAllocationPercent;
  let monthlyInstrumentBreakdown;
  let monthlySafeAllocationPercentage;
  let monthlyGrowthAllocationPercentage;

  let monthlyTarget = goalMonthlyTarget(h, globalInput.riskAppetite || 'Medium');
  monthlyTarget = applyHighPriorityGoalGuardrails(monthlyTarget, h, priority);

  let w = normalizeMonthlyTo100(monthlyTarget);
  w = applyGoldCapByAge(fullBucketsFromMonthly(w), globalInput.age);
  w = applyDebtMinimum(w);
  monthlyAllocationPercent = monthlyFromFullBuckets(w);
  monthlyInstrumentBreakdown = instrumentBreakdownFromMonthlyBuckets(monthlyAllocationPercent);
  monthlySafeAllocationPercentage =
    Math.round((monthlyAllocationPercent.Debt + monthlyAllocationPercent.Gold) * 100) / 100;
  monthlyGrowthAllocationPercentage =
    Math.round((monthlyAllocationPercent.Equity + monthlyAllocationPercent.MutualFunds) * 100) / 100;

  const lumpsum = computeLumpsumAllocation(profile, isShortTerm);

  return {
    horizonClass: h,
    horizonYears: years,
    monthlyAllocationPercent,
    lumpsumAllocationPercent: lumpsum.allocationPercent,
    goalType,
    priority,
    monthlySafeAllocationPercentage,
    monthlyGrowthAllocationPercentage,
    lumpsumSafeAllocationPercentage: lumpsum.safeAllocationPercentage,
    lumpsumGrowthAllocationPercentage: lumpsum.growthAllocationPercentage,
    instrumentBreakdown: monthlyInstrumentBreakdown,
  };
}

/** Weighted expected annual return from allocation % */
export function blendedAnnualReturn(allocationPercent) {
  let s = 0;
  BUCKETS.forEach((k) => {
    const p = (Number(allocationPercent[k]) || 0) / 100;
    const r = cfg.expectedReturnsAnnual[k] ?? 0;
    s += p * r;
  });
  const v = Number(s);
  return Number.isFinite(v) ? v : 0;
}

/**
 * SIP future value: FV = PMT * (((1+r)^n - 1) / r), r = annual/12, n = months
 */
export function sipFutureValue(monthlySip, annualRate, years) {
  const sip = Math.max(0, Number(monthlySip) || 0);
  const y = Math.max(0, Number(years) || 0);
  const m = Math.round(y * 12);
  if (m <= 0 || sip <= 0) return 0;
  const ar = Number(annualRate);
  if (!Number.isFinite(ar) || ar < 0) return 0;
  const mr = ar / 12;
  if (mr === 0) return Math.round(sip * m * 100) / 100;
  const factor = Math.pow(1 + mr, m) - 1;
  if (!Number.isFinite(factor) || factor <= 0) return 0;
  const fv = (sip * factor) / mr;
  return Number.isFinite(fv) ? Math.round(fv * 100) / 100 : 0;
}

export function inflatedTargetAmount(targetAmount, years, inflationRate = cfg.inflationRate) {
  const t = Math.max(0, Number(targetAmount) || 0);
  const y = Math.max(0, Number(years) || 0);
  const inf = Number(inflationRate);
  if (!Number.isFinite(inf)) return t;
  const mult = Math.pow(1 + inf, y);
  if (!Number.isFinite(mult)) return t;
  return Math.round(t * mult * 100) / 100;
}

export function goalStatusFromSuccessRatio(successRatio) {
  const r = Number(successRatio);
  if (!Number.isFinite(r)) return 'High Risk';
  if (r >= 1) return 'On Track';
  if (r >= 0.7) return 'Needs Improvement';
  return 'High Risk';
}

/** Move equity up from Bonds+Debt proportionally (percentage points). */
function adjustAllocationLowSuccess(w) {
  const pts = cfg.dynamicAdjust.equityBoostPoints;
  const out = cloneBuckets(w);
  const bd = out.Bonds + out.Debt;
  if (bd >= pts * 0.5) {
    const fromB = (out.Bonds / bd) * pts;
    const fromD = (out.Debt / bd) * pts;
    out.Bonds = Math.max(0, out.Bonds - fromB);
    out.Debt = Math.max(0, out.Debt - fromD);
    out.Equity += pts;
  } else {
    const rest = pts - bd;
    out.Bonds = 0;
    out.Debt = 0;
    out.Equity += bd;
    const reducible = ['MutualFunds', 'Gold'];
    let rem = rest;
    let s = reducible.reduce((sum, k) => sum + out[k], 0);
    reducible.forEach((k) => {
      if (rem <= 0 || s <= 0) return;
      const take = Math.min(out[k], (out[k] / s) * rem);
      out[k] -= take;
      rem -= take;
    });
    out.Equity += pts - rem;
  }
  return normalizeTo100(out);
}

/** Lock gains: shift from Equity to Bonds+Debt. */
function adjustAllocationHighSuccess(w) {
  const pts = Math.min(cfg.dynamicAdjust.equityReducePoints, w.Equity);
  const out = cloneBuckets(w);
  out.Equity -= pts;
  out.Bonds += pts * 0.55;
  out.Debt += pts * 0.45;
  return normalizeTo100(out);
}

/**
 * Month-by-month accumulated SIP value at fixed annual rate.
 * @param {{ monthlyInvestmentAllocated?: number, monthlyShare?: number, horizonYears?: number }} goalLike
 * @param {number} annualRate
 * @returns {{ month: number, value: number }[]}
 */
export function generateProjectionSeries(goalLike, annualRate) {
  const sip = Math.max(
    0,
    Number(goalLike.monthlyInvestmentAllocated ?? goalLike.monthlyShare) || 0
  );
  const years = Math.max(0, Number(goalLike.horizonYears) || 0);
  const monthsTotal = Math.max(0, Math.round(years * 12));
  const ar = Number(annualRate);
  if (!Number.isFinite(ar) || monthsTotal === 0) {
    return monthsTotal === 0 ? [] : [{ month: 0, value: 0 }];
  }
  const mr = ar / 12;
  const series = [];
  let acc = 0;
  for (let month = 1; month <= monthsTotal; month++) {
    if (mr === 0) {
      acc += sip;
    } else {
      acc = acc * (1 + mr) + sip;
    }
    const v = Math.round(acc * 100) / 100;
    series.push({ month, value: Number.isFinite(v) ? v : 0 });
  }
  return series;
}

function goalWeightsForRupees(goals) {
  const targets = goals.map((g) => Math.max(0, Number(g.targetAmount) || 0));
  const total = targets.reduce((a, b) => a + b, 0);
  if (total <= 0) {
    const n = goals.length || 1;
    return goals.map(() => 1 / n);
  }
  return targets.map((t) => t / total);
}

function buildWarnings(input, profile, score, goalResults) {
  const warnings = [];
  if (profile === 'Aggressive' && input.incomeStability === 'Unstable') {
    warnings.push({
      code: 'aggressive_unstable',
      message:
        'Aggressive profile with unstable income increases risk. Consider building a larger emergency buffer in Debt/Liquid before raising equity exposure.',
    });
  }
  goalResults.forEach((gr, i) => {
    const name = input.goals[i]?.name || `Goal ${i + 1}`;
    if (
      gr.horizonClass === 'short' &&
      gr.monthlyAllocationPercent.Equity > cfg.shortTermEquityCap + 0.5
    ) {
      warnings.push({
        code: 'short_term_equity',
        message: `Short-term goal "${name}": equity is capped below 20% to manage near-term volatility.`,
      });
    }
    if (gr.horizonClass === 'short' && gr.monthlyAllocationPercent.Equity >= 15) {
      warnings.push({
        code: 'short_term_equity_elevated',
        message: `Goal "${name}" is short-term; keep most of this bucket in Debt/Bonds for liquidity.`,
      });
    }
  });
  if (input.monthlyInvestment <= 0) {
    warnings.push({
      code: 'no_investment',
      message: 'Enter a monthly investment amount to see rupee allocations and SIP projections.',
    });
  }
  return warnings;
}

/** Risk exposure bar matches the user's selected risk appetite (Low / Medium / High). */
export function riskExposureFromAppetite(riskAppetite) {
  if (riskAppetite === 'Low') return 'Low';
  if (riskAppetite === 'High') return 'High';
  return 'Medium';
}

function enrichGoalWithProjections(
  grBase,
  monthlyShare,
  lumpsumShare,
  targetAmount,
  profile,
  globalInput
) {
  const years = grBase.horizonYears;
  const isShort = grBase.horizonClass === 'short';
  let monthlyAllocationPercent = normalizeMonthlyTo100(grBase.monthlyAllocationPercent);
  let allocationPercent = fullBucketsFromMonthly(monthlyAllocationPercent);
  const lumpsumAllocationPercent = normalizeLumpsumTo100(grBase.lumpsumAllocationPercent);

  const inflatedTarget = inflatedTargetAmount(targetAmount, years);
  const sip = Math.max(0, Number(monthlyShare) || 0);
  const lumpsum = Math.max(0, Number(lumpsumShare) || 0);
  const months = Math.max(0, Math.round(years * 12));

  let blend = blendedAnnualReturn(allocationPercent);
  let projectedValue = sipFutureValue(sip, blend, years);
  let successRatio =
    inflatedTarget > 0 ? projectedValue / inflatedTarget : sip > 0 || targetAmount <= 0 ? 1 : 0;

  const isShortTermSafeFirst = grBase.goalType === 'short_term';
  if (!isShortTermSafeFirst) {
    if (successRatio < 0.7 && inflatedTarget > 0 && years > 0) {
      allocationPercent = adjustAllocationLowSuccess(allocationPercent);
      allocationPercent = applyShortTermEquityCap(allocationPercent, isShort);
      allocationPercent = applyConservativeFloor(allocationPercent, profile);
      allocationPercent = normalizeTo100(allocationPercent);
      monthlyAllocationPercent = monthlyFromFullBuckets(allocationPercent);
      allocationPercent = fullBucketsFromMonthly(monthlyAllocationPercent);
      blend = blendedAnnualReturn(allocationPercent);
      projectedValue = sipFutureValue(sip, blend, years);
      successRatio = inflatedTarget > 0 ? projectedValue / inflatedTarget : 1;
    } else if (successRatio > 1.2 && inflatedTarget > 0) {
      allocationPercent = adjustAllocationHighSuccess(allocationPercent);
      allocationPercent = applyShortTermEquityCap(allocationPercent, isShort);
      allocationPercent = normalizeTo100(allocationPercent);
      monthlyAllocationPercent = monthlyFromFullBuckets(allocationPercent);
      allocationPercent = fullBucketsFromMonthly(monthlyAllocationPercent);
      blend = blendedAnnualReturn(allocationPercent);
      projectedValue = sipFutureValue(sip, blend, years);
      successRatio = inflatedTarget > 0 ? projectedValue / inflatedTarget : 1;
    }
  }

  if (!Number.isFinite(successRatio)) successRatio = 0;
  const goalStatus = goalStatusFromSuccessRatio(successRatio);

  const conservativeValue = sipFutureValue(sip, cfg.scenarioRates.conservative, years);
  const aggressiveValue = sipFutureValue(sip, cfg.scenarioRates.aggressive, years);
  const totalInvestedAmount =
    months > 0 && sip > 0 ? Math.round(sip * months * 100) / 100 : 0;

  const goalPayload = {
    horizonYears: years,
    monthlyInvestmentAllocated: sip,
    monthlyShare: sip,
  };

  const projections = {
    expected: generateProjectionSeries(goalPayload, blend),
    conservative: generateProjectionSeries(goalPayload, cfg.scenarioRates.conservative),
    aggressive: generateProjectionSeries(goalPayload, cfg.scenarioRates.aggressive),
  };

  const monthlyRupee = Object.fromEntries(MONTHLY_BUCKETS.map((k) => [k, 0]));
  MONTHLY_BUCKETS.forEach((k) => {
    monthlyRupee[k] = Math.round(sip * (monthlyAllocationPercent[k] / 100) * 100) / 100;
  });

  const lumpsumRupee = Object.fromEntries(LUMPSUM_BUCKETS.map((k) => [k, 0]));
  LUMPSUM_BUCKETS.forEach((k) => {
    lumpsumRupee[k] = Math.round(lumpsum * (lumpsumAllocationPercent[k] / 100) * 100) / 100;
  });

  const combinedRupee = Object.fromEntries(BUCKETS.map((k) => [k, 0]));
  BUCKETS.forEach((k) => {
    combinedRupee[k] = Math.round(((monthlyRupee[k] || 0) + (lumpsumRupee[k] || 0)) * 100) / 100;
  });

  const instPct =
    grBase.instrumentBreakdown || instrumentBreakdownFromMonthlyBuckets(monthlyAllocationPercent);
  const instrumentAmountBreakdown = {};
  INSTRUMENT_KEYS.forEach((k) => {
    const p = Number(instPct[k]) || 0;
    instrumentAmountBreakdown[k] = Math.round((sip * p / 100) * 100) / 100;
  });

  // Sub-asset allocations: equity and mutual fund breakdowns (percent + rupee)
  const equityPct = Number(monthlyAllocationPercent.Equity) || 0;
  let equityBreakdown = null;
  if (equityPct > 0) {
    const eqPct = computeEquitySubAllocation({
      horizonClass: grBase.horizonClass,
      riskAppetite: globalInput.riskAppetite,
      priority: grBase.priority,
    });
    const monthlyEquityRupee = monthlyRupee.Equity || 0;
    const lumpsumEquityRupee = lumpsumRupee.Equity || 0;
    equityBreakdown = {
      compounding: eqPct.compounding,
      growth: eqPct.growth,
      multibagger: eqPct.multibagger,
      monthlyRupee: {
        compounding: Math.round((monthlyEquityRupee * (eqPct.compounding / 100)) * 100) / 100,
        growth: Math.round((monthlyEquityRupee * (eqPct.growth / 100)) * 100) / 100,
        multibagger: Math.round((monthlyEquityRupee * (eqPct.multibagger / 100)) * 100) / 100,
      },
      lumpsumRupee: {
        compounding: Math.round((lumpsumEquityRupee * (eqPct.compounding / 100)) * 100) / 100,
        growth: Math.round((lumpsumEquityRupee * (eqPct.growth / 100)) * 100) / 100,
        multibagger: Math.round((lumpsumEquityRupee * (eqPct.multibagger / 100)) * 100) / 100,
      },
    };
  }

  const mfPct = Number(monthlyAllocationPercent.MutualFunds) || 0;
  let mutualFundBreakdown = null;
  if (mfPct > 0) {
    const mfPctObj = computeMutualFundSubAllocation({
      horizonClass: grBase.horizonClass,
      riskAppetite: globalInput.riskAppetite,
      priority: grBase.priority,
    });
    const monthlyMfRupee = monthlyRupee.MutualFunds || 0;
    const lumpsumMfRupee = lumpsumRupee.MutualFunds || 0;
    mutualFundBreakdown = {
      core: mfPctObj.core,
      flexicap: mfPctObj.flexicap,
      global: mfPctObj.global,
      thematic: mfPctObj.thematic,
      monthlyRupee: {
        core: Math.round((monthlyMfRupee * (mfPctObj.core / 100)) * 100) / 100,
        flexicap: Math.round((monthlyMfRupee * (mfPctObj.flexicap / 100)) * 100) / 100,
        global: Math.round((monthlyMfRupee * (mfPctObj.global / 100)) * 100) / 100,
        thematic: Math.round((monthlyMfRupee * (mfPctObj.thematic / 100)) * 100) / 100,
      },
      lumpsumRupee: {
        core: Math.round((lumpsumMfRupee * (mfPctObj.core / 100)) * 100) / 100,
        flexicap: Math.round((lumpsumMfRupee * (mfPctObj.flexicap / 100)) * 100) / 100,
        global: Math.round((lumpsumMfRupee * (mfPctObj.global / 100)) * 100) / 100,
        thematic: Math.round((lumpsumMfRupee * (mfPctObj.thematic / 100)) * 100) / 100,
      },
    };
  }

  const monthlySafePct =
    grBase.monthlySafeAllocationPercentage ??
    Math.round((monthlyAllocationPercent.Debt + monthlyAllocationPercent.Gold) * 100) / 100;
  const monthlyGrowthPct =
    grBase.monthlyGrowthAllocationPercentage ??
    Math.round((monthlyAllocationPercent.Equity + monthlyAllocationPercent.MutualFunds) * 100) / 100;
  const lumpsumSafePct =
    grBase.lumpsumSafeAllocationPercentage ??
    Math.round((lumpsumAllocationPercent.Bonds + lumpsumAllocationPercent.Debt + lumpsumAllocationPercent.Gold) * 100) / 100;
  const lumpsumGrowthPct =
    grBase.lumpsumGrowthAllocationPercentage ??
    Math.round((lumpsumAllocationPercent.Equity + lumpsumAllocationPercent.MutualFunds) * 100) / 100;

  const combinedTotal = sip + lumpsum;
  const combinedAllocationPercent =
    combinedTotal > 0
      ? normalizeTo100(
          Object.fromEntries(
            BUCKETS.map((k) => [k, (combinedRupee[k] / combinedTotal) * 100])
          )
        )
      : normalizeTo100({ Equity: 25, MutualFunds: 25, Debt: 25, Bonds: 25, Gold: 0 });

  const totalGrowth =
    Number(monthlyAllocationPercent.Equity || 0) + Number(monthlyAllocationPercent.MutualFunds || 0);
  const equityMutualFundSplit = totalGrowth > 0
    ? {
        equityOfGrowth: Math.round(((Number(monthlyAllocationPercent.Equity || 0) / totalGrowth) * 100) * 100) / 100,
        mutualFundsOfGrowth: Math.round(((Number(monthlyAllocationPercent.MutualFunds || 0) / totalGrowth) * 100) * 100) / 100,
        equityOfPortfolio: Math.round((Number(monthlyAllocationPercent.Equity || 0)) * 100) / 100,
        mutualFundsOfPortfolio: Math.round((Number(monthlyAllocationPercent.MutualFunds || 0)) * 100) / 100,
      }
    : null;

  return {
    ...grBase,
    goalName: grBase.goalName,
    targetAmount,
    allocationPercent: fullBucketsFromMonthly(monthlyAllocationPercent),
    monthlyAllocationPercent,
    lumpsumAllocationPercent,
    combinedAllocationPercent,
    monthlyShare: sip,
    monthlyInvestmentAllocated: sip,
    lumpsumInvestmentAllocated: lumpsum,
    rupeeAllocation: combinedRupee,
    monthlyRupeeAllocation: monthlyRupee,
    lumpsumRupeeAllocation: lumpsumRupee,
    combinedRupeeAllocation: combinedRupee,
    inflatedTarget,
    projectedValue,
    conservativeValue,
    aggressiveValue,
    successRatio: Math.round(successRatio * 10000) / 10000,
    goalStatus,
    blendedExpectedReturnAnnual: Math.round(blend * 10000) / 10000,
    totalInvestedAmount,
    projections,
    goalType: grBase.goalType,
    priority: grBase.priority,
    safeAllocationPercentage: monthlySafePct,
    growthAllocationPercentage: monthlyGrowthPct,
    monthlySafeAllocationPercentage: monthlySafePct,
    monthlyGrowthAllocationPercentage: monthlyGrowthPct,
    lumpsumSafeAllocationPercentage: lumpsumSafePct,
    lumpsumGrowthAllocationPercentage: lumpsumGrowthPct,
    instrumentBreakdown: instPct,
    instrumentAmountBreakdown,
    equityMutualFundSplit,
    equityBreakdown,
    mutualFundBreakdown,
  };
}

function computePortfolioMetrics(goalsEnriched, totalMonthly) {
  if (!goalsEnriched.length) {
    return {
      overallSuccessScore: 0,
      weightedExpectedReturnAnnual: 0,
      averageSuccessRatio: 0,
    };
  }
  let wSum = 0;
  let retSum = 0;
  let scoreSum = 0;
  let ratioSum = 0;
  goalsEnriched.forEach((g) => {
    const w = totalMonthly > 0 ? g.monthlyShare / totalMonthly : 1 / goalsEnriched.length;
    const br = g.blendedExpectedReturnAnnual ?? 0;
    const sr = Math.min(1, Math.max(0, Number(g.successRatio) || 0));
    wSum += w;
    retSum += w * br;
    scoreSum += sr * 100 * w;
    ratioSum += (Number(g.successRatio) || 0) / goalsEnriched.length;
  });
  const weightedReturn = wSum > 0 ? retSum / wSum : 0;
  const overallSuccess = wSum > 0 ? scoreSum / wSum : 0;
  return {
    overallSuccessScore: Math.round(Math.min(100, Math.max(0, overallSuccess)) * 10) / 10,
    weightedExpectedReturnAnnual: Math.round(weightedReturn * 10000) / 10000,
    averageSuccessRatio: Math.round(ratioSum * 10000) / 10000,
  };
}

/**
 * @param {object} input
 * @param {number} input.age
 * @param {number} input.monthlyIncome
 * @param {number} input.monthlyInvestment
 * @param {'Stable'|'Unstable'} input.incomeStability
 * @param {'Low'|'Medium'|'High'} input.riskAppetite
 * @param {{ name: string, targetAmount: number, horizonYears: number }[]} input.goals
 */
export function computeAllocation(input) {
  const monthly = Math.max(0, Number(input.monthlyInvestment) || 0);
  const lumpsum = Math.max(0, Number(input.lumpsumInvestment) || 0);

  const cleanedGoals = (input.goals || []).filter((g) => Number(g.targetAmount) > 0);

  if (!cleanedGoals.length) {
    const investmentMode = 'wealth_creation';
    const goals = [];
    const score = computeRiskScore({ ...input, goals });
    const profile = profileFromScore(score);
    const alloc = computeWealthCreationAllocation(input, profile);
    const grBase = {
      goalName: 'General portfolio (add goals to personalize)',
      targetAmount: 0,
      horizonYears: alloc.horizonYears,
      horizonClass: alloc.horizonClass,
      monthlyAllocationPercent: alloc.monthlyAllocationPercent,
      lumpsumAllocationPercent: alloc.lumpsumAllocationPercent,
      goalType: alloc.goalType,
      priority: alloc.priority,
      monthlySafeAllocationPercentage: alloc.monthlySafeAllocationPercentage,
      monthlyGrowthAllocationPercentage: alloc.monthlyGrowthAllocationPercentage,
      lumpsumSafeAllocationPercentage: alloc.lumpsumSafeAllocationPercentage,
      lumpsumGrowthAllocationPercentage: alloc.lumpsumGrowthAllocationPercentage,
      instrumentBreakdown: alloc.instrumentBreakdown,
    };
    const defaultPlan = enrichGoalWithProjections(
      grBase,
      monthly,
      lumpsum,
      0,
      profile,
      input
    );

    const monthlyRupee = cloneForBuckets(MONTHLY_BUCKETS, defaultPlan.monthlyRupeeAllocation);
    const lumpsumRupee = cloneForBuckets(LUMPSUM_BUCKETS, defaultPlan.lumpsumRupeeAllocation);
    const combinedRupee = cloneBuckets(defaultPlan.combinedRupeeAllocation);

    const monthlyPercent =
      monthly > 0
        ? normalizeMonthlyTo100(defaultPlan.monthlyAllocationPercent)
        : zerosForBuckets(MONTHLY_BUCKETS);
    const lumpsumPercent =
      lumpsum > 0
        ? normalizeLumpsumTo100(defaultPlan.lumpsumAllocationPercent)
        : zerosForBuckets(LUMPSUM_BUCKETS);
    const combinedTotal = monthly + lumpsum;
    const combinedPercent =
      combinedTotal > 0
        ? normalizeTo100(
            Object.fromEntries(BUCKETS.map((k) => [k, (combinedRupee[k] / combinedTotal) * 100]))
          )
        : zerosForBuckets(BUCKETS);

    const portfolioMetrics = computePortfolioMetrics([defaultPlan], monthly);
    const warnings = [];
    if (monthly <= 0) {
      warnings.push({
        code: 'no_investment',
        message:
          'Enter monthly investment to see rupee splits. Allocation % below uses a default 10-year horizon.',
      });
    }
    warnings.push({
      code: 'no_goals_default_mix',
      message:
        'No goals yet — showing a default mix for your profile. Add goals for target-based splits and per-goal charts.',
    });

    return {
      score,
      profile,
      riskIndicator: riskExposureFromAppetite(input.riskAppetite),
      goals: [],
      defaultPlan,
      portfolioSummary: {
        totalMonthlyInvestment: monthly,
        totalLumpsumInvestment: lumpsum,
        totalCombinedInvestment: combinedTotal,
        monthly: {
          rupeeByCategory: monthlyRupee,
          percentBlend: monthlyPercent,
        },
        lumpsum: {
          rupeeByCategory: lumpsumRupee,
          percentBlend: lumpsumPercent,
        },
        combined: {
          rupeeByCategory: combinedRupee,
          percentBlend: combinedPercent,
        },
        rupeeByCategory: combinedRupee,
        percentBlend: combinedPercent,
      },
      portfolioMetrics,
      projections: [
        {
          goalName: defaultPlan.goalName,
          horizonYears: defaultPlan.horizonYears,
          series: defaultPlan.projections,
          successRatio: defaultPlan.successRatio,
          goalStatus: defaultPlan.goalStatus,
          inflatedTarget: defaultPlan.inflatedTarget,
          projectedValue: defaultPlan.projectedValue,
        },
      ],
      warnings,
      meta: {
        monthlyIncome: Number(input.monthlyIncome) || 0,
        monthlyInvestment: monthly,
        lumpsumInvestment: lumpsum,
      },
      investmentMode,
      hasGoals: false,
      usesDefaultAllocation: true,
    };
  }

  const goals = cleanedGoals;

  const score = computeRiskScore({ ...input, goals });
  const profile = profileFromScore(score);

  const goalResults = goals.map((g) => {
    const alloc = computeGoalAllocation(g, input, profile);
    return {
      goalName: g.name || 'Unnamed goal',
      targetAmount: Number(g.targetAmount) || 0,
      horizonYears: alloc.horizonYears,
      horizonClass: alloc.horizonClass,
      monthlyAllocationPercent: alloc.monthlyAllocationPercent,
      lumpsumAllocationPercent: alloc.lumpsumAllocationPercent,
      goalType: alloc.goalType,
      priority: alloc.priority,
      monthlySafeAllocationPercentage: alloc.monthlySafeAllocationPercentage,
      monthlyGrowthAllocationPercentage: alloc.monthlyGrowthAllocationPercentage,
      lumpsumSafeAllocationPercentage: alloc.lumpsumSafeAllocationPercentage,
      lumpsumGrowthAllocationPercentage: alloc.lumpsumGrowthAllocationPercentage,
      instrumentBreakdown: alloc.instrumentBreakdown,
    };
  });

  const weights = goalWeightsForRupees(goals);

  const goalsWithRupee = goalResults.map((gr, i) => {
    const monthlyShare = monthly * weights[i];
    const lumpsumShare = lumpsum * weights[i];
    const sipAlloc = monthlyShare > 0 ? monthlyShare : monthly > 0 ? 0 : 0;
    return enrichGoalWithProjections(
      gr,
      sipAlloc,
      lumpsumShare,
      gr.targetAmount,
      profile,
      input
    );
  });

  const monthlyPortfolioRupee = zerosForBuckets(MONTHLY_BUCKETS);
  const lumpsumPortfolioRupee = zerosForBuckets(LUMPSUM_BUCKETS);
  const combinedPortfolioRupee = zerosForBuckets(BUCKETS);

  goalsWithRupee.forEach((g) => {
    MONTHLY_BUCKETS.forEach((k) => {
      monthlyPortfolioRupee[k] += g.monthlyRupeeAllocation[k] || 0;
    });
    LUMPSUM_BUCKETS.forEach((k) => {
      lumpsumPortfolioRupee[k] += g.lumpsumRupeeAllocation[k] || 0;
    });
    BUCKETS.forEach((k) => {
      combinedPortfolioRupee[k] += g.combinedRupeeAllocation[k] || 0;
    });
  });

  MONTHLY_BUCKETS.forEach((k) => {
    monthlyPortfolioRupee[k] = Math.round(monthlyPortfolioRupee[k] * 100) / 100;
  });
  LUMPSUM_BUCKETS.forEach((k) => {
    lumpsumPortfolioRupee[k] = Math.round(lumpsumPortfolioRupee[k] * 100) / 100;
  });
  BUCKETS.forEach((k) => {
    combinedPortfolioRupee[k] = Math.round(combinedPortfolioRupee[k] * 100) / 100;
  });

  const totalMonthly = monthly;
  const totalLumpsum = lumpsum;
  const totalCombined = totalMonthly + totalLumpsum;

  const monthlyPercent =
    totalMonthly > 0
      ? normalizeMonthlyTo100(
          Object.fromEntries(
            MONTHLY_BUCKETS.map((k) => [k, (monthlyPortfolioRupee[k] / totalMonthly) * 100])
          )
        )
      : zerosForBuckets(MONTHLY_BUCKETS);
  const lumpsumPercent =
    totalLumpsum > 0
      ? normalizeLumpsumTo100(
          Object.fromEntries(
            LUMPSUM_BUCKETS.map((k) => [k, (lumpsumPortfolioRupee[k] / totalLumpsum) * 100])
          )
        )
      : zerosForBuckets(LUMPSUM_BUCKETS);
  const combinedPercent =
    totalCombined > 0
      ? normalizeTo100(
          Object.fromEntries(BUCKETS.map((k) => [k, (combinedPortfolioRupee[k] / totalCombined) * 100]))
        )
      : zerosForBuckets(BUCKETS);

  const warnings = buildWarnings(input, profile, score, goalResults);

  const riskIndicator = riskExposureFromAppetite(input.riskAppetite);
  const portfolioMetrics = computePortfolioMetrics(goalsWithRupee, totalMonthly);

  return {
    score,
    profile,
    riskIndicator,
    goals: goalsWithRupee,
    portfolioSummary: {
      totalMonthlyInvestment: monthly,
      totalLumpsumInvestment: lumpsum,
      totalCombinedInvestment: totalCombined,
      monthly: {
        rupeeByCategory: monthlyPortfolioRupee,
        percentBlend: monthlyPercent,
      },
      lumpsum: {
        rupeeByCategory: lumpsumPortfolioRupee,
        percentBlend: lumpsumPercent,
      },
      combined: {
        rupeeByCategory: combinedPortfolioRupee,
        percentBlend: combinedPercent,
      },
      rupeeByCategory: combinedPortfolioRupee,
      percentBlend: combinedPercent,
    },
    portfolioMetrics,
    projections: goalsWithRupee.map((g) => ({
      goalName: g.goalName,
      horizonYears: g.horizonYears,
      series: g.projections,
      successRatio: g.successRatio,
      goalStatus: g.goalStatus,
      inflatedTarget: g.inflatedTarget,
      projectedValue: g.projectedValue,
    })),
    warnings,
    meta: {
      monthlyIncome: Number(input.monthlyIncome) || 0,
      monthlyInvestment: monthly,
      lumpsumInvestment: lumpsum,
    },
    investmentMode: 'goal_based',
    hasGoals: true,
  };
}
