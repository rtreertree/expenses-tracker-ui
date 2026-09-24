import { useMemo, useState } from "react";
import { categoryName, dateOnly, numeric, type Transaction } from "../lib/analytics";
import { Header, Layout, Table } from "./shared";

export default function TransactionsPage({ transactions, categories }: { transactions: Transaction[]; categories: string[] }) {
  const params = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(params.get("category") || "All");
  const [method, setMethod] = useState("All");
  const [currency, setCurrency] = useState("All");
  const [startDate, setStartDate] = useState(params.get("start") || "");
  const [endDate, setEndDate] = useState(params.get("end") || "");
  const [sort, setSort] = useState("date");
  const filtered = useMemo(() => transactions.filter((item) =>
    (!query || (item.description || "").toLowerCase().includes(query.toLowerCase())) &&
    (category === "All" || categoryName(item) === category) &&
    (method === "All" || item.paymentmethod === method) &&
    (currency === "All" || item.currency === currency) &&
    (!startDate || dateOnly(item.date_time) >= startDate) &&
    (!endDate || dateOnly(item.date_time) <= endDate),
  ).sort((a, b) => sort === "value" ? numeric(b.value) - numeric(a.value) : new Date(b.date_time).getTime() - new Date(a.date_time).getTime()), [transactions, query, category, method, currency, startDate, endDate, sort]);
  const methods = [...new Set(transactions.map((item) => item.paymentmethod))];
  const currencies = [...new Set(transactions.map((item) => item.currency))];
  return (
    <Layout active="/transactions">
      <Header eyebrow="Ledger / all activity" title="Transactions" action={<a className="button lime" href="/transactions/new">+ Add expense</a>} />
      <div className="filters">
        <div className="field"><label htmlFor="transaction-search">Search description</label><input id="transaction-search" placeholder="Try 'coffee'" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
        <div className="field"><label htmlFor="transaction-category">Category</label><select id="transaction-category" value={category} onChange={(event) => setCategory(event.target.value)}><option>All</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></div>
        <div className="field"><label htmlFor="transaction-method">Payment method</label><select id="transaction-method" value={method} onChange={(event) => setMethod(event.target.value)}><option>All</option>{methods.map((item) => <option key={item}>{item}</option>)}</select></div>
        <div className="field"><label htmlFor="transaction-currency">Currency</label><select id="transaction-currency" value={currency} onChange={(event) => setCurrency(event.target.value)}><option>All</option>{currencies.map((item) => <option key={item}>{item}</option>)}</select></div>
        <div className="field"><label htmlFor="transaction-sort">Sort</label><select id="transaction-sort" value={sort} onChange={(event) => setSort(event.target.value)}><option value="date">Newest first</option><option value="value">Highest value</option></select></div>
        <div className="field"><label htmlFor="transaction-start">From</label><input id="transaction-start" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></div>
        <div className="field"><label htmlFor="transaction-end">To</label><input id="transaction-end" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></div>
      </div>
      <div className="panel"><Table transactions={filtered} categories={categories} /></div>
    </Layout>
  );
}