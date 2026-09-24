import { useState } from "react";
import { periodTransactions, type Transaction } from "../lib/analytics";
import { CategoryPie, Header, Kpis, Layout, Range, Recent, Trend } from "./shared";

export default function DashboardPage({ transactions, categories }: { transactions: Transaction[]; categories: string[] }) {
  const [range, setRange] = useState<"Week" | "Month" | "Year">("Month");
  const visible = periodTransactions(transactions, range);
  return (
    <Layout active="/">
      <Header eyebrow="Expense overview" title="Good morning, Tanakorn." action={<><Range value={range} onChange={(value) => setRange(value as typeof range)} /><a className="button lime" href="/transactions/new">+ Add expense</a></>} />
      <Kpis transactions={visible} allTransactions={transactions} />
      <div className="panel-grid"><Trend transactions={visible} /><CategoryPie transactions={visible} categories={categories} /></div>
      <Recent transactions={visible} categories={categories} />
    </Layout>
  );
}