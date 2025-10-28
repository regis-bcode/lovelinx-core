import { Badge } from "@/components/ui/badge";

const STATUS_STYLES: Record<string, { container: string; dot: string }> = {
  Pendente: {
    container: "bg-[#FFF4E6] text-[#8A4A12]",
    dot: "bg-[#E67814]"
  },
  Aprovado: {
    container: "bg-[#E8F6EC] text-[#1E6B43]",
    dot: "bg-[#1E6B43]"
  },
  Reprovado: {
    container: "bg-[#FFEBEC] text-[#8F2A2F]",
    dot: "bg-[#C24141]"
  }
};

interface StatusChipProps {
  status: "Pendente" | "Aprovado" | "Reprovado";
}

export function StatusChip({ status }: StatusChipProps) {
  const styles = STATUS_STYLES[status] ?? STATUS_STYLES.Pendente;
  const label = status === "Pendente" ? status : status.toUpperCase();

  return (
    <Badge
      variant="secondary"
      className={`inline-flex items-center gap-2 rounded-full border-0 px-3 py-1 text-xs font-semibold ${styles.container}`}
    >
      <span className={`h-2.5 w-2.5 rounded-full ${styles.dot}`} aria-hidden />
      {label}
    </Badge>
  );
}
