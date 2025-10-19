interface TimelineItem {
  hora: string;
  texto: string;
}

interface TimelineProps {
  items?: TimelineItem[] | null;
  emptyMessage?: string;
}

export function Timeline({ items, emptyMessage = "Sem atividade registrada." }: TimelineProps) {
  if (!items || items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <ol className="space-y-4">
      {items.map((item, index) => (
        <li key={`${item.hora}-${index}`} className="flex gap-3">
          <span className="mt-2 flex h-2.5 w-2.5 shrink-0 rounded-full bg-sky-500" aria-hidden />
          <p className="text-sm leading-relaxed text-slate-700">
            <span className="font-semibold text-slate-900">{item.hora}</span>
            <span className="text-slate-500"> — </span>
            <span>{item.texto}</span>
          </p>
        </li>
      ))}
    </ol>
  );
}
