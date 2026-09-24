import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  average,
  categoryName,
  coefficientOfVariation,
  concentration,
  dateOnly,
  filterTransactions,
  groupSum,
  groupByPeriod,
  iqr,
  monthKey,
  monthLabel,
  median,
  mode,
  numeric,
  percentileRank,
  percentChange,
  previousPeriodTransactions,
  quartiles,
  recurringTransactions,
  stdev,
  sum,
  variance,
  zScore,
  type Transaction,
} from "../lib/analytics";
import {
  attachCategoryNames,
  createTransaction,
  loadCategoryRecords,
  loadTransactions,
  updateTransaction,
  type TransactionInput,
} from "../lib/data";
import { toCsv } from "../lib/csv.mjs";
import { resolveRoutePage } from "../lib/page-routing.mjs";
import {
  Header,
  Layout,
  colorFor,
  colors,
  dateLabel,
  money,
} from "./shared";

import DashboardPage from "./DashboardPage";
import TransactionsPage from "./TransactionsPage";

function Compare({
  transactions,
  categories,
}: {
  transactions: Transaction[];
  categories: string[];
}) {
  const [comparisonMode, setComparisonMode] = useState<"month" | "year">("month");
  const latest = transactions.length ? Math.max(...transactions.map((item) => new Date(item.date_time).getTime())) : Date.now();
  const comparisonDays = comparisonMode === "month" ? 31 : 365;
  const currentTransactions = transactions.filter((item) => new Date(item.date_time).getTime() >= latest - comparisonDays * 86400000);
  const previousTransactions = transactions.filter((item) => {
    const time = new Date(item.date_time).getTime();
    return time >= latest - comparisonDays * 2 * 86400000 && time < latest - comparisonDays * 86400000;
  });
  const current = sum(currentTransactions.map((item) => numeric(item.value)));
  const previous = sum(previousTransactions.map((item) => numeric(item.value)));
  const currentByCategory = groupSum(currentTransactions, categoryName);
  const previousByCategory = groupSum(previousTransactions, categoryName);
  const changes = Object.entries(currentByCategory).map(([name, value]) => ({
    name,
    value,
    change: percentChange(value, previousByCategory[name] || 0),
  }));
  const weekend = currentTransactions
    .filter((item) => [0, 6].includes(new Date(item.date_time).getDay()))
    .map((item) => numeric(item.value));
  const weekday = currentTransactions
    .filter((item) => ![0, 6].includes(new Date(item.date_time).getDay()))
    .map((item) => numeric(item.value));
  const chart = [
    { period: "Previous", spend: previous },
    { period: "Current", spend: current },
  ];
  return (
    <Layout active="/analytics/compare">
      <Header
        eyebrow="Analytics / compare"
        title="Compare periods"
        action={
          <div className="range-switcher">
            <button className={comparisonMode === "month" ? "active" : ""} onClick={() => setComparisonMode("month")}>Month over month</button>
            <button className={comparisonMode === "year" ? "active" : ""} onClick={() => setComparisonMode("year")}>Year over year</button>
          </div>
        }
      />
      <div className="panel-grid">
        <div className="panel">
          <div className="panel-head">
            <div>
              <h2>Spend movement</h2>
              <div className="panel-subtitle">
                Current versus previous period
              </div>
            </div>
            <span className="badge up">
              {percentChange(current, previous).toFixed(1)}%
            </span>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer>
              <BarChart data={chart}>
                <CartesianGrid stroke="#edf0ea" vertical={false} />
                <XAxis
                  dataKey="period"
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip formatter={(value) => money(Number(value) || 0)} />
                <Bar dataKey="spend" fill="#202422" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="panel">
          <div className="panel-head">
            <div>
              <h2>Weekday vs weekend</h2>
              <div className="panel-subtitle">Average transaction value</div>
            </div>
          </div>
          <div className="metric-list">
            <div className="metric-row">
              <b>Weekday</b>
              <span>{money(average(weekday))}</span>
              <span className="muted">{weekday.length} tx</span>
              <span />
            </div>
            <div className="metric-row">
              <b>Weekend</b>
              <span>{money(average(weekend))}</span>
              <span className="muted">{weekend.length} tx</span>
              <span />
            </div>
          </div>
        </div>
      </div>
      <div className="panel">
        <div className="panel-head">
          <div>
            <h2>Category movement</h2>
            <div className="panel-subtitle">
              Percentage change versus previous period
            </div>
          </div>
        </div>
        <div className="metric-list">
          {changes.map((item) => (
            <div className="metric-row" key={item.name}>
              <b>
                <i
                  className="category-dot"
                  style={{ background: colorFor(item.name, categories) }}
                />
                {item.name}
              </b>
              <span>{money(item.value)}</span>
              <span />
              <span className={`badge ${item.change >= 0 ? "up" : "down"}`}>
                {item.change >= 0 ? "+" : ""}
                {item.change.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}

function Stats({
  transactions,
  categories,
}: {
  transactions: Transaction[];
  categories: string[];
}) {
  const [range, setRange] = useState("All time");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [currencyFilter, setCurrencyFilter] = useState("All");
  const [methodFilter, setMethodFilter] = useState("All");
  const [trendPeriod, setTrendPeriod] = useState<"day" | "week" | "month">("day");
  const [budget, setBudget] = useState(0);
  const currencies = [...new Set(transactions.map((item) => item.currency))];
  const methods = [...new Set(transactions.map((item) => item.paymentmethod))];
  const latestTime = transactions.length
    ? Math.max(...transactions.map((item) => new Date(item.date_time).getTime()))
    : Date.now();
  const latestDate = new Date(latestTime).toISOString().slice(0, 10);
  const rangeDays = range === "30 days" ? 30 : range === "90 days" ? 90 : range === "365 days" ? 365 : Infinity;
  const rangeStart = Number.isFinite(rangeDays)
    ? new Date(latestTime - rangeDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    : "";
  const scoped = range === "All time"
    ? filterTransactions(transactions, undefined, categoryFilter, currencyFilter, methodFilter)
    : filterTransactions(transactions, { start: rangeStart, end: latestDate }, categoryFilter, currencyFilter, methodFilter);
  const scopedCurrencies = [...new Set(scoped.map((item) => item.currency))];
  const currency = scopedCurrencies.length === 1 ? scopedCurrencies[0] : "THB";
  const amount = (value: number) =>
    scopedCurrencies.length === 1 ? money(value, currency) : `${value.toFixed(2)} units`;
  const values = scoped.map((item) => numeric(item.value));
  const quartile = quartiles(values);
  const total = sum(values);
  const mean = average(values);
  const deviation = stdev(values);
  const outlierRecords = scoped
    .map((item) => {
      const categoryValues = scoped
        .filter((candidate) => categoryName(candidate) === categoryName(item))
        .map((candidate) => numeric(candidate.value));
      const categoryQuartiles = quartiles(categoryValues);
      const categoryIqr = iqr(categoryValues);
      const upperFence = categoryQuartiles.q3 + categoryIqr * 1.5;
      const score = zScore(numeric(item.value), categoryValues);
      return {
        item,
        score,
        upperFence,
        isOutlier: numeric(item.value) > upperFence || score >= 2,
      };
    })
    .filter((item) => item.isOutlier);
  const rows = [...new Set(scoped.map(categoryName))].map((category) => {
    const categoryValues = scoped
      .filter((item) => categoryName(item) === category)
      .map((item) => numeric(item.value));
    const categoryQuartiles = quartiles(categoryValues);
    return {
      category,
      values: categoryValues,
      mean: average(categoryValues),
      median: median(categoryValues),
      deviation: stdev(categoryValues),
      variance: variance(categoryValues),
      cv: coefficientOfVariation(categoryValues),
      mode: mode(categoryValues),
      q1: categoryQuartiles.q1,
      q3: categoryQuartiles.q3,
    };
  });
  const histogram = (() => {
    if (!values.length) return [];
    const minimum = Math.min(...values);
    const maximum = Math.max(...values);
    const width = maximum === minimum ? 1 : (maximum - minimum) / 6;
    return Array.from({ length: maximum === minimum ? 1 : 6 }, (_, index) => {
      const start = minimum + index * width;
      const end = index === 5 ? maximum : start + width;
      return {
        range: `${Math.round(start)}-${Math.round(end)}`,
        count: values.filter((value) => value >= start && (index === 5 ? value <= end : value < end)).length,
      };
    });
  })();
  const daily = Object.entries(
    scoped.reduce<Record<string, number>>((result, item) => {
      const key = item.date_time.slice(0, 10);
      result[key] = (result[key] || 0) + numeric(item.value);
      return result;
    }, {}),
  )
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, spend], index, entries) => ({
      date: date.slice(5),
      spend,
      average: average(entries.slice(Math.max(0, index - 6), index + 1).map((entry) => entry[1])),
    }));
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((name, day) => {
    const dayTransactions = scoped.filter((item) => new Date(item.date_time).getDay() === day);
    return { name, average: average(dayTransactions.map((item) => numeric(item.value))), count: dayTransactions.length };
  });
  const timeBuckets = ["Morning", "Afternoon", "Evening", "Night"].map((name, index) => {
    const bucketTransactions = scoped.filter((item) => {
      const hour = new Date(item.date_time).getHours();
      return hour >= [5, 12, 18, 0][index] && hour < [12, 18, 24, 5][index];
    });
    return { name, average: average(bucketTransactions.map((item) => numeric(item.value))), count: bucketTransactions.length };
  });
  const paymentRows = Object.entries(groupSum(scoped, (item) => item.paymentmethod))
    .map(([name, spend]) => ({ name, spend, share: total ? spend / total * 100 : 0 }))
    .sort((a, b) => b.spend - a.spend);
  const categoryTotals = Object.entries(groupSum(scoped, categoryName)).sort((a, b) => b[1] - a[1]);
  const topThreeShare = total ? sum(categoryTotals.slice(0, 3).map((item) => item[1])) / total * 100 : 0;
  const firstDate = scoped.length ? new Date(Math.min(...scoped.map((item) => new Date(item.date_time).getTime()))) : new Date();
  const lastDate = scoped.length ? new Date(Math.max(...scoped.map((item) => new Date(item.date_time).getTime()))) : new Date();
  const observedDays = Math.max(1, Math.ceil((lastDate.getTime() - firstDate.getTime()) / 86400000) + 1);
  const monthDays = new Date(lastDate.getFullYear(), lastDate.getMonth() + 1, 0).getDate();
  const forecast = total / observedDays * monthDays;
  const trend = groupByPeriod(scoped, trendPeriod).map((item) => ({ ...item, average: item.count ? item.total / item.count : 0 }));
  const recurring = recurringTransactions(scoped).slice(0, 5);
  const concentrationMetrics = concentration(scoped);
  return (
    <Layout active="/analytics/stats">
      <Header
        eyebrow="Analytics / statistical lens"
        title="Statistics"
        action={<span className="eyebrow">IQR · STDEV · Z-SCORE</span>}
      />
      <div className="filters stats-filters">
        <div className="field">
          <label htmlFor="stats-range">Analysis window</label>
          <select id="stats-range" value={range} onChange={(event) => setRange(event.target.value)}>
            <option>All time</option>
            <option>30 days</option>
            <option>90 days</option>
            <option>365 days</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="stats-category">Category</label>
          <select id="stats-category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            <option>All</option>
            {categories.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="stats-currency">Currency</label>
          <select id="stats-currency" value={currencyFilter} onChange={(event) => setCurrencyFilter(event.target.value)}>
            <option>All</option>
            {currencies.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="stats-method">Payment method</label>
          <select id="stats-method" value={methodFilter} onChange={(event) => setMethodFilter(event.target.value)}>
            <option>All</option>
            {methods.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="stats-budget">Period budget</label>
          <input id="stats-budget" type="number" min="0" step="100" placeholder="Optional" value={budget || ""} onChange={(event) => setBudget(Number(event.target.value) || 0)} />
        </div>
      </div>
      {scopedCurrencies.length > 1 && <div className="notice">Multiple currencies are selected. Aggregates are shown as units and are not converted.</div>}
      <div className="stat-grid">
        <div className="kpi highlight"><div className="kpi-label">Total spent</div><div className="kpi-value">{amount(total)}</div><div className="kpi-meta">{scoped.length} transactions</div></div>
        <div className="kpi"><div className="kpi-label">Median</div><div className="kpi-value">{amount(median(values))}</div><div className="kpi-meta">typical transaction</div></div>
        <div className="kpi"><div className="kpi-label">Volatility</div><div className="kpi-value">{coefficientOfVariation(values).toFixed(0)}%</div><div className="kpi-meta">coefficient of variation</div></div>
        <div className="kpi"><div className="kpi-label">Unusual</div><div className="kpi-value">{outlierRecords.length}</div><div className="kpi-meta">IQR or z-score flags</div></div>
        <div className="kpi"><div className="kpi-label">Month forecast</div><div className="kpi-value">{amount(forecast)}</div><div className="kpi-meta">based on observed daily pace</div></div>
        <div className={`kpi ${budget && total > budget ? "budget-over" : ""}`}><div className="kpi-label">Budget status</div><div className="kpi-value">{budget ? `${Math.round(total / budget * 100)}%` : "—"}</div><div className="kpi-meta">{budget ? `${amount(Math.max(0, budget - total))} remaining` : "set a period budget"}</div></div>
      </div>
      <div className="panel-grid">
        <div className="panel">
          <div className="panel-head"><div><h2>Spending trend</h2><div className="panel-subtitle">Spend and transaction volume over time</div></div><div className="range-switcher compact">{([['day', 'Day'], ['week', 'Week'], ['month', 'Month']] as const).map(([value, label]) => <button className={trendPeriod === value ? "active" : ""} onClick={() => setTrendPeriod(value)} key={value}>{label}</button>)}</div></div>
          <div className="chart-wrap"><ResponsiveContainer><ComposedChart data={trend}><CartesianGrid stroke="#edf0ea" vertical={false} /><XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis yAxisId="left" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis yAxisId="right" orientation="right" allowDecimals={false} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip formatter={(value, name) => name === "count" ? [value, "Transactions"] : [amount(Number(value) || 0), "Spend"]} /><Bar yAxisId="left" dataKey="total" fill="#c8f169" radius={[4, 4, 0, 0]} /><Line yAxisId="right" dataKey="count" stroke="#ff8a72" strokeWidth={2} dot={false} /></ComposedChart></ResponsiveContainer></div>
        </div>
        <div className="panel">
          <div className="panel-head"><div><h2>Value distribution</h2><div className="panel-subtitle">Transaction frequency by amount band</div></div></div>
          <div className="chart-wrap"><ResponsiveContainer><BarChart data={histogram}><CartesianGrid stroke="#edf0ea" vertical={false} /><XAxis dataKey="range" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip /><Bar dataKey="count" fill="#72a9ff" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
        </div>
      </div>
      <div className="panel-grid">
        <div className="panel">
          <div className="panel-head"><div><h2>Distribution summary</h2><div className="panel-subtitle">Robust spread metrics for the selected data</div></div></div>
          <div className="metric-list">
            <div className="metric-row"><b>Average</b><span>{amount(mean)}</span><span>STDEV {amount(deviation)}</span><span>Variance {amount(variance(values))}</span></div>
            <div className="metric-row"><b>Quartiles</b><span>Q1 {amount(quartile.q1)}</span><span>Median {amount(quartile.q2)}</span><span>Q3 {amount(quartile.q3)}</span></div>
            <div className="metric-row"><b>Interquartile range</b><span>{amount(iqr(values))}</span><span>Mode {amount(mode(values))}</span><span>{percentileRank(mean, values).toFixed(0)}th pct. average</span></div>
          </div>
        </div>
        <div className="panel">
          <div className="panel-head"><div><h2>Spending concentration</h2><div className="panel-subtitle">How concentrated the selected spend is</div></div></div>
          <div className="metric-list">
            <div className="metric-row"><b>Top category</b><span>{categoryTotals[0]?.[0] || "—"}</span><span>{amount(categoryTotals[0]?.[1] || 0)}</span><span>{total ? ((categoryTotals[0]?.[1] || 0) / total * 100).toFixed(1) : 0}%</span></div>
            <div className="metric-row"><b>Top three categories</b><span>{topThreeShare.toFixed(1)}%</span><span>of spend</span><span>{categoryTotals.length} categories</span></div>
            <div className="metric-row"><b>Observed period</b><span>{observedDays} days</span><span>{firstDate.toLocaleDateString()}</span><span>{lastDate.toLocaleDateString()}</span></div>
          </div>
        </div>
      </div>
      <div className="panel-grid">
        <div className="panel">
          <div className="panel-head"><div><h2>Weekday intensity</h2><div className="panel-subtitle">Average transaction and count by day</div></div></div>
          <div className="weekday-grid">{weekdays.map((item) => <div className="weekday-cell" key={item.name}><span>{item.name}</span><b>{amount(item.average)}</b><small>{item.count} tx</small></div>)}</div>
        </div>
        <div className="panel">
          <div className="panel-head"><div><h2>Concentration</h2><div className="panel-subtitle">How dependent spending is on a few categories</div></div></div>
          <div className="metric-list"><div className="metric-row"><b>Top category</b><span>{concentrationMetrics.topOneShare.toFixed(1)}%</span><span>of spend</span><span /></div><div className="metric-row"><b>Top three</b><span>{concentrationMetrics.topThreeShare.toFixed(1)}%</span><span>of spend</span><span /></div><div className="metric-row"><b>HHI score</b><span>{concentrationMetrics.hhi.toFixed(0)}</span><span>lower is more diverse</span><span /></div></div>
        </div>
      </div>
      <div className="panel table-panel">
        <div className="panel-head"><div><h2>Recurring patterns</h2><div className="panel-subtitle">Repeated amount and description combinations in the selected data</div></div><span className="badge up">{recurring.length} found</span></div>
        <div className="metric-list">{recurring.length ? recurring.map((item) => <div className="metric-row" key={item.key}><b>{item.description}</b><span>{amount(item.average)} average</span><span>{item.items.length} occurrences</span><span>{item.category}</span></div>) : <div className="empty">No repeated expense patterns in this view.</div>}</div>
      </div>
      <div className="panel">
        <div className="panel-head">
          <div>
            <h2>Distribution by category</h2>
            <div className="panel-subtitle">
              Average, robust spread, and relative volatility
            </div>
          </div>
        </div>
        <div className="metric-list">
          <div className="metric-row header">
            <span>Category</span>
            <span>Average</span>
            <span>Median / IQR</span>
            <span>CV / samples</span>
          </div>
          {rows.map((row) => (
            <div className="metric-row" key={row.category}>
              <b>
                <i
                  className="category-dot"
                  style={{ background: colorFor(row.category, categories) }}
                />
                {row.category}
              </b>
              <span>{amount(row.mean)}</span>
              <span>{amount(row.median)} / {amount(row.q3 - row.q1)}</span>
              <span>{row.cv.toFixed(0)}% / {row.values.length}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="panel table-panel">
        <div className="panel-head">
          <div>
            <h2>Potential outliers</h2>
            <div className="panel-subtitle">
              Flagged by category using the 1.5 × IQR fence or z-score ≥ 2.
            </div>
          </div>
          <span className="badge down">{outlierRecords.length} flagged</span>
        </div>
        <div className="table-scroll">
          {outlierRecords.length ? <table><thead><tr><th>Date</th><th>Category</th><th>Amount</th><th>Z-score</th><th>Reason</th></tr></thead><tbody>{outlierRecords.map(({ item, score, upperFence }) => <tr key={item.id}><td className="muted">{dateLabel(item.date_time)}</td><td>{categoryName(item)}</td><td className="amount">{money(numeric(item.value), item.currency)}</td><td>{score.toFixed(2)}</td><td className="muted">{numeric(item.value) > upperFence ? "Above IQR fence" : "At least 2 STDEV"}</td></tr>)}</tbody></table> : <div className="empty">No unusual transactions in this view.</div>}
        </div>
      </div>
      <div className="panel-grid">
        <div className="panel">
          <div className="panel-head"><div><h2>Weekday pattern</h2><div className="panel-subtitle">Average transaction and frequency</div></div></div>
          <div className="metric-list">{weekdays.map((item) => <div className="metric-row" key={item.name}><b>{item.name}</b><span>{amount(item.average)}</span><span>{item.count} transactions</span><span /></div>)}</div>
        </div>
        <div className="panel">
          <div className="panel-head"><div><h2>Time of day</h2><div className="panel-subtitle">Average transaction by local hour</div></div></div>
          <div className="metric-list">{timeBuckets.map((item) => <div className="metric-row" key={item.name}><b>{item.name}</b><span>{amount(item.average)}</span><span>{item.count} transactions</span><span /></div>)}</div>
        </div>
      </div>
      <div className="panel-grid">
        <div className="panel">
          <div className="panel-head"><div><h2>Payment method</h2><div className="panel-subtitle">Share and average behavior</div></div></div>
          <div className="metric-list">{paymentRows.map((item) => <div className="metric-row" key={item.name}><b>{item.name}</b><span>{amount(item.spend)}</span><span>{item.share.toFixed(1)}% share</span><span /></div>)}</div>
        </div>
        <div className="panel">
          <div className="panel-head"><div><h2>Category insights</h2><div className="panel-subtitle">Most common values and percentile rank</div></div></div>
          <div className="metric-list">{rows.map((row) => <div className="metric-row" key={row.category}><b>{row.category}</b><span>mode {amount(row.mode)}</span><span>{row.values.length} samples</span><span className="muted">{percentileRank(row.mean, row.values).toFixed(0)}th pct. avg</span></div>)}</div>
        </div>
      </div>
      <div className="panel table-panel">
        <div className="panel-head">
          <div>
            <h2>Transaction drill-down</h2>
            <div className="panel-subtitle">
              The current filter is ready to inspect in the ledger.
            </div>
          </div>
          <a className="button" href={`/transactions${categoryFilter === "All" ? "" : `?category=${encodeURIComponent(categoryFilter)}`}`}>View transactions</a>
        </div>
      </div>
    </Layout>
  );
}

function Explore({
  transactions,
  categories,
}: {
  transactions: Transaction[];
  categories: string[];
}) {
  const monthKeys = [...new Set(transactions.map((item) => monthKey(item.date_time)))].sort().slice(-6);
  const monthValue = (category: string, month: string) =>
    sum(
      transactions
        .filter(
          (item) =>
            categoryName(item) === category &&
            monthKey(item.date_time) === month,
        )
        .map((item) => numeric(item.value)),
    );
  const payments = Object.entries(
    groupSum(transactions, (item) => item.paymentmethod),
  ).map(([name, value]) => ({ name, value }));
  const currencies = Object.entries(
    groupSum(transactions, (item) => item.currency),
  );
  return (
    <Layout active="/analytics/explore">
      <Header
        eyebrow="Analytics / explore"
        title="Explore the ledger"
        action={<span className="eyebrow">Click a cell to drill down</span>}
      />
      <div className="panel">
        <div className="panel-head">
          <div>
            <h2>Category × month</h2>
            <div className="panel-subtitle">
              Spend intensity by category and calendar month
            </div>
          </div>
        </div>
        <div className="heatmap">
          <div className="heat-row">
            <div className="heat-cell label" />
            {monthKeys.map((month) => (
              <div className="heat-cell label" key={month}>
                {monthLabel(month)}
              </div>
            ))}
          </div>
          {categories.map((category) => (
            <div className="heat-row" key={category}>
              <div className="heat-cell label">{category}</div>
              {monthKeys.map((month) => {
                const value = monthValue(category, month);
                const [year, monthNumber] = month.split("-").map(Number);
                const start = `${month}-01`;
                const end = new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10);
                return (
                  <a
                    className="heat-cell"
                    href={`/transactions?category=${encodeURIComponent(category)}&start=${start}&end=${end}`}
                    key={month}
                    style={{
                      background: value
                        ? `color-mix(in srgb, ${colorFor(category, categories)} ${Math.min(88, 20 + value / 20)}%, white)`
                        : "#f2f3ee",
                    }}
                  >
                    {value ? money(value) : "—"}
                  </a>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="panel-grid">
        <div className="panel">
          <div className="panel-head">
            <div>
              <h2>Payment method</h2>
              <div className="panel-subtitle">Spend by payment method</div>
            </div>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={payments}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={62}
                  outerRadius={96}
                >
                  {payments.map((item, index) => (
                    <Cell
                      fill={colors[index % colors.length]}
                      key={item.name}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => money(Number(value) || 0)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="legend">
            {payments.map((item) => (
              <div className="legend-row" key={item.name}>
                <span>{item.name}</span>
                <span className="legend-value">{money(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <div className="panel-head">
            <div>
              <h2>Currency totals</h2>
              <div className="panel-subtitle">
                Separate totals, no conversion applied
              </div>
            </div>
          </div>
          <div className="metric-list">
            {currencies.map(([currency, value]) => (
              <div className="metric-row" key={currency}>
                <b>{currency}</b>
                <span>{money(value, currency)}</span>
                <span />
                <span />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}

function Reports({
  transactions,
  categories,
}: {
  transactions: Transaction[];
  categories: string[];
}) {
  const latestTransaction = transactions.reduce<Transaction | undefined>((latest, item) => !latest || new Date(item.date_time).getTime() > new Date(latest.date_time).getTime() ? item : latest, undefined);
  const reportMonth = latestTransaction ? monthKey(latestTransaction.date_time) : monthKey(new Date());
  const reportTransactions = transactions.filter((item) => monthKey(item.date_time) === reportMonth);
  const totals = Object.entries(groupSum(reportTransactions, categoryName)).sort(
    (a, b) => b[1] - a[1],
  );
  const total = sum(totals.map((item) => item[1]));
  let running = 0;
  const pareto = totals.map(([name, value]) => {
    running += value;
    return {
      name,
      spend: value,
      cumulative: total ? (running / total) * 100 : 0,
    };
  });
  const top = totals[0] || ["No category", 0];
  const exportCsv = () => {
    const rows = [
      ["date", "category", "value", "currency", "paymentmethod", "description"],
      ...reportTransactions.map((item) => [
        item.date_time,
        categoryName(item),
        item.value,
        item.currency,
        item.paymentmethod,
        item.description || "",
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `spendline-${reportMonth}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <Layout active="/analytics/reports">
      <Header
        eyebrow="Analytics / reporting"
        title="Reports"
        action={
          <button className="button lime" onClick={exportCsv}>
            ↓ Export CSV
          </button>
        }
      />
      <div className="report-grid">
        <div className="report-copy">
          <div className="eyebrow">{monthLabel(reportMonth)} digest</div>
          <div className="report-number">{money(total)}</div>
          <p>
            You spent {money(total)} across {reportTransactions.length} transactions this period. Your top category was {top[0]}{" "}
            at {money(top[1])}. That is{" "}
            {total ? ((top[1] / total) * 100).toFixed(0) : 0}% of recorded
            spend.
          </p>
        </div>
        <div className="panel">
          <div className="panel-head">
            <div>
              <h2>Category Pareto</h2>
              <div className="panel-subtitle">
                Cumulative share of spend, sorted descending
              </div>
            </div>
            <span className="eyebrow">80 / 20</span>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer>
              <ComposedChart data={pareto}>
                <CartesianGrid stroke="#edf0ea" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 100]}
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value, name) => {
                    const amount = Number(value) || 0;
                    const series = String(name);
                    return [
                      series === "cumulative"
                        ? `${amount.toFixed(1)}%`
                        : money(amount),
                      series,
                    ];
                  }}
                />
                <Bar
                  yAxisId="left"
                  dataKey="spend"
                  fill="#c8f169"
                  radius={[5, 5, 0, 0]}
                />
                <Line
                  yAxisId="right"
                  dataKey="cumulative"
                  stroke="#ff8a72"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <div className="panel table-panel">
        <div className="panel-head">
          <div>
            <h2>Digest details</h2>
            <div className="panel-subtitle">
              Fixed-template reporting from computed values
            </div>
          </div>
        </div>
        <div className="metric-list">
          <div className="metric-row">
            <b>Total spent</b>
            <span>{money(total)}</span>
            <span>period</span>
            <span />
          </div>
          <div className="metric-row">
            <b>Top category</b>
            <span>{top[0]}</span>
            <span>{money(top[1])}</span>
            <span />
          </div>
          <div className="metric-row">
            <b>Category share</b>
            <span>
              {total ? `${((top[1] / total) * 100).toFixed(1)}%` : "0%"}
            </span>
            <span>of total</span>
            <span />
          </div>
        </div>
      </div>
      <div className="panel-grid">
        <div className="panel">
          <div className="panel-head"><div><h2>Report highlights</h2><div className="panel-subtitle">Decision-ready signals for {monthLabel(reportMonth)}</div></div></div>
          <div className="metric-list">
            <div className="metric-row"><b>Average transaction</b><span>{money(average(reportTransactions.map((item) => numeric(item.value))))}</span><span>{reportTransactions.length} records</span><span /></div>
            <div className="metric-row"><b>Largest transaction</b><span>{money(Math.max(0, ...reportTransactions.map((item) => numeric(item.value))))}</span><span>single purchase</span><span /></div>
            <div className="metric-row"><b>Active days</b><span>{new Set(reportTransactions.map((item) => dateOnly(item.date_time))).size}</span><span>days with spending</span><span /></div>
          </div>
        </div>
        <div className="panel">
          <div className="panel-head"><div><h2>Category ranking</h2><div className="panel-subtitle">Share of this month’s recorded spend</div></div></div>
          <div className="metric-list">{totals.map(([name, value]) => <div className="metric-row" key={name}><b><i className="category-dot" style={{ background: colorFor(name, categories) }} />{name}</b><span>{money(value)}</span><span>{total ? (value / total * 100).toFixed(1) : 0}%</span><span /></div>)}</div>
        </div>
      </div>
    </Layout>
  );
}

function TransactionForm({
  categories,
  mode = "new",
}: {
  categories: string[];
  mode?: "new" | "edit";
}) {
  const isEdit = mode === "edit";
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    value: "",
    currency: "THB",
    category_id: categories[0] || "",
    date_time: "",
    paymentmethod: "Card",
    description: "",
  });
  const setField = (field: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));
  const submit = async () => {
    const value = Number(form.value);
    if (
      !Number.isFinite(value) ||
      value <= 0 ||
      !form.category_id ||
      !form.date_time
    ) {
      setError("Enter a positive value, category, and date.");
      return;
    }
    const payload: TransactionInput = {
      value,
      currency: form.currency,
      category_id: form.category_id,
      date_time: new Date(form.date_time).toISOString(),
      paymentmethod: form.paymentmethod,
      description: form.description || null,
    };
    setSubmitting(true);
    setError("");
    try {
      if (isEdit) {
        const id = window.location.pathname.split("/").filter(Boolean).at(-2);
        if (!id) throw new Error("Missing transaction id.");
        await updateTransaction(id, payload);
      } else await createTransaction(payload);
      setSaved(true);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to save transaction.",
      );
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <Layout active="/transactions">
      <Header
        eyebrow={
          isEdit ? "Ledger / edit transaction" : "Ledger / new transaction"
        }
        title={isEdit ? "Edit expense" : "Add expense"}
        action={
          <a className="button" href="/transactions">
            Cancel
          </a>
        }
      />
      <div className="panel" style={{ maxWidth: 720 }}>
        <div className="filters" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <div className="field">
            <label htmlFor="expense-value">Value</label>
            <input
              id="expense-value"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={form.value}
              onChange={(event) => setField("value", event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="expense-currency">Currency</label>
            <select
              id="expense-currency"
              value={form.currency}
              onChange={(event) => setField("currency", event.target.value)}
            >
              <option>THB</option>
              <option>USD</option>
              <option>EUR</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="expense-category">Category</label>
            <select
              id="expense-category"
              value={form.category_id}
              onChange={(event) => setField("category_id", event.target.value)}
            >
              {categories.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="expense-date">Date & time</label>
            <input
              id="expense-date"
              type="datetime-local"
              value={form.date_time}
              onChange={(event) => setField("date_time", event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="expense-method">Payment method</label>
            <select
              id="expense-method"
              value={form.paymentmethod}
              onChange={(event) =>
                setField("paymentmethod", event.target.value)
              }
            >
              <option>Card</option>
              <option>Cash</option>
              <option>Transfer</option>
              <option>PromptPay</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="expense-description">Description</label>
            <input
              id="expense-description"
              placeholder="What was this for?"
              value={form.description}
              onChange={(event) => setField("description", event.target.value)}
            />
          </div>
        </div>
        <div className="inline-actions">
          <button
            className="button primary"
            disabled={submitting}
            onClick={submit}
          >
            {submitting
              ? "Saving…"
              : isEdit
                ? "Save changes"
                : "Save transaction"}
          </button>
          <a className="button" href="/transactions">
            Cancel
          </a>
          {saved && <span className="muted">Transaction saved.</span>}
          {error && (
            <span className="error" role="alert">
              {error}
            </span>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default function App({ page }: { page: string }) {
  const normalizedPage = resolveRoutePage(page);
  const needsTransactions = normalizedPage !== "new";
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([
      needsTransactions ? loadTransactions() : Promise.resolve([]),
      loadCategoryRecords(),
    ])
      .then(([items, records]) => {
        const names = records.length
          ? records.map((category) => category.name)
          : [
              ...new Set(
                items.map((item) =>
                  typeof item.category === "string"
                    ? item.category
                    : item.category?.name || item.category_id,
                ),
              ),
            ];
        setTransactions(attachCategoryNames(items, records));
        setCategories(names);
      })
      .catch((loadError) =>
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load expense data.",
        ),
      );
  }, [needsTransactions]);
  if (error)
    return (
      <main className="main">
        <div className="panel error-state">
          <h1>Unable to load your expenses</h1>
          <p>{error}</p>
          <button
            className="button primary"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </main>
    );
  if (!transactions)
    return (
      <div className="app-shell">
        <aside className="sidebar">
          <div className="brand">
            <span className="brand-mark">∕</span>Spendline
          </div>
        </aside>
        <main className="main">
          <div className="kpi-grid">
            {[1, 2, 3, 4, 5].map((item) => (
              <div className="skeleton" key={item} />
            ))}
          </div>
        </main>
      </div>
    );
  if (normalizedPage === "new")
    return (
      <TransactionForm
        categories={categories}
        mode={page === "edit" ? "edit" : "new"}
      />
    );
  if (normalizedPage === "transactions")
    return <TransactionsPage transactions={transactions} categories={categories} />;
  if (normalizedPage === "compare")
    return <Compare transactions={transactions} categories={categories} />;
  if (normalizedPage === "stats")
    return <Stats transactions={transactions} categories={categories} />;
  if (normalizedPage === "explore")
    return <Explore transactions={transactions} categories={categories} />;
  if (normalizedPage === "reports")
    return <Reports transactions={transactions} categories={categories} />;
  return <DashboardPage transactions={transactions} categories={categories} />;
}
