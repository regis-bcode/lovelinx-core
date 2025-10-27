import { Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export type ApprovalConfirmationDialogProps = {
  open: boolean;
  title: string;
  actionLabel: string | null;
  aprovadoValue: 'Sim' | 'Não' | null;
  comissionadoValue: 'Sim' | 'Não' | null;
  approverDisplay: string;
  dateDisplay: string;
  timeDisplay: string;
  justification: string;
  errorMessage: string | null;
  isRejecting: boolean;
  isSaving: boolean;
  isConfirmDisabled: boolean;
  onJustificationChange(value: string): void;
  onConfirm(): void | Promise<void>;
  onCancel(): void;
  onOpenChange(open: boolean): void;
};

export function ApprovalConfirmationDialog({
  open,
  title,
  actionLabel,
  aprovadoValue,
  comissionadoValue,
  approverDisplay,
  dateDisplay,
  timeDisplay,
  justification,
  errorMessage,
  isRejecting,
  isSaving,
  isConfirmDisabled,
  onJustificationChange,
  onConfirm,
  onCancel,
  onOpenChange,
}: ApprovalConfirmationDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            Revise os dados que serão gravados antes de confirmar esta ação.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <span className="text-xs font-semibold uppercase text-muted-foreground">
              Ação selecionada
            </span>
            <p className="mt-1 text-sm font-medium text-foreground">{actionLabel ?? '—'}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 px-4 py-3">
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                Campo Aprovado
              </span>
              <p className="mt-1 text-sm font-medium text-foreground">{aprovadoValue ?? '—'}</p>
            </div>
            <div className="rounded-lg border border-slate-200 px-4 py-3">
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                Campo Comissionado
              </span>
              <p className="mt-1 text-sm font-medium text-foreground">{comissionadoValue ?? '—'}</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 px-4 py-3 sm:col-span-2">
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                Nome do aprovador
              </span>
              <p className="mt-1 text-sm font-medium text-foreground">{approverDisplay}</p>
            </div>
            <div className="rounded-lg border border-slate-200 px-4 py-3">
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                Data da aprovação ou reprovação
              </span>
              <p className="mt-1 text-sm font-medium text-foreground">{dateDisplay}</p>
            </div>
            <div className="rounded-lg border border-slate-200 px-4 py-3">
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                Horário da aprovação ou reprovação
              </span>
              <p className="mt-1 text-sm font-medium text-foreground">{timeDisplay}</p>
            </div>
          </div>
          {isRejecting ? (
            <div className="space-y-2">
              <Label htmlFor="approval-confirmation-justification" className="text-sm font-medium">
                Justificativa da reprovação
              </Label>
              <Textarea
                id="approval-confirmation-justification"
                value={justification}
                onChange={(event) => onJustificationChange(event.target.value)}
                placeholder="Descreva o motivo da reprovação"
                disabled={isSaving}
              />
              <p className="text-xs text-muted-foreground">
                Esta justificativa será registrada junto ao log de tempo.
              </p>
              {errorMessage ? (
                <p className="text-xs font-medium text-destructive">{errorMessage}</p>
              ) : null}
            </div>
          ) : null}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={(event) => {
              event.preventDefault();
              onCancel();
            }}
            disabled={isSaving}
          >
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              void onConfirm();
            }}
            disabled={isConfirmDisabled}
          >
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            OK
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
