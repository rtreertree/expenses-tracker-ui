export type Transaction = { id: string; date_time: string; timezone?: string; category_id: string; category?: { name: string } | string | null; value: number | string; currency: string; paymentmethod: string; description?: string | null; created_at?: string; updated_at?: string; local_time?: string; utc_offset?: string };

export const numeric = (value: number | string) => Number(value) || 0;
export const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
export const average = (values: number[]) => values.length ? sum(values) / values.length : 0;
export const median = (values: number[]) => { if (!values.length) return 0; const sorted = [...values].sort((a, b) => a - b); const middle = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2; };
export const variance = (values: number[]) => { if (!values.length) return 0; const mean = average(values); return average(values.map(value => (value - mean) ** 2)); };
export const stdev = (values: number[]) => Math.sqrt(variance(values));
export const percentChange = (current: number, previous: number) => previous === 0 ? (current === 0 ? 0 : 100) : ((current - previous) / previous) * 100;
export const movingAverage = (values: number[], windowSize: number) => values.map((_, index) => average(values.slice(Math.max(0, index - windowSize + 1), index + 1)));
export const zScore = (value: number, values: number[]) => { const deviation = stdev(values); return deviation === 0 ? 0 : (value - average(values)) / deviation; };
export const percentileRank = (value: number, values: number[]) => values.length ? values.filter(candidate => candidate <= value).length / values.length * 100 : 0;
export const mode = (values: number[]) => { const counts = new Map<number, number>(); values.forEach(value => counts.set(value, (counts.get(value) || 0) + 1)); return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] || 0; };
export const pearson = (a: number[], b: number[]) => { if (a.length !== b.length || a.length < 2) return 0; const meanA = average(a); const meanB = average(b); const numerator = sum(a.map((value, index) => (value - meanA) * (b[index] - meanB))); const denominator = Math.sqrt(sum(a.map(value => (value - meanA) ** 2)) * sum(b.map(value => (value - meanB) ** 2))); return denominator ? numerator / denominator : 0; };
export const categoryName = (transaction: Transaction) => typeof transaction.category === 'string' ? transaction.category : transaction.category?.name || transaction.category_id;
export const groupSum = (transactions: Transaction[], key: (transaction: Transaction) => string) => transactions.reduce<Record<string, number>>((groups, transaction) => { const name = key(transaction); groups[name] = (groups[name] || 0) + numeric(transaction.value); return groups; }, {});