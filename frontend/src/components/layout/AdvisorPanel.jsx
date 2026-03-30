import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BrainCircuit, RefreshCcw } from "lucide-react";
import { financeService } from "../../services/finance.service";

const toneStyles = {
  warning: "text-rose-300 border-rose-500/20 bg-rose-500/8",
  positive: "text-emerald-300 border-emerald-500/20 bg-emerald-500/8",
  neutral: "text-sky-300 border-sky-500/20 bg-sky-500/8",
};

const scopeTitle = (scope = "overall") => {
  const value = String(scope || "overall");
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const AdvisorPanel = ({ scope = "overall", onClose }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [insights, setInsights] = useState([]);
  const [source, setSource] = useState("rules");
  const [resolvedScope, setResolvedScope] = useState(scope);
  const [note, setNote] = useState("");
  const [question, setQuestion] = useState("");
  const [askedQuestion, setAskedQuestion] = useState("");

  const advisorPath = useMemo(
    () => "/advisor",
    []
  );

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const { data } = await financeService.getAdvisorInsights({ scope });
      setInsights(data?.insights || []);
      setSource(data?.metadata?.source || "rules");
      setResolvedScope(data?.metadata?.scope || scope);
      setAskedQuestion(data?.metadata?.question || "");
      setNote(data?.metadata?.note || "");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load advisor insights");
      setInsights([]);
      setResolvedScope(scope);
      setAskedQuestion("");
      setNote("");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [scope]);

  const handleAsk = async () => {
    const cleanQuestion = question.trim();
    if (!cleanQuestion) return;

    setRefreshing(true);
    setError("");
    try {
      const { data } = await financeService.queryAdvisor({ scope, question: cleanQuestion });
      setInsights(data?.insights || []);
      setSource(data?.metadata?.source || "rules");
      setResolvedScope(data?.metadata?.scope || scope);
      setAskedQuestion(data?.metadata?.question || cleanQuestion);
      setNote(data?.metadata?.note || "");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to ask advisor");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div
      className="absolute right-0 top-[calc(100%+0.75rem)] w-[24rem] max-w-[calc(100vw-2rem)] rounded-2xl border shadow-2xl overflow-hidden"
      style={{
        background: "linear-gradient(180deg, rgba(25, 30, 33, 0.98), rgba(18, 22, 24, 0.98))",
        borderColor: "var(--border-light)",
      }}
    >
      <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-display font-700">Advisor</p>
            <p className="text-xs muted-text">
              Scope: {scopeTitle(resolvedScope)} | Source: {source}
            </p>
          </div>
          <button
            onClick={() => load(true)}
            className="p-2 rounded-lg hover:bg-white/5 muted-text hover:text-white transition-colors"
            title="Refresh advisor"
          >
            <RefreshCcw size={14} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className="max-h-[24rem] overflow-y-auto">
        <div className="px-3 pt-3">
          <div className="rounded-xl border p-2.5" style={{ borderColor: "var(--border)" }}>
            <label className="text-[11px] muted-text uppercase tracking-[0.14em]">Ask Advisor</label>
            <div className="flex items-center gap-2 mt-2">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAsk();
                  }
                }}
                placeholder={`Ask about ${scopeTitle(scope)}...`}
                className="input-field h-9 text-xs"
              />
              <button
                type="button"
                onClick={handleAsk}
                className="px-3 h-9 rounded-lg text-xs font-display font-700"
                style={{ background: "var(--accent-gold)", color: "var(--bg-primary)" }}
              >
                Ask
              </button>
            </div>
            {askedQuestion ? <p className="text-[11px] muted-text mt-2">Q: {askedQuestion}</p> : null}
          </div>
        </div>
        {loading ? (
          <div className="px-4 py-8 text-center text-sm muted-text">Loading advisor...</div>
        ) : error ? (
          <div className="px-4 py-8 text-center text-sm text-rose-300">{error}</div>
        ) : insights.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center bg-white/5 text-amber-300">
              <BrainCircuit size={18} />
            </div>
            <p className="font-display font-600">No insights yet</p>
            <p className="text-xs muted-text mt-1">Add more activity in this section and refresh.</p>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {note ? (
              <div className="rounded-xl border p-2 text-xs text-amber-300" style={{ borderColor: "rgba(245,158,11,0.35)" }}>
                {note}
              </div>
            ) : null}
            {insights.slice(0, 4).map((insight) => (
              <div key={insight.id} className={`rounded-xl border p-3 ${toneStyles[insight.tone] || toneStyles.neutral}`}>
                <p className="text-sm font-display font-700">{insight.title}</p>
                <p className="text-xs mt-1 muted-text leading-5">{insight.summary}</p>
                <p className="text-xs mt-2 text-white/80 leading-5">{insight.action}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t" style={{ borderColor: "var(--border)" }}>
        <Link
          to={advisorPath}
          onClick={onClose}
          className="text-xs gold-text font-display font-700 hover:opacity-90 transition-opacity"
        >
          Open full advisor page
        </Link>
      </div>
    </div>
  );
};

export default AdvisorPanel;
