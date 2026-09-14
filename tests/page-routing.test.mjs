import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveRoutePage } from '../src/lib/page-routing.mjs';

test('treats edit and create as the same form screen', () => {
  assert.equal(resolveRoutePage('edit'), 'new');
});

test('treats dashboard and unknown routes consistently', () => {
  assert.equal(resolveRoutePage('dashboard'), 'dashboard');
  assert.equal(resolveRoutePage('unknown-page'), 'dashboard');
});
