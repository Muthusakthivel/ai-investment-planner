/**
 * Central configuration for the allocation engine.
 * All numeric rules live here — the engine reads from this object only.
 */

export const BUCKETS = ['Equity', 'MutualFunds', 'Debt', 'Bonds', 'Gold'];
export const MONTHLY_BUCKETS = ['Equity', 'MutualFunds', 'Debt', 'Gold'];
export const LUMPSUM_BUCKETS = ['Equity', 'MutualFunds', 'Bonds', 'Debt', 'Gold'];

export const allocationConfig = {
  ageScore: {
    under30: { maxExclusive: 30, delta: 2 },
    between30_45: { minInclusive: 30, maxInclusive: 45, delta: 1 },
    over45: { minExclusive: 45, delta: -1 },
  },
  riskAppetiteScore: {
    High: 3,
    Medium: 1,
    Low: -2,
  },
  incomeStabilityScore: {
    Stable: 2,
    Unstable: -2,
  },
  /** Applied once if any goal has horizon <= shortTermMaxYears */
  shortTermGoalPenalty: -3,
  shortTermMaxYears: 3,

  profileThresholds: {
    aggressiveMin: 5,
    moderateMin: 2,
  },

  horizon: {
    shortMaxExclusive: 4,
    midMinInclusive: 4,
    midMaxInclusive: 7,
    /** long: > midMaxInclusive */
  },

  /** Base allocation by horizon class (must sum to 100 per row) */
  baseAllocation: {
    short: {
      Equity: 0,
      MutualFunds: 20,
      Debt: 40,
      Bonds: 30,
      Gold: 10,
    },
    mid: {
      Equity: 25,
      MutualFunds: 30,
      Debt: 20,
      Bonds: 25,
      Gold: 0,
    },
    long: {
      Equity: 65,
      MutualFunds: 15,
      Debt: 0,
      Bonds: 10,
      Gold: 10,
    },
  },

  /** Monthly SIP allocation by horizon (Bonds excluded by design). */
  monthlyBaseAllocation: {
    short: {
      Equity: 0,
      MutualFunds: 20,
      Debt: 70,
      Gold: 10,
    },
    mid: {
      Equity: 30,
      MutualFunds: 35,
      Debt: 25,
      Gold: 10,
    },
    long: {
      Equity: 65,
      MutualFunds: 20,
      Debt: 5,
      Gold: 10,
    },
  },

  /** Lumpsum profile allocation (must sum to 100; includes Bonds). */
  lumpsumByProfile: {
    Aggressive: {
      Equity: 40,
      MutualFunds: 20,
      Bonds: 25,
      Gold: 10,
      Debt: 5,
    },
    Moderate: {
      Equity: 25,
      MutualFunds: 20,
      Bonds: 30,
      Debt: 15,
      Gold: 10,
    },
    Conservative: {
      Bonds: 40,
      Debt: 25,
      Gold: 15,
      MutualFunds: 10,
      Equity: 10,
    },
  },

  /** Short-term (<=3y) lumpsum shifts further toward stability and capital preservation. */
  shortTermLumpsumByProfile: {
    Aggressive: {
      Bonds: 45,
      Debt: 30,
      Gold: 15,
      Equity: 5,
      MutualFunds: 5,
    },
    Moderate: {
      Bonds: 48,
      Debt: 32,
      Gold: 15,
      Equity: 3,
      MutualFunds: 2,
    },
    Conservative: {
      Bonds: 50,
      Debt: 35,
      Gold: 15,
      Equity: 0,
      MutualFunds: 0,
    },
  },

  /** Deltas before renormalize; Moderate = zero object */
  riskAdjustmentDeltas: {
    Aggressive: { Equity: 10, Bonds: -5, Debt: -5, MutualFunds: 0, Gold: 0 },
    Moderate: { Equity: 0, MutualFunds: 0, Debt: 0, Bonds: 0, Gold: 0 },
    Conservative: {
      /** +15% Bonds, +10% Debt → funded from Equity then MF */
      bondsExtra: 15,
      debtExtra: 10,
    },
  },

  /** Age > 45: total +10% to Bonds+Debt, split */
  ageOver45BondsDebtBoost: {
    totalPercent: 10,
    bondsShare: 0.5,
    debtShare: 0.5,
  },
  ageOver45Threshold: 45,

  /** Unstable income: shift toward Bonds */
  unstableIncomeBondsShift: 8,

  /** Short-term goals: max Equity % — keep very low to prioritize fixed income */
  shortTermEquityCap: 5,

  /** Conservative: Bonds + Debt minimum */
  conservativeBondsDebtFloor: 50,

  normalizeTolerance: 0.01,

  /** When user has no goals, allocation & SIP chart use this horizon (general wealth build-up). */
  defaultHorizonWhenNoGoals: 10,

  /** Expected annual returns by bucket (for weighted SIP projections) */
  expectedReturnsAnnual: {
    Equity: 0.12,
    MutualFunds: 0.1,
    Debt: 0.06,
    Bonds: 0.07,
    Gold: 0.065,
  },

  /** Inflation for real target: inflatedTarget = target * (1 + inflation)^years */
  inflationRate: 0.06,

  /** Scenario rates for conservative / aggressive projection bands */
  scenarioRates: {
    conservative: 0.06,
    aggressive: 0.12,
  },

  /** Dynamic tweak when goal feasibility is low / high (percentage points on Equity) */
  dynamicAdjust: {
    /** successRatio < 0.7: add this many points to Equity from Bonds+Debt */
    equityBoostPoints: 7.5,
    /** successRatio > 1.2: remove this many points from Equity to Bonds+Debt */
    equityReducePoints: 5,
  },

  /** Goal-first safe instrument prioritization */
  /** Keywords in goal name (case-insensitive) → high priority (house, marriage, education) */
  criticalGoalKeywords: ['house', 'marriage', 'education'],
  /** Short-term = horizon ≤ this (years) → safe-first allocation */
  shortTermYearsForSafeFirst: 3,
  /** Safe vs growth split for short-term goals by profile (% of total; safe + growth = 100) */
  safeFirstByProfile: {
    Aggressive: { safe: 70, growth: 30 },
    Moderate: { safe: 80, growth: 20 },
    Conservative: { safe: 90, growth: 10 },
  },
  /** Within safe bucket: share of each instrument (% of safe; sum = 100) */
  safeBucketInstrumentShare: {
    rd: 35,
    fd: 25,
    bonds: 25,
    debt: 15,
  },
  /** Monthly SIP safe-bucket split (Bonds intentionally excluded). */
  /** Monthly SIP safe-bucket split (Bonds intentionally excluded).
   * FD is not treated as a monthly SIP instrument — it's bond-like and used for lumpsum.
   */
  monthlySafeBucketInstrumentShare: {
    rd: 60,
    debt: 40,
  },
  /** Within growth bucket: share of each (% of growth; sum = 100) */
  growthBucketInstrumentShare: {
    equity: 70,
    mutualFunds: 30,
  },
  /** High-priority short-term: max equity as % of total allocation */
  highPriorityEquityCapTotal: 10,
  /** How to split Debt bucket into rd/fd/debt for instrument display (% of Debt bucket).
   * For monthly/SIP view, FD receives 0% (not monthly). FD remains available for lumpsum.
   */
  debtBucketToInstruments: { rd: 50, fd: 0, debt: 50 },

  /**
   * Wealth creation mode: age-based base allocations when user has no goals.
   * totalEquityMf = direct equity + MF combined %. All three columns sum to 100.
   */
  wealthCreationByAge: {
    under30:      { totalEquityMf: 80, debt: 15, gold: 5  },
    between30_45: { totalEquityMf: 70, debt: 20, gold: 10 },
    over45:       { totalEquityMf: 55, debt: 32, gold: 13 },
  },

  /** Split total equity+MF into direct equity vs mutual funds by risk appetite. */
  equityMfSplitByRisk: {
    High:   { directShare: 0.55, mfShare: 0.45 },
    Medium: { directShare: 0.44, mfShare: 0.56 },
    Low:    { directShare: 0.26, mfShare: 0.74 },
  },

  /** Maximum Gold % allowed per age group. */
  goldMaxByAge: {
    under30:      5,
    between30_45: 10,
    over45:       15,
  },

  /** Minimum Debt % enforced for every allocation (safety floor). */
  minDebtPercent: 5,
};
