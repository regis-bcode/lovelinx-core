// @ts-nocheck
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { sanitizeTimeLogPayload, TIME_LOG_COLUMNS } from '../src/hooks/utils/timeLogPayload';

describe('sanitizeTimeLogPayload', () => {
  it('keeps all allowed fields including tempo_trabalhado and is_billable', () => {
    const payload = {
      task_id: 'task-1',
      tempo_trabalhado: 120,
      is_billable: true,
      observacoes: 'Registro manual',
      unknown_field: 'should be removed',
      aprovador_nome: undefined,
    } as Record<string, unknown>;

    const sanitized = sanitizeTimeLogPayload(payload);

    assert.equal(sanitized.task_id, 'task-1');
    assert.equal(sanitized.tempo_trabalhado, 120);
    assert.equal(sanitized.is_billable, true);
    assert.ok(!('unknown_field' in sanitized));
    assert.ok(!('aprovador_nome' in sanitized));
  });

  it('tracks the allowed column list explicitly', () => {
    assert.ok(TIME_LOG_COLUMNS.has('tempo_trabalhado'));
    assert.ok(TIME_LOG_COLUMNS.has('is_billable'));
  });
});
