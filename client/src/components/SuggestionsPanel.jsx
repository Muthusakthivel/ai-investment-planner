export function SuggestionsPanel({ suggestions }) {
  if (!suggestions?.length) return null;

  return (
    <div className="rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/[0.07] to-transparent p-4">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200/90">
        Smart suggestions
      </p>
      <ul className="space-y-2">
        {suggestions.map((s, i) => (
          <li
            key={`${s.type}-${i}`}
            className="flex gap-2 text-sm leading-relaxed text-slate-200"
          >
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400/80" />
            <span>{s.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
