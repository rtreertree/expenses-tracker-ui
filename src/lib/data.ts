import type { Transaction } from './analytics';

export type Category = { id: string; name: string; created_at?: string; updated_at?: string };

const API_BASE_URL = (import.meta.env.PUBLIC_API_BASE_URL || (import.meta.env.DEV ? '/api/v1' : 'https://budget.rtreertree.com/api/v1')).replace(/\/$/, '');
const API_TOKEN = import.meta.env.PUBLIC_API_TOKEN;
const getRequestCache = new Map<string, Promise<unknown>>();
const STORAGE_PREFIX = 'spendline:api:';

const sessionCache = () => {
  if (typeof window === 'undefined') return null;
  try { return window.sessionStorage; } catch { return null; }
};

const clearReloadedSessionCache = () => {
  if (typeof window === 'undefined' || typeof performance === 'undefined') return;
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  if (navigation?.type !== 'reload') return;
  const storage = sessionCache();
  if (!storage) return;
  for (let index = storage.length - 1; index >= 0; index -= 1) {
    const key = storage.key(index);
    if (key?.startsWith(STORAGE_PREFIX)) storage.removeItem(key);
  }
};

clearReloadedSessionCache();

const request = async (resource: string, options: RequestInit = {}) => {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (API_TOKEN) headers.set('Authorization', `Bearer ${API_TOKEN}`);
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const url = `${API_BASE_URL}/${resource}`;
  const isGet = (options.method || 'GET').toUpperCase() === 'GET';
  if (isGet) {
    const cached = getRequestCache.get(url);
    if (cached) return cached;
    const stored = sessionCache()?.getItem(`${STORAGE_PREFIX}${url}`);
    if (stored) {
      try {
        const value = JSON.parse(stored);
        const cachedResponse = Promise.resolve(value);
        getRequestCache.set(url, cachedResponse);
        return cachedResponse;
      } catch {
        sessionCache()?.removeItem(`${STORAGE_PREFIX}${url}`);
      }
    }
  }
  const requestPromise = (async () => {
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) throw new Error(`${resource} request failed with ${response.status}`);
    if (response.status === 204) return null;
    const payload = await response.json();
    try { sessionCache()?.setItem(`${STORAGE_PREFIX}${url}`, JSON.stringify(payload)); } catch {}
    return payload;
  })();
  if (isGet) {
    getRequestCache.set(url, requestPromise);
    requestPromise.catch(() => getRequestCache.delete(url));
  }
  return requestPromise;
};

const invalidateResource = (resource: string) => {
  const url = `${API_BASE_URL}/${resource}`;
  getRequestCache.delete(url);
  sessionCache()?.removeItem(`${STORAGE_PREFIX}${url}`);
};

const itemsFrom = <T,>(payload: unknown): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object') {
    const envelope = payload as { data?: unknown; items?: unknown; results?: unknown };
    if (Array.isArray(envelope.data)) return envelope.data as T[];
    if (Array.isArray(envelope.items)) return envelope.items as T[];
    if (Array.isArray(envelope.results)) return envelope.results as T[];
  }
  return [];
};

export const demoTransactions: Transaction[] = [
  { id: '1', date_time: '2026-09-14T08:30:00+07:00', category_id: 'food', category: { name: 'Food & dining' }, value: 185, currency: 'THB', paymentmethod: 'PromptPay', description: 'Morning coffee and toast' },
  { id: '2', date_time: '2026-09-13T19:10:00+07:00', category_id: 'transport', category: { name: 'Transport' }, value: 72, currency: 'THB', paymentmethod: 'Card', description: 'BTS ride' },
  { id: '3', date_time: '2026-09-12T12:15:00+07:00', category_id: 'food', category: { name: 'Food & dining' }, value: 490, currency: 'THB', paymentmethod: 'Card', description: 'Lunch with friends' },
  { id: '4', date_time: '2026-09-11T09:00:00+07:00', category_id: 'bills', category: { name: 'Bills & utilities' }, value: 1240, currency: 'THB', paymentmethod: 'Transfer', description: 'Internet and electricity' },
  { id: '5', date_time: '2026-09-09T18:20:00+07:00', category_id: 'home', category: { name: 'Home' }, value: 860, currency: 'THB', paymentmethod: 'Card', description: 'Household supplies' },
  { id: '6', date_time: '2026-09-07T13:30:00+07:00', category_id: 'leisure', category: { name: 'Leisure' }, value: 320, currency: 'THB', paymentmethod: 'Cash', description: 'Cinema tickets' },
  { id: '7', date_time: '2026-09-03T20:00:00+07:00', category_id: 'food', category: { name: 'Food & dining' }, value: 740, currency: 'THB', paymentmethod: 'Card', description: 'Dinner' },
  { id: '8', date_time: '2026-08-29T10:00:00+07:00', category_id: 'transport', category: { name: 'Transport' }, value: 210, currency: 'THB', paymentmethod: 'Cash', description: 'Taxi' },
  { id: '9', date_time: '2026-08-22T14:00:00+07:00', category_id: 'home', category: { name: 'Home' }, value: 1540, currency: 'THB', paymentmethod: 'Transfer', description: 'Desk lamp' },
];

export async function loadTransactions(): Promise<Transaction[]> {
  try { return itemsFrom<Transaction>(await request('transaction')); } catch (error) {
    if (import.meta.env.DEV) return demoTransactions;
    throw error;
  }
}

export async function loadCategories(): Promise<string[]> {
  try { return itemsFrom<Category>(await request('categories')).map(item => item.name); } catch (error) {
    if (import.meta.env.DEV) return [...new Set(demoTransactions.map(transaction => typeof transaction.category === 'string' ? transaction.category : transaction.category?.name || transaction.category_id))];
    throw error;
  }
}

export const attachCategoryNames = (transactions: Transaction[], categories: Category[]) => {
  const namesById = new Map(categories.map(category => [category.id, category.name]));
  return transactions.map(transaction => ({ ...transaction, category: namesById.get(transaction.category_id) || transaction.category || transaction.category_id }));
};

export async function loadCategoryRecords(): Promise<Category[]> {
  try { return itemsFrom<Category>(await request('categories')); } catch (error) {
    if (import.meta.env.DEV) return [];
    throw error;
  }
}

export type TransactionInput = Omit<Transaction, 'id' | 'created_at' | 'updated_at' | 'category'> & { category_id: string };

export async function createTransaction(transaction: TransactionInput) {
  const result = await request('transaction', { method: 'POST', body: JSON.stringify(transaction) });
  invalidateResource('transaction');
  return result;
}

export async function updateTransaction(id: string, transaction: TransactionInput) {
  const result = await request(`transaction/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(transaction) });
  invalidateResource('transaction');
  invalidateResource(`transaction/${encodeURIComponent(id)}`);
  return result;
}