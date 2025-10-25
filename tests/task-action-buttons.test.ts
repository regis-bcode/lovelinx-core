// @ts-nocheck
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  getStartTimerButtonState,
  hasAssignedResponsible,
  type StartTimerButtonState,
} from '../src/components/projects/taskActionGuards';

describe('hasAssignedResponsible', () => {
  it('returns true when user_id is provided', () => {
    assert.equal(
      hasAssignedResponsible({ user_id: 'user-1', responsavel: null, tarefa: 'Planejar sprint' }),
      true,
    );
  });

  it('returns false when responsavel is missing', () => {
    assert.equal(hasAssignedResponsible({ responsavel: '   ', tarefa: 'Planejar sprint' }), false);
  });

  it('normalizes accents when checking for sem responsavel', () => {
    assert.equal(hasAssignedResponsible({ responsavel: 'Sem Responsável', tarefa: 'Planejar sprint' }), false);
  });
});

describe('getStartTimerButtonState', () => {
  const baseRow = { tarefa: 'Planejar sprint', responsavel: 'Equipe', user_id: null } as const;

  const expectReason = (state: StartTimerButtonState, reason: StartTimerButtonState['reason']) => {
    assert.equal(state.disabled, reason !== null);
    assert.equal(state.reason, reason);
  };

  it('disables when a save operation is in progress', () => {
    const state = getStartTimerButtonState(baseRow, { isSaving: true, isRunning: false });
    expectReason(state, 'saving');
  });

  it('disables when a timer is already running', () => {
    const state = getStartTimerButtonState(baseRow, { isSaving: false, isRunning: true });
    expectReason(state, 'running');
  });

  it('disables when the task name is blank', () => {
    const state = getStartTimerButtonState(
      { ...baseRow, tarefa: '   ' },
      { isSaving: false, isRunning: false },
    );
    expectReason(state, 'missingName');
  });

  it('disables when no responsible is assigned', () => {
    const state = getStartTimerButtonState(
      { tarefa: 'Planejar sprint', responsavel: 'Sem Responsável', user_id: null },
      { isSaving: false, isRunning: false },
    );
    expectReason(state, 'noResponsible');
  });

  it('allows starting when the row is valid', () => {
    const state = getStartTimerButtonState(baseRow, { isSaving: false, isRunning: false });
    expectReason(state, null);
  });
});
