export type Transaction = { id: string; date_time: string; timezone?: string; category_id: string; category?: { name: string } | string | null; value: number | string; currency: string; paymentmethod: string; description?: string | null; created_at?: string; updated_at?: string; local_time?: string; utc_offset?: string };

export const numeric = (value: number | string) => Number(value) || 0;
export const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
export const average = (values: number[]) => values.length ? sum(values) / values.length : 0;
export const median = (values: number[]) => { if (!values.length) return 0; const sorted = [...values].sort((a, b) => a - b); const middle = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2; };
export const quartiles = (values: number[]) => { if (!values.length) return { q1: 0, q2: 0, q3: 0 }; const sorted = [...values].sort((a, b) => a - b); const midpoint = Math.floor(sorted.length / 2); const lower = sorted.slice(0, midpoint); const upper = sorted.slice(sorted.length % 2 ? midpoint + 1 : midpoint); return { q1: median(lower.length ? lower : sorted), q2: median(sorted), q3: median(upper.length ? upper : sorted) }; };
export const iqr = (values: number[]) => { const { q1, q3 } = quartiles(values); return q3 - q1; };
export const variance = (values: number[]) => { if (!values.length) return 0; const mean = average(values); return average(values.map(value => (value - mean) ** 2)); };
export const stdev = (values: number[]) => Math.sqrt(variance(values));
export const coefficientOfVariation = (values: number[]) => { const mean = average(values); return mean ? stdev(values) / mean * 100 : 0; };
export const percentChange = (current: number, previous: number) => previous === 0 ? (current === 0 ? 0 : 100) : ((current - previous) / previous) * 100;
export const movingAverage = (values: number[], windowSize: number) => values.map((_, index) => average(values.slice(Math.max(0, index - windowSize + 1), index + 1)));
export const zScore = (value: number, values: number[]) => { const deviation = stdev(values); return deviation === 0 ? 0 : (value - average(values)) / deviation; };
export const percentileRank = (value: number, values: number[]) => values.length ? values.filter(candidate => candidate <= value).length / values.length * 100 : 0;
export const mode = (values: number[]) => { const counts = new Map<number, number>(); values.forEach(value => counts.set(value, (counts.get(value) || 0) + 1)); return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] || 0; };
export const pearson = (a: number[], b: number[]) => { if (a.length !== b.length || a.length < 2) return 0; const meanA = average(a); const meanB = average(b); const numerator = sum(a.map((value, index) => (value - meanA) * (b[index] - meanB))); const denominator = Math.sqrt(sum(a.map(value => (value - meanA) ** 2)) * sum(b.map(value => (value - meanB) ** 2))); return denominator ? numerator / denominator : 0; };
export const categoryName = (transaction: Transaction) => typeof transaction.category === 'string' ? transaction.category : transaction.category?.name || transaction.category_id;
export const groupSum = (transactions: Transaction[], key: (transaction: Transaction) => string) => transactions.reduce<Record<string, number>>((groups, transaction) => { const name = key(transaction); groups[name] = (groups[name] || 0) + numeric(transaction.value); return groups; }, {});
export const periodTransactions = (transactions: Transaction[], period: 'Week' | 'Month' | 'Year') => {
	if (!transactions.length) return [];
	const latest = new Date(Math.max(...transactions.map(transaction => new Date(transaction.date_time).getTime())));
	const start = new Date(Date.UTC(latest.getUTCFullYear(), latest.getUTCMonth(), latest.getUTCDate()));
	const end = new Date(start);
	if (period === 'Week') {
		start.setUTCDate(start.getUTCDate() - start.getUTCDay());
		end.setUTCDate(start.getUTCDate() + 7);
	} else if (period === 'Month') {
		start.setUTCDate(1);
		end.setUTCMonth(start.getUTCMonth() + 1, 1);
	} else {
		start.setUTCMonth(0, 1);
		end.setUTCFullYear(start.getUTCFullYear() + 1, 0, 1);
	}
	return transactions.filter(transaction => {
		const time = new Date(transaction.date_time).getTime();
		return time >= start.getTime() && time < end.getTime();
	});
};
export const previousPeriodTransactions = (transactions: Transaction[], period: 'Month' | 'Year') => { if (!transactions.length) return []; const latest = Math.max(...transactions.map(transaction => new Date(transaction.date_time).getTime())); const days = period === 'Month' ? 31 : 365; const end = latest - days * 24 * 60 * 60 * 1000; const start = end - days * 24 * 60 * 60 * 1000; return transactions.filter(transaction => { const time = new Date(transaction.date_time).getTime(); return time >= start && time < end; }); };

export type DateRange = { start: string; end: string };
export type PeriodBucket = { key: string; label: string; total: number; count: number };

export const transactionTime = (transaction: Transaction) => new Date(transaction.date_time).getTime();
export const dateOnly = (value: string | Date) => {
	const date = typeof value === 'string' ? new Date(value) : value;
	return new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC' }).format(date);
};
export const monthKey = (value: string | Date) => {
	const date = typeof value === 'string' ? new Date(value) : value;
	return new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC', year: 'numeric', month: '2-digit' }).format(date).replace('/', '-');
};
export const monthLabel = (key: string) => {
	const date = new Date(`${key}-01T00:00:00Z`);
	return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date);
};
export const inDateRange = (transaction: Transaction, range?: DateRange) => {
	if (!range?.start && !range?.end) return true;
	const time = transactionTime(transaction);
	const start = range?.start ? new Date(`${range.start}T00:00:00Z`).getTime() : -Infinity;
	const end = range?.end ? new Date(`${range.end}T23:59:59.999Z`).getTime() : Infinity;
	return time >= start && time <= end;
};
export const filterTransactions = (transactions: Transaction[], range?: DateRange, category = 'All', currency = 'All', method = 'All') => transactions.filter(transaction => inDateRange(transaction, range) && (category === 'All' || categoryName(transaction) === category) && (currency === 'All' || transaction.currency === currency) && (method === 'All' || transaction.paymentmethod === method));
export const groupByPeriod = (transactions: Transaction[], period: 'day' | 'week' | 'month' = 'month'): PeriodBucket[] => {
	const grouped = new Map<string, PeriodBucket>();
	transactions.forEach(transaction => {
		const date = new Date(transaction.date_time);
		const day = dateOnly(date);
		const key = period === 'day' ? day : period === 'month' ? monthKey(date) : dateOnly(new Date(date.getTime() - date.getUTCDay() * 86400000));
		const label = period === 'day' ? day.slice(5) : period === 'month' ? monthLabel(key) : `Week of ${key.slice(5)}`;
		const current = grouped.get(key) || { key, label, total: 0, count: 0 };
		current.total += numeric(transaction.value);
		current.count += 1;
		grouped.set(key, current);
	});
	return [...grouped.values()].sort((a, b) => a.key.localeCompare(b.key));
};
export const compareRanges = (transactions: Transaction[], current: DateRange, previous: DateRange) => ({
	current: filterTransactions(transactions, current),
	previous: filterTransactions(transactions, previous),
});
export const recurringTransactions = (transactions: Transaction[]) => {
	const groups = new Map<string, Transaction[]>();
	transactions.forEach(transaction => {
		const key = `${categoryName(transaction)}|${(transaction.description || '').trim().toLowerCase()}|${Math.round(numeric(transaction.value))}|${transaction.currency}`;
		groups.set(key, [...(groups.get(key) || []), transaction]);
	});
	return [...groups.entries()].filter(([, items]) => items.length >= 2).map(([key, items]) => ({ key, items, total: sum(items.map(item => numeric(item.value))), average: average(items.map(item => numeric(item.value))), category: categoryName(items[0]), description: items[0].description || 'Unnamed expense' })).sort((a, b) => b.total - a.total);
};
export const concentration = (transactions: Transaction[]) => {
	const totals = Object.values(groupSum(transactions, categoryName)).sort((a, b) => b - a);
	const total = sum(totals);
	return { total, topOneShare: total ? (totals[0] || 0) / total * 100 : 0, topThreeShare: total ? sum(totals.slice(0, 3)) / total * 100 : 0, hhi: total ? sum(totals.map(value => (value / total) ** 2)) * 10000 : 0 };
};