import React, { useEffect, useRef } from 'react';
import { ArrowUp, ArrowDown, X, ChevronUp, ChevronDown } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { SortDirection, SortRule } from '@/hooks/useMultiSort';

interface SortModalProps {
  isOpen: boolean;
  rules: SortRule[];
  onClose: () => void;
  onAddRule: (input: { key: string; label: string; direction?: SortDirection }) => void;
  onToggleDirection: (key: string) => void;
  onRemoveRule: (key: string) => void;
  onReorderRules: (fromIndex: number, toIndex: number) => void;
  onClearAll: () => void;
  pendingColumn?: { key: string; label: string; defaultDirection?: SortDirection } | null;
}

interface SortableRuleItemProps {
  rule: SortRule;
  index: number;
  onToggle: (key: string) => void;
  onRemove: (key: string) => void;
  onMoveUp: (fromIndex: number) => void;
  onMoveDown: (fromIndex: number) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  isFirst: boolean;
  focusRef?: React.RefObject<HTMLButtonElement | null>;
}

const SortableRuleItem: React.FC<SortableRuleItemProps> = ({
  rule,
  index,
  onToggle,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  isFirst,
  focusRef,
}) => {
  return (
    <div
      className="flex items-center gap-3 rounded-xl border border-border/60 bg-card px-3 py-2 shadow-sm transition-colors hover:bg-muted/50"
    >
      <div className="flex flex-col gap-1">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-muted-foreground hover:text-primary"
          aria-label={`Mover ${rule.label} para cima`}
          onClick={() => onMoveUp(index)}
          disabled={!canMoveUp}
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-muted-foreground hover:text-primary"
          aria-label={`Mover ${rule.label} para baixo`}
          onClick={() => onMoveDown(index)}
          disabled={!canMoveDown}
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex flex-1 flex-col text-left">
        <span className="text-sm font-medium text-foreground">{rule.label}</span>
        <span className="text-xs text-muted-foreground">Critério {index + 1}</span>
      </div>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8 text-muted-foreground hover:text-primary"
        aria-pressed={rule.direction === 'desc'}
        aria-label={rule.direction === 'asc' ? `Ordenar ${rule.label} em ordem decrescente` : `Ordenar ${rule.label} em ordem crescente`}
        onClick={() => onToggle(rule.key)}
        ref={isFirst ? focusRef : undefined}
      >
        {rule.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
      </Button>
      <Badge className="h-7 w-7 rounded-full bg-primary/10 text-primary">
        <span className="flex w-full items-center justify-center text-xs font-semibold">{index + 1}</span>
      </Badge>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8 text-muted-foreground hover:text-destructive"
        aria-label={`Remover ${rule.label} da ordenação`}
        onClick={() => onRemove(rule.key)}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};

export const SortModal: React.FC<SortModalProps> = ({
  isOpen,
  rules,
  onClose,
  onAddRule,
  onToggleDirection,
  onRemoveRule,
  onReorderRules,
  onClearAll,
  pendingColumn,
}) => {
  const addButtonRef = useRef<HTMLButtonElement | null>(null);
  const firstRuleHandleRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    if (addButtonRef.current) {
      addButtonRef.current.focus();
      return;
    }
    firstRuleHandleRef.current?.focus();
  }, [isOpen]);

  const pendingRuleExists = pendingColumn
    ? rules.some(rule => rule.key === pendingColumn.key)
    : false;

  const handleAddPending = () => {
    if (!pendingColumn || pendingRuleExists) {
      return;
    }
    onAddRule({
      key: pendingColumn.key,
      label: pendingColumn.label,
      direction: pendingColumn.defaultDirection,
    });
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) {
      return;
    }
    onReorderRules(index, index - 1);
  };

  const handleMoveDown = (index: number) => {
    if (index >= rules.length - 1) {
      return;
    }
    onReorderRules(index, index + 1);
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent
        className="max-w-lg"
        aria-labelledby="task-sort-dialog-title"
        onEscapeKeyDown={() => onClose()}
      >
        <DialogHeader>
          <DialogTitle id="task-sort-dialog-title">Ordem de classificação</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {pendingColumn && !pendingRuleExists ? (
            <Button ref={addButtonRef} type="button" onClick={handleAddPending} className="w-full justify-start">
              Adicionar '{pendingColumn.label}' à ordenação
            </Button>
          ) : null}
          {rules.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
              Nenhum critério definido. Clique em um cabeçalho de coluna para adicionar um critério de ordenação.
            </div>
          ) : (
            <ScrollArea className="max-h-80 pr-2">
              <div className="grid gap-3">
                {rules.map((rule, index) => (
                  <SortableRuleItem
                    key={rule.id}
                    rule={rule}
                    index={index}
                    onToggle={onToggleDirection}
                    onRemove={onRemoveRule}
                    onMoveUp={handleMoveUp}
                    onMoveDown={handleMoveDown}
                    canMoveUp={index > 0}
                    canMoveDown={index < rules.length - 1}
                    isFirst={index === 0}
                    focusRef={firstRuleHandleRef}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
        <DialogFooter className="flex w-full items-center justify-between gap-2 sm:justify-between">
          <Button type="button" variant="ghost" onClick={onClearAll} disabled={rules.length === 0}>
            Limpar tudo
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
