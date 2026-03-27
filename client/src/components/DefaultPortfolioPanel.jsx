import { useState } from 'react';
import { GoalPieChart } from './GoalPieChart.jsx';
import { SIPProjectionChart } from './SIPProjectionChart.jsx';

const BUCKET_LABELS = {
  Equity: 'Equity',
  MutualFunds: 'Mutual Funds',
  Debt: 'Debt',
  Gold: 'Gold',
};
const BUCKET_KEYS = Object.keys(BUCKET_LABELS);

/**
 * Shown when user has no goals: full monthly SIP, default 10y horizon mix, large growth chart.
 */
export function DefaultPortfolioPanel({ defaultPlan, totalMonthly }) {
  if (!defaultPlan) return null;

  const hasEqOrMf =
    Number(defaultPlan.monthlyAllocationPercent?.Equity || defaultPlan.allocationPercent?.Equity || 0) > 0 ||
    Number(defaultPlan.monthlyAllocationPercent?.MutualFunds || defaultPlan.allocationPercent?.MutualFunds || 0) > 0;

  const [advanced, setAdvanced] = useState(hasEqOrMf);

  return (
    <div className="mt-14 space-y-8 pt-4">
      <div>
        <p className="editorial-eyebrow mb-3">Wealth Creation Mode</p>
        <h3 className="font-display text-2xl font-semibold text-white sm:text-3xl">
          SIP growth &amp; default mix
        </h3>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#b8c8dc]">
          No goals yet — the system enters <span className="text-[#dfe7f2]">wealth creation mode</span>{' '}
          and uses a <span className="text-[#dfe7f2]">10-year general wealth</span>{' '}
          horizon matching your risk profile. Add goals anytime to split your monthly amount by
          target and horizon.
        </p>
      </div>

      <div className="rounded-[12px] bg-[linear-gradient(180deg,rgba(0,196,180,0.06),rgba(255,255,255,0.015))] p-5 sm:p-7">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="editorial-eyebrow text-[#7fddd4]">
              Full monthly SIP — scenario curves
            </p>
            <p className="mt-2 font-display text-3xl font-semibold text-white">
              ₹{Number(totalMonthly || 0).toLocaleString('en-IN')}
              <span className="text-sm font-normal text-[#9fb1c5]">/mo</span>
              <span className="ml-3 text-sm font-normal text-[#9fb1c5]">
                · {defaultPlan.horizonYears} yr horizon
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-right text-sm">
            <div>
              <p className="editorial-eyebrow">Expected</p>
              <p className="font-semibold text-[#7fddd4]">
                ₹{(defaultPlan.projectedValue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div>
              <p className="editorial-eyebrow">Conservative</p>
              <p className="font-semibold text-[#d6dde8]">
                ₹{(defaultPlan.conservativeValue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div>
              <p className="editorial-eyebrow text-[#f2ca50]">Aggressive</p>
              <p className="font-semibold text-[#f2ca50]">
                ₹{(defaultPlan.aggressiveValue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
        </div>
        <div className="w-full">
          <SIPProjectionChart
            projections={defaultPlan.projections}
            goalLabel="Portfolio"
            size="large"
          />
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        <GoalPieChart
          allocationPercent={defaultPlan.monthlyAllocationPercent || defaultPlan.allocationPercent}
          goalLabel="Default mix"
          keys={BUCKET_KEYS}
        />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {BUCKET_KEYS.map((k) => (
            <div key={k} className="metric-surface flex items-center justify-between rounded-[10px] px-4 py-3">
              <span className="text-sm text-[#cdd7e6]">{BUCKET_LABELS[k]}</span>
              <span className="text-right">
                <span className="font-display text-lg font-semibold text-white">
                  {defaultPlan.allocationPercent[k]?.toFixed(1)}%
                </span>
                <span className="ml-2 text-sm text-[#7fddd4]">
                  ₹{defaultPlan.monthlyRupeeAllocation?.[k]?.toLocaleString('en-IN') ?? 0}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {(defaultPlan.equityBreakdown || defaultPlan.mutualFundBreakdown) && (
        <div className="rounded-[12px] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="advanced-strategy-badge">
              Advanced Strategy
            </p>
            <button
              type="button"
              onClick={() => setAdvanced((s) => !s)}
              className="btn-pill border border-white/10 px-3 py-1 text-xs font-semibold text-[#d7e0eb] bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.05)]"
            >
              {advanced ? 'Hide strategy' : 'Show strategy'}
            </button>
          </div>

          {advanced && defaultPlan.equityBreakdown && (
            <>
              <p className="mb-3 editorial-eyebrow text-[#7fddd4]">
                Equity Strategy
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {['compounding', 'growth', 'multibagger'].map((k) => (
                  <div key={k} className="metric-surface flex items-center justify-between rounded-[10px] px-4 py-3">
                    <span className="text-sm text-[#cdd7e6]">{k.charAt(0).toUpperCase() + k.slice(1)}</span>
                    <span className="text-right">
                      <span className="mr-2 text-xs text-[#a8bace]">{Number(defaultPlan.equityBreakdown[k] || 0).toFixed(0)}%</span>
                      <span className="font-display font-semibold text-white">
                        ₹{(defaultPlan.equityBreakdown.monthlyRupee?.[k] || 0).toLocaleString('en-IN')}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {advanced && defaultPlan.mutualFundBreakdown && (
            <>
              <p className="mt-6 mb-3 editorial-eyebrow text-[#7fddd4]">
                Mutual Fund Strategy
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
                {['core', 'flexicap', 'global', 'thematic'].map((k) => (
                  <div key={k} className="metric-surface flex items-center justify-between rounded-[10px] px-4 py-3">
                    <span className="text-sm text-[#cdd7e6]">{k.charAt(0).toUpperCase() + k.slice(1)}</span>
                    <span className="text-right">
                      <span className="mr-2 text-xs text-[#a8bace]">{Number(defaultPlan.mutualFundBreakdown[k] || 0).toFixed(0)}%</span>
                      <span className="font-display font-semibold text-white">
                        ₹{(defaultPlan.mutualFundBreakdown.monthlyRupee?.[k] || 0).toLocaleString('en-IN')}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
