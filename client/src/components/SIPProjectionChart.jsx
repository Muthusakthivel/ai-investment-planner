import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const MAX_POINTS = 96;

function downsampleSeries(series, maxPoints) {
  if (!series?.length) return [];
  if (series.length <= maxPoints) return series;
  const out = [];
  const step = (series.length - 1) / (maxPoints - 1);
  for (let i = 0; i < maxPoints; i++) {
    const idx = Math.round(i * step);
    out.push(series[Math.min(idx, series.length - 1)]);
  }
  return out;
}

export function SIPProjectionChart({ projections, goalLabel = 'Goal', size = 'medium' }) {
  const chartData = useMemo(() => {
    const cons = projections?.conservative || [];
    const exp = projections?.expected || [];
    const agg = projections?.aggressive || [];
    const n = Math.max(cons.length, exp.length, agg.length);
    if (n === 0) return null;

    const c = downsampleSeries(cons, MAX_POINTS);
    const e = downsampleSeries(exp, MAX_POINTS);
    const a = downsampleSeries(agg, MAX_POINTS);
    const labels = e.map((p) => `M${p.month}`);

    return {
      labels,
      datasets: [
        {
          label: 'Conservative (6%)',
          data: c.map((p) => p.value),
          borderColor: 'rgba(148, 163, 184, 0.9)',
          backgroundColor: 'rgba(148, 163, 184, 0.06)',
          fill: true,
          tension: 0.25,
          pointRadius: 0,
          borderWidth: 2,
        },
        {
          label: 'Expected (blend)',
          data: e.map((p) => p.value),
          borderColor: 'rgba(34, 211, 238, 0.95)',
          backgroundColor: 'rgba(34, 211, 238, 0.08)',
          fill: true,
          tension: 0.25,
          pointRadius: 0,
          borderWidth: 2.5,
        },
        {
          label: 'Aggressive (12%)',
          data: a.map((p) => p.value),
          borderColor: 'rgba(167, 139, 250, 0.9)',
          backgroundColor: 'rgba(167, 139, 250, 0.06)',
          fill: true,
          tension: 0.25,
          pointRadius: 0,
          borderWidth: 2,
        },
      ],
    };
  }, [projections]);

  const wrapClass =
    size === 'large'
      ? 'h-[280px] sm:h-[340px] md:h-[400px] lg:h-[460px]'
      : 'h-52 sm:h-60';

  if (!chartData) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl border border-white/[0.06] bg-black/20 text-sm text-slate-500 ${wrapClass}`}
      >
        Add monthly SIP &amp; horizon to see projection curves
      </div>
    );
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: 'rgba(148, 163, 184, 0.95)',
          boxWidth: 10,
          font: { size: 10 },
        },
      },
      tooltip: {
        callbacks: {
          label(ctx) {
            const v = ctx.parsed.y;
            if (v == null || Number.isNaN(v)) return '';
            return `${ctx.dataset.label}: ₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: {
          color: 'rgba(148, 163, 184, 0.7)',
          maxTicksLimit: 8,
          font: { size: 9 },
        },
        title: {
          display: true,
          text: 'Month',
          color: 'rgba(148, 163, 184, 0.5)',
          font: { size: 10 },
        },
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: {
          color: 'rgba(148, 163, 184, 0.7)',
          callback: (val) => {
            const v = Number(val);
            if (v >= 1e5) return `₹${(v / 1e5).toFixed(v >= 1e7 ? 1 : 2)}L`;
            if (v >= 1e3) return `₹${(v / 1e3).toFixed(0)}k`;
            return `₹${Math.round(v)}`;
          },
          font: { size: 9 },
        },
        title: {
          display: true,
          text: 'Corpus',
          color: 'rgba(148, 163, 184, 0.5)',
          font: { size: 10 },
        },
      },
    },
  };

  return (
    <div className={`w-full ${wrapClass}`}>
      <Line data={chartData} options={options} aria-label={`SIP projections for ${goalLabel}`} />
    </div>
  );
}
