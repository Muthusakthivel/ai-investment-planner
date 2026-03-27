import { useState } from 'react';
import { GoalPieChart } from './GoalPieChart.jsx';
import { SIPProjectionChart } from './SIPProjectionChart.jsx';
import { SuggestionsPanel } from './SuggestionsPanel.jsx';
import { buildSuggestionsForGoal } from '@services/suggestionEngine.js';

const BUCKET_LABELS = {
  Equity: 'Equity',
  MutualFunds: 'Mutual Funds',
  Debt: 'Debt',
  Bonds: 'Bonds',
  Gold: 'Gold',
};
const BUCKET_KEYS = Object.keys(BUCKET_LABELS);

const INSTRUMENT_LABELS = {
  rd: 'RD (Recurring Deposit)',
  fd: 'FD (Fixed Deposit)',
  bonds: 'Bonds',
  debt: 'Debt funds',
  equity: 'Equity',
  mutualFunds: 'Mutual Funds',
};
const INSTRUMENT_KEYS_ORDER = ['rd', 'fd', 'bonds', 'debt', 'equity', 'mutualFunds'];

function statusStyles(status) {
  if (status === 'On Track')
    return {
      badge: 'bg-emerald-500/20 text-emerald-200 ring-emerald-400/40',
      bar: 'bg-gradient-to-r from-emerald-500 to-teal-400',
    };
  if (status === 'Needs Improvement')
    return {
      badge: 'bg-amber-500/20 text-amber-100 ring-amber-400/35',
      bar: 'bg-gradient-to-r from-amber-500 to-yellow-400',
    };
  return {
    badge: 'bg-rose-500/20 text-rose-200 ring-rose-400/35',
    bar: 'bg-gradient-to-r from-rose-500 to-orange-500',
  };
}

export function GoalCardEnhanced({
  g,
  horizonLabel,
  horizonColor,
  goalIndex,
  goalCount,
  hasMonthlySip = true,
  hasLumpsum = false,
}) {
  const styles = statusStyles(g.goalStatus);
  const inflated = Number(g.inflatedTarget) || 0;
  const projected = Number(g.projectedValue) || 0;
  const progress =
    inflated > 0 ? Math.min(100, Math.round((projected / inflated) * 100)) : projected > 0 ? 100 : 0;

  const suggestions = hasMonthlySip ? buildSuggestionsForGoal(g) : [];
  const monthlyKeys = ['Equity', 'MutualFunds', 'Debt', 'Gold'];
  const [advanced, setAdvanced] = useState(() => {
    const eq = Number(g.monthlyAllocationPercent?.Equity || 0);
    const mf = Number(g.monthlyAllocationPercent?.MutualFunds || 0);
    return eq > 0 || mf > 0;
  });

  return (
    <article className="glass-panel-hover flex flex-col overflow-hidden rounded-[12px]">
      {/* Header */}
      <div className="bg-[linear-gradient(135deg,rgba(255,255,255,0.035),rgba(255,255,255,0.015))] px-5 py-5 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {goalCount > 1 && (
                <span className="rounded-[6px] bg-[rgba(255,255,255,0.04)] px-2 py-0.5 font-mono text-[10px] font-bold text-[#b8c8dc]">
                  {goalIndex + 1}/{goalCount}
                </span>
              )}
              <h3 className="font-display text-2xl font-semibold text-white sm:text-3xl">{g.goalName}</h3>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${horizonColor}`}
              >
                {horizonLabel}
              </span>
              <span className="text-sm text-[#b8c8dc]">{g.horizonYears} years</span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${hasMonthlySip ? styles.badge : 'bg-slate-500/15 text-slate-400 ring-slate-500/25'}`}
              >
                {hasMonthlySip ? g.goalStatus : 'Awaiting SIP'}
              </span>
            </div>
          </div>
          <div className="rounded-[10px] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] px-4 py-4 text-right shadow-[0_20px_36px_rgba(5,13,26,0.16)]">
            <p className="editorial-eyebrow">
              Goal contribution
            </p>
            <p className="font-display text-2xl font-semibold text-[#7fddd4]">
              {hasMonthlySip ? `₹${(g.monthlyShare || 0).toLocaleString('en-IN')}` : '—'}
              <span className="text-sm font-normal text-[#9fb1c5]">/mo SIP</span>
            </p>
            <p className="mt-2 text-sm font-semibold text-[#f2ca50]">
              {hasLumpsum ? `₹${(g.lumpsumInvestmentAllocated || 0).toLocaleString('en-IN')}` : '—'}
              <span className="text-[11px] font-normal text-[#9fb1c5]"> one-time</span>
            </p>
          </div>
        </div>
        <div className="mt-5">
          {hasMonthlySip ? (
            <>
              <div className="mb-1.5 flex flex-wrap justify-between gap-2 text-sm">
                <span className="text-[#b8c8dc]">Projected vs inflation-adjusted target</span>
                <span className="tabular-nums text-[#dfe7f2]">
                  ₹{projected.toLocaleString('en-IN', { maximumFractionDigits: 0 })} / ₹
                  {inflated.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${styles.bar}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-[#b8c8dc]">
                Success ratio:{' '}
                <span className="font-semibold text-slate-300">
                  {g.successRatio != null ? (Number(g.successRatio) * 100).toFixed(1) : '—'}%
                </span>
                {' · '}
                Total invested over horizon: ₹
                {(g.totalInvestedAmount || 0).toLocaleString('en-IN')}
              </p>
            </>
          ) : (
            <p className="rounded-[8px] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm text-[#b8c8dc]">
              Feasibility and projections appear after you enter a monthly investment amount.
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-0">
        {/* Full-width chart — primary visual */}
        <div className="bg-[rgba(255,255,255,0.015)] px-4 py-6 sm:px-8 sm:py-8">
          <p className="editorial-eyebrow mb-4">
            SIP growth — conservative · expected · aggressive
          </p>
          <div className="min-h-[280px] w-full sm:min-h-[340px] md:min-h-[400px] lg:min-h-[440px]">
            {hasMonthlySip ? (
              <SIPProjectionChart
                projections={g.projections}
                goalLabel={g.goalName}
                size="large"
              />
            ) : (
              <div className="flex h-full min-h-[240px] items-center justify-center rounded-[10px] bg-[rgba(255,255,255,0.03)] px-6 text-center text-sm text-[#b8c8dc]">
                SIP growth curves load here once you set your monthly investment in Basics.
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-8 p-5 sm:gap-10 sm:p-8 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-5 xl:col-span-4">
            <p className="editorial-eyebrow mb-4">
              Monthly plan (SIP)
            </p>
            <GoalPieChart
              allocationPercent={g.monthlyAllocationPercent || {}}
              goalLabel={(g.goalName || 'Goal').slice(0, 22)}
              keys={monthlyKeys}
            />
          </div>
          <div className="lg:col-span-7 xl:col-span-8">
            <p className="editorial-eyebrow mb-4">
              Monthly SIP breakdown
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {monthlyKeys.map((k) => (
                <div
                  key={k}
                  className="metric-surface flex items-center justify-between rounded-[10px] px-4 py-3"
                >
                  <span className="text-sm text-[#cdd7e6]">{BUCKET_LABELS[k]}</span>
                  <span className="text-right">
                    <span className="font-display text-base font-semibold text-white">
                      {Number(g.monthlyAllocationPercent?.[k] || 0).toFixed(1)}%
                    </span>
                    <span className="ml-2 text-sm text-[#7fddd4]">
                      {hasMonthlySip ? `₹${(g.monthlyRupeeAllocation?.[k] || 0).toLocaleString('en-IN')}` : '—'}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mx-5 mb-6 rounded-[12px] bg-[linear-gradient(180deg,rgba(242,202,80,0.08),rgba(255,255,255,0.015))] p-5 sm:mx-8">
          <p className="editorial-eyebrow mb-4 text-[#f2ca50]/75">
            One-time investment plan (Lumpsum)
          </p>
          {hasLumpsum ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {BUCKET_KEYS.map((k) => (
                <div
                  key={`lumpsum-${k}`}
                  className="metric-surface flex items-center justify-between rounded-[10px] px-4 py-3"
                >
                  <span className="text-sm text-[#cdd7e6]">{BUCKET_LABELS[k]}</span>
                  <span className="text-right">
                    <span className="font-display text-base font-semibold text-white">
                      {Number(g.lumpsumAllocationPercent?.[k] || 0).toFixed(1)}%
                    </span>
                    <span className="ml-2 text-sm text-[#f2ca50]">
                      ₹{(g.lumpsumRupeeAllocation?.[k] || 0).toLocaleString('en-IN')}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-[8px] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-[#b8c8dc]">
              Add a lumpsum amount in Basics to unlock the one-time plan with bonds for stability.
            </p>
          )}
        </div>

        {(g.monthlySafeAllocationPercentage != null || g.monthlyGrowthAllocationPercentage != null) && (
          <div className="mx-5 mb-6 flex flex-wrap gap-6 rounded-[12px] bg-[linear-gradient(180deg,rgba(0,196,180,0.08),rgba(255,255,255,0.015))] px-5 py-4 sm:mx-8">
            <div className="flex items-center gap-3">
              <span className="editorial-eyebrow">
                SIP safe allocation
              </span>
              <span className="font-display text-xl font-semibold text-[#c8faf5]">
                {Number(g.monthlySafeAllocationPercentage ?? 0).toFixed(0)}%
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="editorial-eyebrow">
                SIP growth allocation
              </span>
              <span className="font-display text-xl font-semibold text-[#7fddd4]">
                {Number(g.monthlyGrowthAllocationPercentage ?? 0).toFixed(0)}%
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="editorial-eyebrow">
                Lumpsum safe allocation
              </span>
              <span className="font-display text-xl font-semibold text-[#f2ca50]">
                {Number(g.lumpsumSafeAllocationPercentage ?? 0).toFixed(0)}%
              </span>
            </div>
          </div>
        )}

        {g.instrumentAmountBreakdown && (
          <div className="mx-5 mb-6 rounded-[12px] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-5 sm:mx-8">
            <div className="mb-4 flex items-center justify-between">
              <p className="editorial-eyebrow">
                Recommended instruments
              </p>
              {(g.equityBreakdown || g.mutualFundBreakdown) && (
                <button
                  type="button"
                  onClick={() => setAdvanced((s) => !s)}
                  className="btn-pill border border-white/10 px-3 py-1 text-xs font-semibold text-[#d7e0eb] bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.05)]"
                >
                  {advanced ? 'Hide strategy' : 'Show strategy'}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {['rd', 'debt', 'equity', 'mutualFunds'].map((k) => {
                const amt = g.instrumentAmountBreakdown[k];
                if (amt == null && g.instrumentBreakdown?.[k] == null) return null;
                const val = Number(amt ?? 0);
                const pct = g.instrumentBreakdown?.[k];
                return (
                  <div
                    key={k}
                    className="metric-surface flex items-center justify-between rounded-[10px] px-4 py-3"
                  >
                    <span className="text-sm text-[#cdd7e6]">{INSTRUMENT_LABELS[k]}</span>
                    <span className="text-right">
                      {pct != null && (
                        <span className="mr-2 text-xs text-[#a8bace]">
                          {Number(pct).toFixed(0)}%
                        </span>
                      )}
                      <span className="font-display font-semibold text-white">
                        {hasMonthlySip ? `₹${(val || 0).toLocaleString('en-IN')}` : '—'}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>

            {advanced && g.equityBreakdown && (
              <>
                <p className="mt-6 mb-3 editorial-eyebrow text-[#7fddd4]">
                  Equity Strategy
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {['compounding', 'growth', 'multibagger'].map((k) => (
                    <div key={k} className="metric-surface flex items-center justify-between rounded-[10px] px-4 py-3">
                      <span className="text-sm text-[#cdd7e6]">{k.charAt(0).toUpperCase() + k.slice(1)}</span>
                      <span className="text-right">
                        <span className="mr-2 text-xs text-[#a8bace]">{Number(g.equityBreakdown[k] || 0).toFixed(0)}%</span>
                        <span className="font-display font-semibold text-white">
                          {hasMonthlySip ? `₹${(g.equityBreakdown.monthlyRupee?.[k] || 0).toLocaleString('en-IN')}` : '—'}
                          {hasLumpsum ? ` / ₹${(g.equityBreakdown.lumpsumRupee?.[k] || 0).toLocaleString('en-IN')}` : ''}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {advanced && g.mutualFundBreakdown && (
              <>
                <p className="mt-6 mb-3 editorial-eyebrow text-[#7fddd4]">
                  Mutual Fund Strategy
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
                  {['core', 'flexicap', 'global', 'thematic'].map((k) => (
                    <div key={k} className="metric-surface flex items-center justify-between rounded-[10px] px-4 py-3">
                      <span className="text-sm text-[#cdd7e6]">{k.charAt(0).toUpperCase() + k.slice(1)}</span>
                      <span className="text-right">
                        <span className="mr-2 text-xs text-[#a8bace]">{Number(g.mutualFundBreakdown[k] || 0).toFixed(0)}%</span>
                        <span className="font-display font-semibold text-white">
                          {hasMonthlySip ? `₹${(g.mutualFundBreakdown.monthlyRupee?.[k] || 0).toLocaleString('en-IN')}` : '—'}
                          {hasLumpsum ? ` / ₹${(g.mutualFundBreakdown.lumpsumRupee?.[k] || 0).toLocaleString('en-IN')}` : ''}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <div className="mx-5 mb-6 grid gap-3 rounded-[12px] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-5 sm:mx-8 sm:grid-cols-3">
          <div>
            <p className="editorial-eyebrow">Conservative (6%)</p>
            <p className="font-display text-lg font-semibold text-[#d6dde8]">
              {hasMonthlySip
                ? `₹${(g.conservativeValue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
                : '—'}
            </p>
          </div>
          <div>
            <p className="editorial-eyebrow text-[#7fddd4]">Expected</p>
            <p className="font-display text-lg font-semibold text-[#7fddd4]">
              {hasMonthlySip
                ? `₹${(g.projectedValue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
                : '—'}
            </p>
          </div>
          <div>
            <p className="editorial-eyebrow text-[#f2ca50]">Aggressive (12%)</p>
            <p className="font-display text-lg font-semibold text-[#f2ca50]">
              {hasMonthlySip
                ? `₹${(g.aggressiveValue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
                : '—'}
            </p>
          </div>
        </div>

        <div className="mx-5 mb-6 sm:mx-8">
          <SuggestionsPanel suggestions={suggestions} />
        </div>
      </div>

      
    </article>
  );
}
