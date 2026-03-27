/**
 * Portfolio-level metrics: risk badge, weighted expected return, success score.
 * Return / success numbers only when user has entered a monthly SIP.
 */
export function PortfolioInsights({
  profile,
  riskIndicator,
  portfolioMetrics,
  visible,
  hasInvestment,
}) {
  if (!visible) return null;

  const score = portfolioMetrics?.overallSuccessScore ?? 0;
  const wRet = (Number(portfolioMetrics?.weightedExpectedReturnAnnual) || 0) * 100;

  const riskColor =
    riskIndicator === 'High'
      ? 'from-[rgba(242,202,80,0.18)] text-[#f6e8bb]'
      : riskIndicator === 'Low'
        ? 'from-[rgba(0,196,180,0.14)] text-[#c8faf5]'
        : 'from-[rgba(255,255,255,0.06)] text-[#eef3f9]';

  return (
    <div className="mb-8 grid gap-4 sm:grid-cols-3">
      <div className={`rounded-[12px] bg-gradient-to-br p-5 shadow-[0_28px_48px_rgba(5,13,26,0.16)] ${riskColor}`}>
        <p className="editorial-eyebrow text-white/45">
          Risk level
        </p>
        <p className="font-display mt-3 text-3xl font-semibold">{riskIndicator}</p>
        <p className="mt-1 text-xs text-white/50">From your appetite · {profile}</p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/40">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              riskIndicator === 'High'
                ? 'w-[85%] bg-gradient-to-r from-[#f2ca50] to-[#c8d3e3]'
                : riskIndicator === 'Low'
                  ? 'w-[35%] bg-gradient-to-r from-[#00c4b4] to-[#7fddd4]'
                  : 'w-[55%] bg-gradient-to-r from-[#f2ca50] to-[#d4af37]'
            }`}
          />
        </div>
      </div>
      <div className="rounded-[12px] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-5 shadow-[0_28px_48px_rgba(5,13,26,0.14)]">
        <p className="editorial-eyebrow">
          Weighted expected return
        </p>
        {hasInvestment ? (
          <>
            <p className="font-display mt-3 text-3xl font-semibold text-[#7fddd4]">
              ~{wRet.toFixed(1)}%
              <span className="text-sm font-normal text-[#9fb1c5]"> p.a.</span>
            </p>
            <p className="mt-2 text-xs text-[#b8c8dc]">
              Blended across goals by monthly SIP weight (illustrative).
            </p>
          </>
        ) : (
          <>
            <p className="font-display mt-3 text-3xl font-semibold text-[#546172]">—</p>
            <p className="mt-2 text-xs text-[#b8c8dc]">
              Enter <span className="text-[#d6dde8]">monthly investment (₹)</span> in Basics to
              calculate.
            </p>
          </>
        )}
      </div>
      <div className="rounded-[12px] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-5 shadow-[0_28px_48px_rgba(5,13,26,0.14)]">
        <p className="editorial-eyebrow">
          Overall success score
        </p>
        {hasInvestment ? (
          <>
            <p className="font-display mt-3 text-3xl font-semibold text-[#f2ca50]">
              {score.toFixed(0)}
              <span className="text-sm font-normal text-[#9fb1c5]">/100</span>
            </p>
            <p className="mt-2 text-xs text-[#b8c8dc]">
              SIP vs inflation-adjusted targets (capped at 100 per goal).
            </p>
          </>
        ) : (
          <>
            <p className="font-display mt-3 text-3xl font-semibold text-[#546172]">—</p>
            <p className="mt-2 text-xs text-[#b8c8dc]">
              Appears after you set monthly SIP and (optionally) goals with targets.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
