const LEVELS = ['Low', 'Medium', 'High'];

const levelConfig = {
  Low: { bar: 'from-[#00c4b4] to-[#67e2d8]', glow: 'shadow-[0_0_20px_rgba(0,196,180,0.18)]' },
  Medium: { bar: 'from-[#f2ca50] to-[#d4af37]', glow: 'shadow-[0_0_20px_rgba(242,202,80,0.16)]' },
  High: { bar: 'from-[#f2ca50] to-[#9daec4]', glow: 'shadow-[0_0_20px_rgba(242,202,80,0.14)]' },
};

export function RiskIndicator({ level }) {
  const idx = LEVELS.indexOf(level);
  const active = idx >= 0 ? idx : 1;

  return (
    <div className="rounded-[12px] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-5 backdrop-blur-[20px] shadow-[0_30px_56px_rgba(5,13,26,0.16)]">
      <div className="mb-3 flex items-center justify-between">
        <span className="editorial-eyebrow">
          Risk exposure
        </span>
        <span
          className={`rounded-[6px] px-3 py-1 text-xs font-bold tracking-wide ${
            active === 0
              ? 'bg-[rgba(0,196,180,0.14)] text-[#9af0e7]'
              : active === 1
                ? 'bg-[rgba(242,202,80,0.14)] text-[#f6e8bb]'
                : 'bg-[rgba(255,255,255,0.06)] text-[#eef3f9]'
          }`}
        >
          {LEVELS[active]}
        </span>
      </div>
      <div className="flex h-3 gap-1.5">
        {LEVELS.map((L, i) => {
          const on = i <= active;
          const cfg = levelConfig[L];
          return (
            <div
              key={L}
              className="relative flex-1 overflow-hidden rounded-full bg-white/[0.06]"
              title={L}
            >
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${
                  on
                    ? `w-full bg-gradient-to-r ${cfg.bar} shadow-md ${cfg.glow}`
                    : 'w-0 bg-transparent'
                }`}
              />
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] text-[#b8c8dc]">
        Follows your selected risk appetite (Low / Medium / High)
      </p>
    </div>
  );
}
