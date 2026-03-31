import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Activity, Bot, ShieldCheck } from "lucide-react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { financeService } from "../../services/finance.service";
import { formatCurrency } from "../../utils/helpers";

const Advisor = () => {
  const [health, setHealth] = useState(null);
  const [advisor, setAdvisor] = useState({ insights: [], summary: {}, metadata: {} });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [question, setQuestion] = useState("");
  const scope = "overall";

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(false);

    try {
      const healthRes = await financeService.getAdvisorHealth();
      setHealth(healthRes?.data || null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const source = advisor.metadata?.source || "rules";
  const responseScope = advisor.metadata?.scope || scope;
  const askedQuestion = advisor.metadata?.question || "";
  const advisorNote = advisor.metadata?.note || "";
  const status = health?.status || "unknown";
  const provider = health?.advisor?.provider || "openai";
  const providerConfigured = Boolean(health?.advisor?.providerConfigured);
  const summary = advisor.summary || {};

  const handleAsk = async () => {
    const cleanQuestion = question.trim();
    if (!cleanQuestion) return;
    setLoading(true);
    setRefreshing(true);
    try {
      const { data } = await financeService.queryAdvisor({ scope, question: cleanQuestion });
      setAdvisor(data || { insights: [], summary: {}, metadata: {} });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 animate-fade-up">
        <div>
          <h1 className="page-title">Advisor</h1>
          <p className="muted-text text-sm mt-1">
            Dedicated AI analysis view using your finance, bank, investments, goals, and habits data.
          </p>
          <p className="muted-text text-xs mt-1 uppercase tracking-[0.14em]">Scope: {responseScope}</p>
        </div>
        <Button size="sm" loading={refreshing} onClick={() => load(true)}>
          <RefreshCw size={13} /> Refresh
        </Button>
      </div>

      <Card className="animate-fade-up animate-delay-50">
        <div className="text-xs uppercase tracking-[0.16em] muted-text font-display font-600 mb-3">Scope</div>
        <p className="text-sm font-display font-700">Overall</p>
        <p className="text-xs muted-text mt-2">This page always analyzes full cross-section data.</p>
        <div className="mt-4 rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
          <label className="text-xs muted-text uppercase tracking-[0.14em]">Ask Advisor</label>
          <div className="flex flex-col sm:flex-row gap-2 mt-2">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAsk();
                }
              }}
              placeholder="Ask an overall question..."
              className="input-field flex-1"
            />
            <Button size="sm" loading={refreshing} onClick={handleAsk}>Ask</Button>
          </div>
          {!askedQuestion ? <p className="text-xs muted-text mt-2">No analysis runs automatically. Ask a question to generate output.</p> : null}
          {askedQuestion ? <p className="text-xs muted-text mt-2">Q: {askedQuestion}</p> : null}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-fade-up animate-delay-100">
        <Card>
          <div className="muted-text text-xs mb-2 uppercase tracking-[0.16em]">Advisor Status</div>
          <div className="flex items-center gap-2 text-lg font-display font-700">
            <Activity size={16} className="text-sky-300" />
            <span>{status}</span>
          </div>
          <p className="text-xs muted-text mt-2">Endpoint: <code>/api/finance/advisor/health</code></p>
        </Card>

        <Card>
          <div className="muted-text text-xs mb-2 uppercase tracking-[0.16em]">Provider</div>
          <div className="flex items-center gap-2 text-lg font-display font-700">
            <Bot size={16} className="text-amber-300" />
            <span>{provider}</span>
          </div>
          <p className="text-xs muted-text mt-2">
            Configured: {providerConfigured ? "Yes" : "No (rules fallback only)"}
          </p>
        </Card>

        <Card>
          <div className="muted-text text-xs mb-2 uppercase tracking-[0.16em]">Current Source</div>
          <div className="flex items-center gap-2 text-lg font-display font-700">
            <ShieldCheck size={16} className="text-green-300" />
            <span>{source}</span>
          </div>
          <p className="text-xs muted-text mt-2">From <code>/api/finance/advisor</code></p>
        </Card>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 animate-fade-up animate-delay-200">
        <Card>
          <div className="muted-text text-xs mb-1">Total Income</div>
          <div className="text-lg font-display font-700 text-green-300">{formatCurrency(summary.totalIncome || 0)}</div>
        </Card>
        <Card>
          <div className="muted-text text-xs mb-1">Total Expense</div>
          <div className="text-lg font-display font-700 text-rose-300">{formatCurrency(summary.totalExpense || 0)}</div>
        </Card>
        <Card>
          <div className="muted-text text-xs mb-1">Tracked Balance</div>
          <div className="text-lg font-display font-700 text-amber-300">{formatCurrency(summary.trackedBalance || 0)}</div>
        </Card>
        <Card>
          <div className="muted-text text-xs mb-1">Linked Balance</div>
          <div className="text-lg font-display font-700 text-sky-300">{formatCurrency(summary.linkedBalance || 0)}</div>
        </Card>
        <Card>
          <div className="muted-text text-xs mb-1">Synced Transactions</div>
          <div className="text-lg font-display font-700">{summary.syncedTransactions || 0}</div>
        </Card>
      </div>

      {advisorNote ? (
        <div className="rounded-2xl border px-4 py-3 text-sm text-amber-300" style={{ borderColor: "rgba(245,158,11,0.35)", background: "rgba(245,158,11,0.08)" }}>
          {advisorNote}
        </div>
      ) : null}

      <Card className="animate-fade-up animate-delay-300">
        <h3 className="section-title mb-4">Advisor Insights</h3>
        {loading ? (
          <div className="text-sm muted-text py-8 text-center">Loading advisor analysis...</div>
        ) : advisor.insights?.length ? (
          <div className="space-y-3">
            {advisor.insights.map((insight) => {
              const toneClass = insight.tone === "warning"
                ? "border-rose-500/20 bg-rose-500/8"
                : insight.tone === "positive"
                  ? "border-emerald-500/20 bg-emerald-500/8"
                  : "border-sky-500/20 bg-sky-500/8";

              return (
                <div key={insight.id} className={`rounded-2xl p-4 border ${toneClass}`}>
                  <p className="text-sm font-display font-700">{insight.title}</p>
                  <p className="text-xs muted-text mt-2 leading-5">{insight.summary}</p>
                  <p className="text-xs mt-2 text-white/80 leading-5">{insight.action}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-sm muted-text py-8 text-center">
            No advisor output yet. Ask a question to run analysis.
          </div>
        )}
      </Card>
    </div>
  );
};

export default Advisor;
