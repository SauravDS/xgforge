// Auto-generated match-script chips.

export function MatchScriptChips({ tags }: { tags: string[] }) {
  if (!tags.length) return null;
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mr-1">
        Match script
      </span>
      {tags.map((t) => (
        <span
          key={t}
          className="rounded-full border border-border/60 bg-surface-1/60 px-2.5 py-1 text-[11px] tracking-tight"
        >
          {t}
        </span>
      ))}
    </div>
  );
}
