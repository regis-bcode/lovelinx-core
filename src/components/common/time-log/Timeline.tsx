interface TimelineItem {
  hora: string;
  texto: string;
}

interface TimelineProps {
  items?: TimelineItem[] | null;
  emptyMessage?: string;
}

export function Timeline({ items, emptyMessage = "Sem atividade registrada" }: TimelineProps) {
  if (!items || items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <ol className="relative space-y-5 border-l border-[#D6E0FF] pl-4">
      {items.map((item, index) => (
        <li key={`${item.hora}-${index}`} className="relative">
          <span className="absolute -left-[26px] flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-white bg-emerald-500 shadow" />
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1D4ED8]">{item.hora}</p>
            <p className="text-sm leading-relaxed text-slate-700">{item.texto}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
