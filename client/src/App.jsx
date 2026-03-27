import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { computeAllocation } from '@services/allocationEngine.js';
import { RiskIndicator } from './components/RiskIndicator.jsx';
import { PortfolioInsights } from './components/PortfolioInsights.jsx';
import { GoalCardEnhanced } from './components/GoalCardEnhanced.jsx';
import { DefaultPortfolioPanel } from './components/DefaultPortfolioPanel.jsx';
import { sampleAggressive, sampleConservative } from './data/sampleData.js';
import { formatEnIN, parseMoneyDigits } from './utils/moneyFormat.js';

const BUCKET_LABELS = {
  Equity: 'Equity',
  MutualFunds: 'Mutual Funds',
  Debt: 'Debt',
  Bonds: 'Bonds',
  Gold: 'Gold',
};
const BUCKET_KEYS = Object.keys(BUCKET_LABELS);

const BUCKET_ACCENT = {
  Equity: 'bg-[linear-gradient(180deg,rgba(0,196,180,0.08),rgba(255,255,255,0.02))] shadow-[0_22px_44px_rgba(5,13,26,0.2)]',
  MutualFunds: 'bg-[linear-gradient(180deg,rgba(242,202,80,0.08),rgba(255,255,255,0.02))] shadow-[0_22px_44px_rgba(5,13,26,0.2)]',
  Debt: 'bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] shadow-[0_22px_44px_rgba(5,13,26,0.16)]',
  Bonds: 'bg-[linear-gradient(180deg,rgba(212,175,55,0.10),rgba(255,255,255,0.02))] shadow-[0_22px_44px_rgba(5,13,26,0.2)]',
  Gold: 'bg-[linear-gradient(180deg,rgba(242,202,80,0.12),rgba(255,255,255,0.02))] shadow-[0_22px_44px_rgba(5,13,26,0.2)]',
};

const PROFILE_RING = {
  Aggressive: 'from-[#1d2f33] via-[#182431] to-transparent text-[#f2ca50]',
  Moderate: 'from-[#1a2734] via-[#142130] to-transparent text-[#f1e6bf]',
  Conservative: 'from-[#15252a] via-[#13202d] to-transparent text-[#7fddd4]',
};

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const apiBase = import.meta.env.VITE_API_URL || '';

function LogoMark() {
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-[10px] bg-[linear-gradient(135deg,rgba(242,202,80,0.18),rgba(0,196,180,0.08))] shadow-[0_18px_38px_rgba(5,13,26,0.28)]">
      <svg className="h-6 w-6 text-[#f2ca50]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
        />
      </svg>
    </div>
  );
}

export default function App() {
  const [age, setAge] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlyInvestment, setMonthlyInvestment] = useState(0);
  const [lumpsumInvestment, setLumpsumInvestment] = useState(0);
  const [incomeStability, setIncomeStability] = useState('');
  const [riskAppetite, setRiskAppetite] = useState('Medium');
  const [goals, setGoals] = useState([]);


  /** Which money field is focused — show raw digits while editing */
  const [moneyFocus, setMoneyFocus] = useState(null);
  const goalScrollRef = useRef(null);
  const prevGoalLen = useRef(0);

  useEffect(() => {
    if (goals.length > prevGoalLen.current) {
      requestAnimationFrame(() => {
        goalScrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }
    prevGoalLen.current = goals.length;
  }, [goals.length]);

  const result = useMemo(() => {
    return computeAllocation({
      age: age === '' ? undefined : Number(age),
      monthlyIncome: Number(monthlyIncome) || 0,
      monthlyInvestment: Number(monthlyInvestment) || 0,
      lumpsumInvestment: Number(lumpsumInvestment) || 0,
      incomeStability,
      riskAppetite,
      goals: goals.map((g) => ({
        name: g.name,
        targetAmount:
          g.targetAmount === '' || g.targetAmount == null
            ? 0
            : Number(g.targetAmount) || 0,
        horizonYears: g.horizonYears === '' ? 0 : Number(g.horizonYears) || 0,
      })),
    });
  }, [age, monthlyIncome, monthlyInvestment, lumpsumInvestment, incomeStability, riskAppetite, goals]);

  const addGoal = () => {
    setGoals((g) => [
      ...g,
      { id: uid(), name: '', targetAmount: 0, horizonYears: 5 },
    ]);
  };

  const removeGoal = (id) => {
    setGoals((g) => g.filter((x) => x.id !== id));
  };

  const updateGoal = (id, field, value) => {
    setGoals((g) => g.map((x) => (x.id === id ? { ...x, [field]: value } : x)));
  };

  const loadSample = useCallback((preset) => {
    setAge(preset.age);
    setMonthlyIncome(preset.monthlyIncome);
    setMonthlyInvestment(preset.monthlyInvestment);
    setLumpsumInvestment(preset.lumpsumInvestment ?? 0);
    setIncomeStability(preset.incomeStability);
    setRiskAppetite(preset.riskAppetite);
    setGoals(
      preset.goals.map((g) => ({
        id: uid(),
        name: g.name,
        targetAmount: g.targetAmount,
        horizonYears: g.horizonYears,
      }))
    );

  }, []);



  const pct = result.portfolioSummary.combined?.percentBlend || result.portfolioSummary.percentBlend;
  const profileClass = PROFILE_RING[result.profile] || PROFILE_RING.Moderate;
  const hasGoals = goals.length > 0;
  const usesDefaultAllocation = Boolean(result.usesDefaultAllocation);
  const showInsights = hasGoals || usesDefaultAllocation;
  const monthlySip = Number(monthlyInvestment) || 0;
  const lumpsumAmount = Number(lumpsumInvestment) || 0;
  const hasMonthlySip = monthlySip > 0;
  const hasLumpsum = lumpsumAmount > 0;
  const hasAnyInvestment = hasMonthlySip || hasLumpsum;
  const snapshotKeys = hasLumpsum ? BUCKET_KEYS : BUCKET_KEYS.filter((k) => k !== 'Bonds');

  return (
    <div className="min-h-screen pb-32 text-[#eef3f9]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[rgba(11,20,33,0.72)] backdrop-blur-[20px]">
        <div className="mx-auto flex max-w-[88rem] flex-wrap items-center justify-between gap-6 px-5 py-5 md:px-10 xl:px-16">
          <div className="flex items-center gap-4">
            <LogoMark />
            <div>
              <p className="editorial-eyebrow mb-1">The Sovereign Terminal</p>
              <h1 className="font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                <span className="gradient-text">AI</span>{' '}
                <span className="text-white">Investment Planner</span>
              </h1>
              <p className="mt-1 text-xs font-medium text-[#b8c8dc] sm:text-sm">
                Private-wealth allocation intelligence with real-time scenario framing
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => loadSample(sampleAggressive)}
              className="btn-pill border border-white/10 bg-[rgba(255,255,255,0.02)] text-[#eef3f9] hover:bg-[rgba(255,255,255,0.05)]"
            >
              Try aggressive
            </button>
            <button
              type="button"
              onClick={() => loadSample(sampleConservative)}
              className="btn-pill border border-white/10 bg-[rgba(255,255,255,0.02)] text-[#eef3f9] hover:bg-[rgba(255,255,255,0.05)]"
            >
              Try conservative
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[88rem] space-y-24 px-5 py-12 md:px-10 xl:px-16">
        {/* Profile */}
        <section className="animate-fade-in-up">
          <div className="mb-12 max-w-4xl">
            <p className="editorial-eyebrow mb-3">Investor Profile</p>
            <h2 className="section-title">Build your profile</h2>
            <p className="section-sub">
              Shape your personal capital posture first. The terminal recalibrates instantly as you move between income quality, liquidity, and risk.
            </p>
          </div>
          <div className="grid gap-8 xl:grid-cols-[1.08fr_0.92fr]">
            <div className="glass-panel-hover p-7 sm:p-10">
              <div className="mb-8 flex items-center gap-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[rgba(0,196,180,0.12)] text-sm font-bold text-[#7fddd4]">
                  1
                </span>
                <div>
                  <p className="editorial-eyebrow mb-1">Foundation</p>
                  <h3 className="font-display text-xl font-semibold text-white">Capital Inputs</h3>
                  <p className="text-xs text-[#b8c8dc]">Age, income quality, recurring and one-time deployable capital</p>
                </div>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <label>
                  <span className="label-modern">Age</span>
                  <input
                    type="number"
                    min={18}
                    max={100}
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="Your age"
                    className="input-modern input-no-spin"
                  />
                </label>
                <label>
                  <span className="label-modern">Monthly income (₹)</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={
                      moneyFocus === 'inc'
                        ? monthlyIncome === 0
                          ? ''
                          : String(monthlyIncome)
                        : formatEnIN(monthlyIncome) || (monthlyIncome === 0 ? '' : String(monthlyIncome))
                    }
                    onFocus={() => setMoneyFocus('inc')}
                    onBlur={() => setMoneyFocus(null)}
                    onChange={(e) => setMonthlyIncome(parseMoneyDigits(e.target.value))}
                    placeholder="e.g. 80,000"
                    className="input-modern tabular-nums"
                  />
                </label>
                <label className="sm:col-span-2">
                  <span className="label-modern">Monthly investment (₹)</span>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      value={
                        moneyFocus === 'inv'
                          ? monthlyInvestment === 0
                            ? ''
                            : String(monthlyInvestment)
                          : formatEnIN(monthlyInvestment) ||
                          (monthlyInvestment === 0 ? '' : String(monthlyInvestment))
                      }
                      onFocus={() => setMoneyFocus('inv')}
                      onBlur={() => setMoneyFocus(null)}
                      onChange={(e) =>
                        setMonthlyInvestment(parseMoneyDigits(e.target.value))
                      }
                      placeholder="e.g. 20,000"
                      className="input-modern pr-24 font-semibold tabular-nums text-[#7fddd4]"
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-[#9fb1c5]">
                    Update anytime. Allocation posture and scenario projections reprice immediately.
                  </p>
                </label>
                <label className="sm:col-span-2">
                  <span className="label-modern">Lumpsum investment amount (₹) · optional</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={
                      moneyFocus === 'lumpsum'
                        ? lumpsumInvestment === 0
                          ? ''
                          : String(lumpsumInvestment)
                        : formatEnIN(lumpsumInvestment) ||
                        (lumpsumInvestment === 0 ? '' : String(lumpsumInvestment))
                    }
                    onFocus={() => setMoneyFocus('lumpsum')}
                    onBlur={() => setMoneyFocus(null)}
                    onChange={(e) => setLumpsumInvestment(parseMoneyDigits(e.target.value))}
                    placeholder="e.g. 2,00,000"
                    className="input-modern font-semibold tabular-nums text-[#f2ca50]"
                  />
                  <p className="mt-1.5 text-[11px] text-[#9fb1c5]">
                    One-time capital unlocks the stability sleeve. Leave blank to remain fully SIP-led.
                  </p>
                </label>
                <label className="sm:col-span-2">
                  <span className="label-modern">Income stability</span>
                  <select
                    value={incomeStability}
                    onChange={(e) => setIncomeStability(e.target.value)}
                    className="input-modern select-modern text-slate-300"
                  >
                    <option value="">Select stability</option>
                    <option value="Stable">Stable</option>
                    <option value="Unstable">Unstable</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="glass-panel-hover p-7 sm:p-10">
              <div className="mb-8 flex items-center gap-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[rgba(242,202,80,0.12)] text-sm font-bold text-[#f2ca50]">
                  2
                </span>
                <div>
                  <p className="editorial-eyebrow mb-1">Mandates</p>
                  <h3 className="font-display text-xl font-semibold text-white">Goals and risk posture</h3>
                  <p className="text-xs text-[#b8c8dc]">Target timelines, urgency, and long-range wealth intent</p>
                </div>
              </div>
              <label className="mb-5 block">
                <span className="label-modern">Risk appetite</span>
                <div className="grid grid-cols-3 gap-2">
                  {['Low', 'Medium', 'High'].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRiskAppetite(r)}
                      className={`rounded-[6px] py-2.5 text-xs font-bold transition-all duration-200 ${riskAppetite === r
                          ? 'bg-[linear-gradient(135deg,#f2ca50,#d4af37)] text-[#08101a] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]'
                          : 'bg-[rgba(255,255,255,0.02)] text-[#b8c8dc] hover:bg-[rgba(255,255,255,0.05)] hover:text-[#eef3f9]'
                        }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </label>
              <div className="mb-3 flex items-center justify-between">
                <span className="label-modern mb-0">Your goals</span>
                <button
                  type="button"
                  onClick={addGoal}
                  className="text-xs font-bold text-[#7fddd4] transition-colors hover:text-white"
                >
                  + Add goal
                </button>
              </div>
              {goals.length === 0 ? (
                <div className="rounded-[12px] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] px-6 py-12 text-center shadow-[0_26px_48px_rgba(5,13,26,0.18)]">
                  <p className="text-sm font-medium text-[#d8e1ed]">
                    No goals yet
                  </p>
                  <p className="mt-3 text-xs leading-relaxed text-[#b8c8dc]">
                    Add one or more goals (name, target amount, years). Your suggested split and
                    charts appear here.
                  </p>
                  <button
                    type="button"
                    onClick={addGoal}
                    className="btn-pill mt-6 bg-[linear-gradient(135deg,#f2ca50,#d4af37)] px-5 py-2.5 text-sm font-bold text-[#08101a] shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]"
                  >
                    + Add your first goal
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-[11px] text-slate-500">
                    {goals.length} goal{goals.length !== 1 ? 's' : ''} — all shown below
                  </p>
                  {goals.map((g, gi) => (
                    <div
                      key={g.id}
                      ref={gi === goals.length - 1 ? goalScrollRef : undefined}
                      className="metric-surface rounded-[12px] p-4 transition-all duration-200 hover:bg-[rgba(255,255,255,0.045)]"
                    >
                      <div className="mb-3 flex gap-2">
                        <input
                          value={g.name}
                          onChange={(e) => updateGoal(g.id, 'name', e.target.value)}
                          placeholder="Goal name"
                          className="input-modern flex-1 py-2.5 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => removeGoal(g.id)}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] bg-[rgba(255,255,255,0.03)] text-[#9fb1c5] transition-colors hover:bg-[rgba(255,255,255,0.06)] hover:text-[#f2ca50]"
                          aria-label="Remove goal"
                        >
                          <svg
                            className="h-3.5 w-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                            aria-hidden
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                            ₹
                          </span>
                          <input
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            value={
                              moneyFocus === `gt-${g.id}`
                                ? (g.targetAmount === 0 || g.targetAmount === ''
                                  ? ''
                                  : String(Number(g.targetAmount) || 0))
                                : formatEnIN(g.targetAmount) ||
                                (g.targetAmount === 0 || g.targetAmount === ''
                                  ? ''
                                  : String(g.targetAmount))
                            }
                            onFocus={() => setMoneyFocus(`gt-${g.id}`)}
                            onBlur={() => setMoneyFocus(null)}
                            onChange={(e) =>
                              updateGoal(g.id, 'targetAmount', parseMoneyDigits(e.target.value))
                            }
                            placeholder="Target amount"
                            className="input-modern py-2.5 pl-7 text-sm tabular-nums"
                          />
                        </div>
                        <input
                          type="number"
                          min={0}
                          step={0.5}
                          value={g.horizonYears === '' ? '' : g.horizonYears}
                          onChange={(e) => updateGoal(g.id, 'horizonYears', e.target.value)}
                          placeholder="Years"
                          className="input-modern input-no-spin py-2.5 text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Portfolio summary */}
        <section>
          <div className="mb-12 max-w-4xl">
            <p className="editorial-eyebrow mb-3">Portfolio Intelligence</p>
            <h2 className="section-title">Portfolio snapshot</h2>
            <p className="section-sub">
              {!hasAnyInvestment
                ? 'Enter SIP and/or lumpsum in Basics — allocation, returns, and success score update live from your inputs.'
                : hasGoals
                  ? 'Combined view across goals, with SIP and one-time allocations shown separately.'
                  : 'Suggested mix for your profile using a 10-year default horizon until you add goals.'}
            </p>
          </div>
          <div className="glass-panel overflow-hidden p-7 sm:p-10">
            <PortfolioInsights
              profile={result.profile}
              riskIndicator={result.riskIndicator}
              portfolioMetrics={result.portfolioMetrics}
              visible={showInsights}
              hasInvestment={hasAnyInvestment}
            />
            <div className="mb-8 grid gap-6 lg:grid-cols-12 lg:items-stretch">
              <div
                className={`lg:col-span-4 rounded-[12px] bg-gradient-to-br p-6 shadow-[0_30px_54px_rgba(5,13,26,0.2)] ${profileClass}`}
              >
                <p className="editorial-eyebrow text-white/45">
                  Risk profile
                </p>
                <p className="font-display mt-3 text-3xl font-semibold text-white">
                  {result.profile}
                </p>
                <p className="mt-2 text-sm text-white/58">Engine score: {result.score}</p>
                <p className="mt-8 font-display text-2xl font-semibold text-white">
                  ₹{result.portfolioSummary.totalMonthlyInvestment.toLocaleString('en-IN')}
                  <span className="text-sm font-normal text-white/50">/mo</span>
                </p>
                <p className="mt-1 text-xs text-white/45">Monthly SIP allocation</p>
                <p className="mt-4 font-display text-xl font-semibold text-[#f2ca50]">
                  ₹{(result.portfolioSummary.totalLumpsumInvestment || 0).toLocaleString('en-IN')}
                </p>
                <p className="text-xs text-white/45">One-time lumpsum allocation</p>
                {!hasAnyInvestment && (
                  <p className="mt-4 rounded-[8px] bg-[rgba(242,202,80,0.12)] px-3 py-2 text-xs text-[#f6e8bb]">
                    Add SIP and/or lumpsum above to preview allocation and charts.
                  </p>
                )}
              </div>
              <div className="lg:col-span-8">
                <RiskIndicator level={result.riskIndicator} />
              </div>
            </div>
            <p className="editorial-eyebrow mb-4">
              Allocation mix{' '}
              {!hasAnyInvestment
                ? '(enter SIP or lumpsum to preview)'
                : hasGoals
                  ? '(combined SIP + lumpsum by ₹ weight across goals)'
                  : '(default combined mix)'}
            </p>
            <div className="stagger-children grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {snapshotKeys.map((k) => (
                <div
                  key={k}
                  className={`rounded-[12px] py-4 pl-4 pr-3 transition-transform duration-300 hover:scale-[1.01] ${BUCKET_ACCENT[k]} ${!hasAnyInvestment ? 'opacity-70' : ''}`}
                >
                  <p className="editorial-eyebrow">
                    {BUCKET_LABELS[k]}
                  </p>
                  <p className="font-display mt-2 text-2xl font-semibold text-white">
                    {hasAnyInvestment ? `${pct[k]?.toFixed(1) ?? 0}%` : '—'}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-[#7fddd4]">
                    {hasAnyInvestment
                      ? `₹${result.portfolioSummary.combined?.rupeeByCategory[k]?.toLocaleString('en-IN') ?? 0}`
                      : '₹0'}
                  </p>
                </div>
              ))}
            </div>

            {usesDefaultAllocation && result.defaultPlan && hasMonthlySip && (
              <DefaultPortfolioPanel
                defaultPlan={result.defaultPlan}
                totalMonthly={result.portfolioSummary.totalMonthlyInvestment}
              />
            )}
          </div>
        </section>

        {/* Goals */}
        <section>
          <div className="mb-12 max-w-4xl">
            <p className="editorial-eyebrow mb-3">Mandated Allocations</p>
            <h2 className="section-title">By goal</h2>
            <p className="section-sub">
              Each goal gets its own mix, large SIP chart, and suggestions. Add multiple goals — layout
              stacks full width for clarity.
            </p>
          </div>
          {!hasGoals ? (
            <div className="rounded-[12px] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] px-6 py-14 text-center sm:py-16">
              <p className="font-display text-2xl font-semibold text-[#e7edf6]">Optional: add goals</p>
              <p className="mx-auto mt-3 max-w-lg text-sm text-[#b8c8dc]">
                {hasMonthlySip
                  ? 'Your default allocation and SIP growth chart are above. Add named goals to split your monthly amount by target and get per-goal feasibility.'
                  : 'Enter monthly investment in Basics first to see allocation preview and charts. Then add goals to split your SIP by target.'}
              </p>
              <button
                type="button"
                onClick={addGoal}
                className="btn-pill mt-8 bg-[linear-gradient(135deg,#f2ca50,#d4af37)] px-6 py-2.5 text-sm font-bold text-[#08101a] shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]"
              >
                + Add first goal
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-10 lg:gap-12">
              {!hasMonthlySip && (
                <div className="rounded-[10px] bg-[rgba(0,196,180,0.12)] px-4 py-3 text-sm text-[#c8faf5]">
                  Enter <strong className="text-cyan-200">monthly SIP (₹)</strong> for growth charts,
                  and <strong className="text-amber-200">lumpsum (₹)</strong> for one-time allocation with bonds.
                </div>
              )}
              {result.goals.map((g, idx) => {
                const horizonLabel =
                  g.horizonClass === 'short'
                    ? 'Short-term'
                    : g.horizonClass === 'mid'
                      ? 'Mid-term'
                      : 'Long-term';
                const horizonColor =
                  g.horizonClass === 'short'
                    ? 'bg-sky-500/15 text-sky-200 ring-sky-400/30'
                    : g.horizonClass === 'mid'
                      ? 'bg-violet-500/15 text-violet-200 ring-violet-400/30'
                      : 'bg-emerald-500/15 text-emerald-200 ring-emerald-400/30';

                return (
                  <GoalCardEnhanced
                    key={`goal-${idx}-${g.goalName}`}
                    g={g}
                    goalIndex={idx}
                    goalCount={result.goals.length}
                    horizonLabel={horizonLabel}
                    horizonColor={horizonColor}
                    hasMonthlySip={hasMonthlySip}
                    hasLumpsum={hasLumpsum}
                  />
                );
              })}
            </div>
          )}
        </section>

      </main>

      <footer className="fixed bottom-0 left-0 right-0 z-20 bg-[rgba(11,20,33,0.84)] py-4 backdrop-blur-[20px]">
        <p className="mx-auto max-w-4xl px-4 text-center text-[11px] leading-relaxed text-[#9fb1c5] sm:text-xs">
          <span className="font-semibold text-[#f2ca50]">Disclaimer:</span> This is an AI-powered
          educational tool and not financial advice. Consult a SEBI-registered advisor before
          investing.
        </p>
      </footer>
    </div>
  );
}
