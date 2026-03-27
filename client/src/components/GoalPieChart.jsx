import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip);

const LABELS = {
  Equity: 'Equity',
  MutualFunds: 'Mutual funds',
  Debt: 'Debt',
  Bonds: 'Bonds',
  Gold: 'Gold',
};

/** Clean, high-contrast palette */
const COLORS = {
  Equity: '#38bdf8',
  MutualFunds: '#34d399',
  Debt: '#94a3b8',
  Bonds: '#fbbf24',
  Gold: '#fcd34d',
};

const DEFAULT_KEYS = ['Equity', 'MutualFunds', 'Debt', 'Bonds', 'Gold'];

export function GoalPieChart({ allocationPercent, goalLabel = 'Mix', keys = DEFAULT_KEYS }) {
  const chartKeys = Array.isArray(keys) && keys.length ? keys : DEFAULT_KEYS;
  const raw = chartKeys.map(
    (k) => Math.round((allocationPercent[k] || 0) * 10) / 10
  );
  const sum = raw.reduce((a, b) => a + b, 0);
  const chartData = sum < 0.01 ? chartKeys.map(() => 100 / chartKeys.length) : raw;
  const displayPercents = sum < 0.01 ? chartData : raw;

  const data = {
    labels: chartKeys.map((k) => LABELS[k]),
    datasets: [
      {
        data: chartData,
        backgroundColor: chartKeys.map((k) => COLORS[k]),
        borderColor: '#0c1222',
        borderWidth: 2,
        hoverOffset: 6,
        spacing: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '72%',
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#f8fafc',
        bodyColor: '#cbd5e1',
        borderColor: 'rgba(56, 189, 248, 0.25)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 10,
        displayColors: true,
        boxPadding: 6,
        callbacks: {
          label(ctx) {
            const v = displayPercents[ctx.dataIndex];
            return ` ${ctx.label}: ${v}%`;
          },
        },
      },
    },
  };

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-8">
      <div className="relative mx-auto shrink-0 sm:mx-0">
        <div
          className="rounded-3xl p-1"
          style={{
            background:
              'linear-gradient(145deg, rgba(56,189,248,0.12) 0%, rgba(167,139,250,0.08) 50%, rgba(15,23,42,0.9) 100%)',
            boxShadow:
              '0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          <div className="relative h-[200px] w-[200px] rounded-[1.35rem] bg-[#0a0f18] p-2 sm:h-[220px] sm:w-[220px]">
            <Doughnut data={data} options={options} />
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Split
              </span>
              <span className="mt-0.5 max-w-[100px] truncate text-center font-display text-sm font-bold text-white">
                {goalLabel}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="min-w-0 flex-1 space-y-3">
        {chartKeys.map((k, i) => {
          const pct = displayPercents[i];
          const w = Math.max(pct, 0);
          return (
            <div key={k} className="group">
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-sm ring-1 ring-white/20"
                    style={{ backgroundColor: COLORS[k], boxShadow: `0 0 12px ${COLORS[k]}55` }}
                  />
                  <span className="truncate text-xs font-medium text-slate-400">
                    {LABELS[k]}
                  </span>
                </div>
                <span className="shrink-0 font-display text-sm font-bold tabular-nums text-white">
                  {pct.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out group-hover:brightness-110"
                  style={{
                    width: `${Math.min(100, w)}%`,
                    backgroundColor: COLORS[k],
                    boxShadow: w > 2 ? `0 0 16px ${COLORS[k]}44` : 'none',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
