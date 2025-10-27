// @ts-nocheck
import './setup-dom';
import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { ApprovalConfirmationDialog } from '../src/components/projects/ApprovalConfirmationDialog';

type PersistPayload = {
  status: 'Aprovado' | 'Reprovado';
  aprovado: 'Sim' | 'Não';
  comissionado: 'Sim' | 'Não';
  approverName: string | null;
  performedAt: Date;
  justification: string | null;
};

type HarnessState = {
  action: 'approve' | 'reject';
  commissioned: boolean;
  approverName: string | null;
  performedAt: Date;
  justification: string;
};

type HarnessProps = {
  action: 'approve' | 'reject';
  commissioned?: boolean;
  approverName?: string | null;
  initialJustification?: string;
  onPersist(payload: PersistPayload): Promise<void>;
};

const DEFAULT_DATE = new Date('2025-05-30T14:05:00-03:00');

function ApprovalModalHarness({
  action,
  commissioned = false,
  approverName = 'Administrador',
  initialJustification = '',
  onPersist,
}: HarnessProps) {
  const [state, setState] = useState<HarnessState | null>({
    action,
    commissioned,
    approverName,
    performedAt: DEFAULT_DATE,
    justification: initialJustification,
  });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [open, setOpen] = useState(true);

  const handleConfirm = async () => {
    if (!state) {
      return;
    }

    if (state.action === 'reject') {
      const trimmed = state.justification.trim();
      if (trimmed.length === 0) {
        setError('Obrigatório informar a justificativa da reprovação.');
        return;
      }
    }

    setError(null);
    setIsSaving(true);
    try {
      await onPersist({
        status: state.action === 'approve' ? 'Aprovado' : 'Reprovado',
        aprovado: state.action === 'approve' ? 'Sim' : 'Não',
        comissionado:
          state.action === 'approve'
            ? state.commissioned
              ? 'Sim'
              : 'Não'
            : 'Não',
        approverName: state.approverName,
        performedAt: state.performedAt,
        justification:
          state.action === 'reject' ? state.justification.trim() : null,
      });
      setState(null);
      setOpen(false);
    } catch (persistError) {
      void persistError;
      setError('Não foi possível salvar a aprovação. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const currentState = state;

  return (
    <ApprovalConfirmationDialog
      open={open}
      title={currentState?.action === 'approve' ? 'Confirmar aprovação' : 'Confirmar reprovação'}
      actionLabel={currentState?.action === 'approve' ? 'Aprovar registro' : 'Reprovar registro'}
      aprovadoValue={currentState ? (currentState.action === 'approve' ? 'Sim' : 'Não') : null}
      comissionadoValue={currentState ? (currentState.commissioned ? 'Sim' : 'Não') : null}
      approverDisplay={currentState?.approverName ?? '—'}
      dateDisplay="30/05/2025"
      timeDisplay="14:05:00"
      justification={currentState?.justification ?? ''}
      errorMessage={error}
      isRejecting={currentState?.action === 'reject'}
      isSaving={isSaving}
      isConfirmDisabled={isSaving || !currentState}
      onJustificationChange={(value) => {
        setState(prev => {
          if (!prev) {
            return prev;
          }

          return {
            ...prev,
            justification: value,
          };
        });

        if (error && value.trim().length > 0) {
          setError(null);
        }
      }}
      onConfirm={handleConfirm}
      onCancel={() => {
        setOpen(false);
      }}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setOpen(false);
        }
      }}
    />
  );
}

describe('ApprovalConfirmationDialog', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('sends approval payload with commissioned=yes', async () => {
    const user = userEvent.setup();
    let recorded: PersistPayload | null = null;

    render(
      <ApprovalModalHarness
        action="approve"
        commissioned
        onPersist={async (payload) => {
          recorded = payload;
        }}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'OK' }));

    assert.ok(recorded);
    assert.equal(recorded?.status, 'Aprovado');
    assert.equal(recorded?.aprovado, 'Sim');
    assert.equal(recorded?.comissionado, 'Sim');
    assert.equal(recorded?.justification, null);
  });

  it('sends approval payload with commissioned=no', async () => {
    const user = userEvent.setup();
    let recorded: PersistPayload | null = null;

    render(
      <ApprovalModalHarness
        action="approve"
        commissioned={false}
        onPersist={async (payload) => {
          recorded = payload;
        }}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'OK' }));

    assert.ok(recorded);
    assert.equal(recorded?.status, 'Aprovado');
    assert.equal(recorded?.aprovado, 'Sim');
    assert.equal(recorded?.comissionado, 'Não');
    assert.equal(recorded?.justification, null);
  });

  it('requires justification when rejecting', async () => {
    const user = userEvent.setup();
    let callCount = 0;

    render(
      <ApprovalModalHarness
        action="reject"
        onPersist={async () => {
          callCount += 1;
        }}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'OK' }));

    assert.equal(callCount, 0);
    assert.ok(screen.getByText('Obrigatório informar a justificativa da reprovação.'));
  });

  it('trims justification before sending rejection payload', async () => {
    const user = userEvent.setup();
    let recorded: PersistPayload | null = null;

    render(
      <ApprovalModalHarness
        action="reject"
        onPersist={async (payload) => {
          recorded = payload;
        }}
      />,
    );

    const justificationField = screen.getByLabelText('Justificativa da reprovação');
    await user.type(justificationField, ' Prazo inviável  ');
    await user.click(screen.getByRole('button', { name: 'OK' }));

    assert.ok(recorded);
    assert.equal(recorded?.status, 'Reprovado');
    assert.equal(recorded?.aprovado, 'Não');
    assert.equal(recorded?.comissionado, 'Não');
    assert.equal(recorded?.justification, 'Prazo inviável');
  });

  it('shows error message when rejection justification contains only spaces', async () => {
    const user = userEvent.setup();
    let callCount = 0;

    render(
      <ApprovalModalHarness
        action="reject"
        initialJustification={'   '}
        onPersist={async () => {
          callCount += 1;
        }}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'OK' }));

    assert.equal(callCount, 0);
    assert.ok(screen.getByText('Obrigatório informar a justificativa da reprovação.'));
  });

  it('displays backend error message when persist fails', async () => {
    const user = userEvent.setup();
    let callCount = 0;

    render(
      <ApprovalModalHarness
        action="approve"
        onPersist={async () => {
          callCount += 1;
          throw new Error('Supabase down');
        }}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'OK' }));

    assert.equal(callCount, 1);
    assert.ok(screen.getByText('Não foi possível salvar a aprovação. Tente novamente.'));
    assert.ok(screen.getByRole('button', { name: 'OK' }));
  });

  it('disables confirm button while saving to avoid duplicate submissions', async () => {
    const user = userEvent.setup();

    let resolvePersist: (() => void) | null = null;
    const persistPromise = () =>
      new Promise<void>((resolve) => {
        resolvePersist = resolve;
      });

    render(
      <ApprovalModalHarness
        action="approve"
        onPersist={persistPromise}
      />,
    );

    const confirmButton = screen.getByRole('button', { name: 'OK' });
    await user.click(confirmButton);

    assert.equal(confirmButton.getAttribute('disabled') !== null, true);

    resolvePersist?.();
  });

  it('clears validation message after entering justification text', async () => {
    const user = userEvent.setup();

    render(
      <ApprovalModalHarness
        action="reject"
        onPersist={async () => {}}
      />,
    );

    const confirmButton = screen.getByRole('button', { name: 'OK' });
    await user.click(confirmButton);
    assert.ok(screen.getByText('Obrigatório informar a justificativa da reprovação.'));

    const justificationField = screen.getByLabelText('Justificativa da reprovação');
    await user.type(justificationField, 'Motivo válido');

    assert.equal(screen.queryByText('Obrigatório informar a justificativa da reprovação.'), null);
  });
});
