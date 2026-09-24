import type { ReactNode } from "react";
import {
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
  groupSum,
  numeric,
  median,
  sum,
  type Transaction,
} from "../lib/analytics";

export const colors = [
  "#c8f169",
  "#ff8a72",
  "#72a9ff",
  "#9e8cff",
  "#f5b65c",
  "#7dd3c7",
  "#e7a6d7",
];

export const money = (amount: number, currency = "THB") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);

export const dateLabel = (date: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    new Date(date),
  );

export const colorFor = (name: string, categories: string[]) =>
  colors[Math.max(0, categories.indexOf(name)) % colors.length];

const nav = [
  ["/", "◒", "Overview"],
  ["/transactions", "≡", "Transactions"],
  ["/analytics/compare", "↗", "Compare"],
  ["/analytics/stats", "σ", "Statistics"],
  ["/analytics/explore", "⌗", "Explore"],
  ["/analytics/reports", "▤", "Reports"],
];

export function Layout({
  children,
  active,
}: {
  children: ReactNode;
  active: string;
}) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/">
          <span className="brand-mark">∕</span>Spendline
        </a>
        <div className="nav-label">Workspace</div>
        <nav className="nav-list">
          {nav.map(([href, icon, label]) => (
            <a
              className={`nav-link ${active === href ? "active" : ""}`}
              href={href}
              key={href}
            >
              <span className="nav-icon">{icon}</span>
              {label}
            </a>
          ))}
        </nav>
        <div className="sidebar-foot">
          Personal expense intelligence
          <br />
          <span>Plain math. Clear decisions.</span>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}

export function Header({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <header className="topbar">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
      </div>
      <div className="top-actions">
        <button className="button" type="button" onClick={() => window.location.reload()} aria-label="Refresh data">
          Refresh
        </button>
        {action}
      </div>
    </header>
  );
}

export function Range({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="range-switcher">
      {["Week", "Month", "Year"].map((item) => (
        <button
          className={value === item ? "active" : ""}
          onClick={() => onChange(item)}
          key={item}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

export function Kpis({ transactions }: { transactions: Transaction[] }) {
  const values = transactions.map((item) => numeric(item.value));
  const currency = transactions[0]?.currency || "THB";
  return (
    <div className="kpi-grid">
      <div className="kpi highlight">
        <div className="kpi-label">Total spent</div>
        <div className="kpi-value">{money(sum(values), currency)}</div>
        <div className="kpi-meta">current period</div>
      </div>
      <div className="kpi">
        <div className="kpi-label">Avg. transaction</div>
        <div className="kpi-value">{money(average(values), currency)}</div>
        <div className="kpi-meta">per transaction</div>
      </div>
      <div className="kpi">
        <div className="kpi-label">Median value</div>
        <div className="kpi-value">{money(median(values), currency)}</div>
        <div className="kpi-meta">middle transaction</div>
      </div>
      <div className="kpi">
        <div className="kpi-label">Transactions</div>
        <div className="kpi-value">{values.length}</div>
        <div className="kpi-meta">recorded items</div>
      </div>
      <div className="kpi">
        <div className="kpi-label">Range</div>
        <div className="kpi-value">
          {money(values.length ? Math.min(...values) : 0, currency)}
        </div>
        <div className="kpi-meta">
          min / {money(values.length ? Math.max(...values) : 0, currency)} max
        </div>
      </div>
    </div>
  );
}

export function CategoryPie({
  transactions,
  categories,
}: {
  transactions: Transaction[];
  categories: string[];
}) {
  const data = Object.entries(groupSum(transactions, categoryName)).map(
    ([name, value]) => ({ name, value }),
  );
  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h2>Where it goes</h2>
          <div className="panel-subtitle">Spend by category</div>
        </div>
      </div>
      <div className="chart-wrap">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={68} outerRadius={100} paddingAngle={3}>
              {data.map((item) => (
                <Cell fill={colorFor(item.name, categories)} key={item.name} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => money(Number(value) || 0)} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="legend">
        {data.map((item) => (
          <div className="legend-row" key={item.name}>
            <span className="legend-name">
              <i className="swatch" style={{ background: colorFor(item.name, categories) }} />
              {item.name}
            </span>
            <span className="legend-value">{money(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Trend({ transactions }: { transactions: Transaction[] }) {
  const grouped = transactions.reduce<Record<string, number>>((result, item) => {
    const key = dateLabel(item.date_time);
    result[key] = (result[key] || 0) + numeric(item.value);
    return result;
  }, {});
  const data = Object.entries(grouped).reverse().map(([date, value]) => ({ date, value }));
  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h2>Spending rhythm</h2>
          <div className="panel-subtitle">Daily spend, current period</div>
        </div>
        <span className="eyebrow">THB</span>
      </div>
      <div className="chart-wrap">
        <ResponsiveContainer>
          <ComposedChart data={data}>
            <CartesianGrid stroke="#edf0ea" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={35} />
            <Tooltip formatter={(value) => money(Number(value) || 0)} />
            <Line type="monotone" dataKey="value" stroke="#202422" strokeWidth={2.5} dot={{ r: 3, fill: "#c8f169", stroke: "#202422" }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function Recent({ transactions, categories }: { transactions: Transaction[]; categories: string[] }) {
  return (
    <div className="panel table-panel">
      <div className="panel-head">
        <div>
          <h2>Recent transactions</h2>
          <div className="panel-subtitle">Your latest activity</div>
        </div>
        <a className="button" href="/transactions">View all →</a>
      </div>
      <Table transactions={transactions.slice(0, 5)} categories={categories} />
    </div>
  );
}

export function Table({ transactions, categories }: { transactions: Transaction[]; categories: string[] }) {
  return (
    <div className="table-scroll">
      {transactions.length ? (
        <table>
          <thead><tr><th>Date</th><th>Category</th><th>Details</th><th>Method</th><th>Amount</th></tr></thead>
          <tbody>
            {transactions.map((item) => (
              <tr key={item.id}>
                <td className="muted" data-label="Date">{dateLabel(item.date_time)}</td>
                <td data-label="Category"><i className="category-dot" style={{ background: colorFor(categoryName(item), categories) }} />{categoryName(item)}</td>
                <td data-label="Details">{item.description || "—"}</td>
                <td className="muted" data-label="Method">{item.paymentmethod}</td>
                <td className="amount" data-label="Amount">{money(numeric(item.value), item.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <div className="empty">No transactions match this view.</div>}
    </div>
  );
}