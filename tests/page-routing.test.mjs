import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveRoutePage } from '../src/lib/page-routing.mjs';
import { toCsv } from '../src/lib/csv.mjs';

test('treats edit and create as the same form screen', () => {
  assert.equal(resolveRoutePage('edit'), 'new');
});

test('treats dashboard and unknown routes consistently', () => {
  assert.equal(resolveRoutePage('dashboard'), 'dashboard');
  assert.equal(resolveRoutePage('unknown-page'), 'dashboard');
});

test('exports CSV fields without corrupting commas, quotes, or line breaks', () => {
  assert.equal(toCsv([
    ['description', 'value'],
    ['Lunch, with "friends"\n(and dessert)', 490],
    [null, undefined],
  ]), 'description,value\n"Lunch, with ""friends""\n(and dessert)",490\n,');
});

