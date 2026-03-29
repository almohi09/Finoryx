import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, TrendingUp, ArrowLeftRight, Landmark, RefreshCw, ShieldAlert } from "lucide-react";
import { investmentService } from "../../services/investment.service";
import { formatCurrency, formatDate } from "../../utils/helpers";
import { INVESTMENT_TYPES, TRADE_ASSET_TYPES, TRADE_SIDES } from "../../constants";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Modal from "../../components/ui/Modal";
import EmptyState from "../../components/ui/EmptyState";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import toast from "react-hot-toast";

const COLORS = ["#f59e0b", "#22c55e", "#60a5fa", "#a78bfa", "#fb7185", "#34d399", "#fbbf24"];

const defaultInvestmentForm = {
  name: "",
  type: "stocks",
  amount: "",
  currentValue: "",
  purchaseDate: new Date().toISOString().split("T")[0],
  notes: "",
};

const defaultTradeForm = {
  symbol: "",
  assetName: "",
  assetType: "stock",
  side: "buy",
  timeInForce: "day",
  executeLive: false,
  quantity: "",
  price: "",
  fees: "",
  platform: "Paper Trading",
  executedAt: new Date().toISOString().split("T")[0],
  notes: "",
};

const Investments = () => {
  const [investments, setInvestments] = useState([]);
  const [trades, setTrades] = useState([]);
  const [tradeSummary, setTradeSummary] = useState({ totalBuys: 0, totalSells: 0, netTradeFlow: 0 });
  const [showInvestmentModal, setShowInvestmentModal] = useState(false);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(defaultInvestmentForm);
  const [tradeForm, setTradeForm] = useState(defaultTradeForm);
  const [assetSearchQuery, setAssetSearchQuery] = useState("");
  const [assetSuggestions, setAssetSuggestions] = useState([]);
  const [assetSearchOpen, setAssetSearchOpen] = useState(false);
  const [assetSearchLoading, setAssetSearchLoading] = useState(false);
  const [brokerAccount, setBrokerAccount] = useState(null);
  const [brokerPositions, setBrokerPositions] = useState([]);
  const [brokerError, setBrokerError] = useState("");
  const [brokerLoading, setBrokerLoading] = useState(false);

  const fetchData = async () => {
    try {
      const [investmentsRes, tradesRes, tradeSummaryRes] = await Promise.allSettled([
        investmentService.getInvestments(),
        investmentService.getTrades(),
        investmentService.getTradeSummary(),
      ]);

      setInvestments(investmentsRes.status === "fulfilled" ? investmentsRes.value.data?.investments || [] : []);
      setTrades(tradesRes.status === "fulfilled" ? tradesRes.value.data?.orders || [] : []);
      setTradeSummary(tradeSummaryRes.status === "fulfilled" ? tradeSummaryRes.value.data || { totalBuys: 0, totalSells: 0, netTradeFlow: 0 } : { totalBuys: 0, totalSells: 0, netTradeFlow: 0 });
    } catch {
      setInvestments([]);
      setTrades([]);
      setTradeSummary({ totalBuys: 0, totalSells: 0, netTradeFlow: 0 });
    }
  };

  const fetchBrokerData = async () => {
    setBrokerLoading(true);
    try {
      const [accountRes, positionsRes] = await Promise.allSettled([
        investmentService.getBrokerAccount(),
        investmentService.getBrokerPositions(),
      ]);

      if (accountRes.status === "fulfilled") {
        setBrokerAccount(accountRes.value.data?.account || null);
      } else {
        setBrokerAccount(null);
      }

      if (positionsRes.status === "fulfilled") {
        setBrokerPositions(positionsRes.value.data?.positions || []);
      } else {
        setBrokerPositions([]);
      }

      const accountMessage = accountRes.status === "rejected" ? accountRes.reason?.response?.data?.message || accountRes.reason?.message : "";
      const positionMessage = positionsRes.status === "rejected" ? positionsRes.reason?.response?.data?.message || positionsRes.reason?.message : "";
      setBrokerError(accountMessage || positionMessage || "");
    } catch {
      setBrokerAccount(null);
      setBrokerPositions([]);
      setBrokerError("Unable to reach Alpaca right now");
    } finally {
      setBrokerLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchBrokerData();
  }, []);

  useEffect(() => {
    if (!showTradeModal) return;

    const query = assetSearchQuery.trim();
    if (!query) {
      setAssetSuggestions([]);
      setAssetSearchOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setAssetSearchLoading(true);
      try {
        const { data } = await investmentService.searchBrokerAssets(query, 15);
        const assets = data?.assets || [];
        setAssetSuggestions(assets);
        setAssetSearchOpen(true);
      } catch {
        setAssetSuggestions([]);
      } finally {
        setAssetSearchLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [assetSearchQuery, showTradeModal]);

  const openAdd = () => {
    setEditItem(null);
    setForm(defaultInvestmentForm);
    setShowInvestmentModal(true);
  };

  const openEdit = (investment) => {
    setEditItem(investment);
    setForm({
      name: investment.name,
      type: investment.type,
      amount: investment.amount,
      currentValue: investment.currentValue || investment.amount,
      purchaseDate: investment.purchaseDate?.split("T")[0] || "",
      notes: investment.notes || "",
    });
    setShowInvestmentModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.amount) return toast.error("Fill required fields");
    setSaving(true);
    try {
      if (editItem) await investmentService.updateInvestment(editItem._id, form);
      else await investmentService.addInvestment(form);
      toast.success(editItem ? "Updated!" : "Investment added!");
      setShowInvestmentModal(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save investment");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this investment?")) return;
    try {
      await investmentService.deleteInvestment(id);
      toast.success("Deleted");
      fetchData();
    } catch {
      toast.error("Failed");
    }
  };

  const handleAddTrade = async () => {
    if (!tradeForm.symbol.trim() || !tradeForm.assetName.trim()) return toast.error("Symbol and asset name are required");
    if (!tradeForm.quantity || !tradeForm.price) return toast.error("Quantity and price are required");
    if (tradeForm.executeLive && (!brokerAccount || brokerError)) {
      return toast.error("Live Alpaca execution is unavailable. Disable live execution or configure Alpaca.");
    }

    setSaving(true);
    try {
      await investmentService.addTrade(tradeForm);
      toast.success("Trade recorded");
      setTradeForm(defaultTradeForm);
      setAssetSearchQuery("");
      setAssetSuggestions([]);
      setAssetSearchOpen(false);
      setShowTradeModal(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to record trade");
    } finally {
      setSaving(false);
    }
  };

  const openTradeModal = () => {
    setShowTradeModal(true);
    setAssetSearchQuery(tradeForm.symbol ? `${tradeForm.symbol} - ${tradeForm.assetName}` : "");
  };

  const handleSelectAsset = (asset) => {
    setTradeForm((prev) => ({
      ...prev,
      symbol: asset.symbol,
      assetName: asset.name,
      assetType: asset.assetType || prev.assetType,
    }));
    setAssetSearchQuery(`${asset.symbol} - ${asset.name}`);
    setAssetSearchOpen(false);
  };

  const totalInvested = investments.reduce((sum, item) => sum + (item.amount || 0), 0);
  const totalCurrent = investments.reduce((sum, item) => sum + (item.currentValue || item.amount || 0), 0);
  const totalGain = totalCurrent - totalInvested;
  const gainPct = totalInvested ? ((totalGain / totalInvested) * 100).toFixed(1) : 0;
  const brokerBuyingPower = Number(brokerAccount?.buyingPower || 0);
  const brokerEquity = Number(brokerAccount?.equity || 0);

  const byType = INVESTMENT_TYPES.map((type) => ({
    name: type.label,
    value: investments.filter((item) => item.type === type.value).reduce((sum, item) => sum + (item.currentValue || item.amount || 0), 0),
  })).filter((item) => item.value > 0);

  return (
    <div className="space-y-3 max-w-6xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-fade-up">
        <div>
          <h1 className="page-title">Investments</h1>
          <p className="muted-text text-sm mt-1">Track portfolio performance and execute paper-trading style orders in one place.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={openTradeModal}><ArrowLeftRight size={14} /> Add Trade</Button>
          <Button onClick={openAdd}><Plus size={14} /> Add Investment</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 animate-fade-up animate-delay-100 max-w-5xl">
        {[
          { label: "Total Invested", value: totalInvested, color: "text-blue-400" },
          { label: "Current Value", value: totalCurrent, color: "text-amber-400" },
          { label: "Total Gain/Loss", value: totalGain, color: totalGain >= 0 ? "text-green-400" : "text-red-400", suffix: ` (${gainPct}%)` },
          { label: "Trade Buys", value: tradeSummary.totalBuys, color: "text-sky-300" },
          { label: "Trade Sells", value: tradeSummary.totalSells, color: "text-emerald-300" },
        ].map((item) => (
          <Card key={item.label}>
            <div className="muted-text text-xs mb-2">{item.label}</div>
            <div className={`text-2xl font-display font-800 ${item.color}`}>
              {formatCurrency(item.value)}{item.suffix || ""}
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-4 animate-fade-up animate-delay-200 items-start">
        <Card>
          <h3 className="section-title mb-4">Portfolio Mix</h3>
          {byType.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={byType} cx="50%" cy="50%" outerRadius={75} paddingAngle={3} dataKey="value">
                  {byType.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border-light)", borderRadius: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8 muted-text text-sm">No investments yet</div>
          )}
          <div className="space-y-1.5 mt-2">
            {byType.map((item, index) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[index % COLORS.length] }} />
                <span className="text-xs flex-1 muted-text">{item.name}</span>
                <span className="text-xs font-display font-600">{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border p-4" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
            <p className="text-xs uppercase tracking-[0.16em] muted-text font-display font-600">Trading flow</p>
            <div className={`text-2xl font-display font-800 mt-3 ${tradeSummary.netTradeFlow >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
              {formatCurrency(tradeSummary.netTradeFlow)}
            </div>
            <p className="text-xs muted-text mt-2">Net cash flow from recorded buy and sell orders.</p>
          </div>
        </Card>

        <Card>
          <h3 className="section-title mb-4">Recent Trades</h3>
          {trades.length === 0 ? (
            <div className="text-center py-8 muted-text text-sm">No trades recorded yet</div>
          ) : (
            <div className="grid gap-3 max-h-[22rem] overflow-y-auto pr-1">
              {trades.slice(0, 8).map((trade) => (
                <div key={trade._id} className="rounded-2xl border p-4" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={trade.side === "buy" ? "badge-green" : "badge-gold"}>{trade.side.toUpperCase()}</span>
                        <span className="text-xs muted-text">{trade.symbol}</span>
                      </div>
                      <p className="text-sm font-display font-700 mt-3">{trade.assetName}</p>
                      <p className="text-xs muted-text mt-1">{formatDate(trade.executedAt)} | {trade.quantity} units at {formatCurrency(trade.price)}</p>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-display font-800 ${trade.side === "buy" ? "text-rose-300" : "text-emerald-300"}`}>
                        {trade.side === "buy" ? "-" : "+"}{formatCurrency(trade.totalValue)}
                      </div>
                      <p className="text-xs muted-text mt-1">{trade.platform}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_0.9fr] gap-4 animate-fade-up animate-delay-300 items-start">
        <div>
          <Card>
            <h3 className="section-title mb-4">All Investments</h3>
            {investments.length === 0 ? (
              <EmptyState icon="Chart" title="No investments yet" description="Start tracking your portfolio" action={openAdd} actionLabel="Add Investment" />
            ) : (
              <div className="grid gap-3 max-h-[34rem] overflow-y-auto pr-1">
                {investments.map((investment) => {
                  const gain = (investment.currentValue || investment.amount) - investment.amount;
                  const gainP = investment.amount ? ((gain / investment.amount) * 100).toFixed(1) : 0;
                  const typeInfo = INVESTMENT_TYPES.find((type) => type.value === investment.type);
                  return (
                    <div
                      key={investment._id}
                      className="group rounded-[1.35rem] border overflow-hidden transition-all hover:-translate-y-[1px]"
                      style={{
                        background: "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(255,255,255,0.02) 35%, rgba(255,255,255,0.01))",
                        borderColor: "var(--border)",
                      }}
                    >
                      <div className="px-4 py-2.5 border-b flex items-center justify-between gap-3" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                        <div className="flex items-center gap-2">
                          <span className="badge-gold text-[11px]">{typeInfo?.label || investment.type}</span>
                          <span className="text-xs muted-text">{formatDate(investment.purchaseDate)}</span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(investment)} className="p-1.5 rounded-lg hover:bg-white/5 muted-text hover:text-white transition-colors">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => handleDelete(investment._id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      <div className="p-4 flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-amber-400/10">
                          <TrendingUp size={18} className="text-amber-400" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-base font-display font-700 leading-6 break-words">{investment.name}</p>
                              {investment.notes ? <p className="text-sm muted-text mt-3 leading-6 break-words">{investment.notes}</p> : null}
                            </div>

                            <div className="md:text-right shrink-0">
                              <div className="text-xl font-display font-800">{formatCurrency(investment.currentValue || investment.amount)}</div>
                              <div className={`text-xs mt-1 ${gain >= 0 ? "text-green-400" : "text-red-400"}`}>
                                {gain >= 0 ? "+" : ""}{formatCurrency(gain)} ({gainP}%)
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        <Card className="h-full">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="section-title">Trading Desk</h3>
            <button
              type="button"
              onClick={fetchBrokerData}
              className="p-2 rounded-xl border hover:bg-white/5 transition-colors"
              style={{ borderColor: "var(--border)" }}
              aria-label="Refresh broker data"
            >
              <RefreshCw size={13} className={brokerLoading ? "animate-spin" : ""} />
            </button>
          </div>
          <div className="space-y-3">
            <div className="rounded-2xl border p-4" style={{ background: "var(--bg-secondary)", borderColor: brokerError ? "rgba(244,63,94,0.3)" : "var(--border)" }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] muted-text font-display font-600">Broker Connection</p>
                  <p className="text-sm font-display font-700 mt-2">{brokerError ? "Alpaca unavailable" : "Alpaca connected"}</p>
                  <p className="text-xs muted-text mt-1">
                    {brokerError || (brokerAccount ? `Status: ${brokerAccount.status || "active"}` : "Checking broker status...")}
                  </p>
                </div>
                <span className={`p-2 rounded-xl ${brokerError ? "bg-rose-500/10 text-rose-300" : "bg-sky-500/10 text-sky-300"}`}>
                  {brokerError ? <ShieldAlert size={14} /> : <Landmark size={14} />}
                </span>
              </div>
            </div>
            <div className="rounded-2xl border p-4" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
              <p className="text-xs uppercase tracking-[0.16em] muted-text font-display font-600">Executed orders</p>
              <div className="text-3xl font-display font-800 mt-3 text-sky-300">{trades.length}</div>
            </div>
            <div className="rounded-2xl border p-4" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
              <p className="text-xs uppercase tracking-[0.16em] muted-text font-display font-600">Broker funds</p>
              <p className="text-sm font-display font-700 mt-3">Buying Power: {formatCurrency(brokerBuyingPower)}</p>
              <p className="text-xs muted-text mt-2">Equity: {formatCurrency(brokerEquity)}</p>
            </div>
            <div className="rounded-2xl border p-4" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
              <p className="text-xs uppercase tracking-[0.16em] muted-text font-display font-600">Open positions</p>
              <p className="text-sm font-display font-700 mt-3">{brokerPositions.length} active positions</p>
              <p className="text-xs muted-text mt-2">{brokerPositions.slice(0, 3).map((item) => item.symbol).join(", ") || "No live positions reported."}</p>
            </div>
            <Button className="w-full" onClick={openTradeModal}>
              <ArrowLeftRight size={14} /> Record Trade
            </Button>
          </div>
        </Card>
      </div>

      <Modal isOpen={showInvestmentModal} onClose={() => setShowInvestmentModal(false)} title={`${editItem ? "Edit" : "Add"} Investment`}>
        <div className="space-y-4">
          <Input label="Investment Name" placeholder="e.g. Nifty 50 Index Fund" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Select label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} options={INVESTMENT_TYPES} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Invested Amount (INR)" type="number" placeholder="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            <Input label="Current Value (INR)" type="number" placeholder="0" value={form.currentValue} onChange={(e) => setForm({ ...form, currentValue: e.target.value })} />
          </div>
          <Input label="Purchase Date" type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} />
          <Input label="Notes (optional)" placeholder="Any details" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" className="flex-1" onClick={() => setShowInvestmentModal(false)}>Cancel</Button>
            <Button className="flex-1" loading={saving} onClick={handleSave}>{editItem ? "Update" : "Add"}</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showTradeModal}
        onClose={() => {
          setShowTradeModal(false);
          setAssetSearchOpen(false);
        }}
        title="Record Trade"
        size="lg"
      >
        <div className="space-y-4">
          <div className="relative">
            <Input
              label="Search Symbol or Asset"
              placeholder="e.g. AAPL or Apple"
              value={assetSearchQuery}
              onChange={(e) => {
                setAssetSearchQuery(e.target.value);
                setAssetSearchOpen(true);
              }}
            />

            {assetSearchOpen ? (
              <div
                className="absolute z-30 mt-1 w-full rounded-xl border max-h-52 overflow-y-auto"
                style={{ background: "var(--bg-elevated)", borderColor: "var(--border-light)" }}
              >
                {assetSearchLoading ? (
                  <div className="px-3 py-2 text-xs muted-text">Searching assets...</div>
                ) : assetSuggestions.length === 0 ? (
                  <div className="px-3 py-2 text-xs muted-text">No matching assets</div>
                ) : assetSuggestions.map((asset) => (
                  <button
                    type="button"
                    key={`${asset.symbol}-${asset.exchange}`}
                    className="w-full text-left px-3 py-2 hover:bg-white/5 transition-colors"
                    onClick={() => handleSelectAsset(asset)}
                  >
                    <p className="text-sm font-display font-700">{asset.symbol} <span className="muted-text">| {asset.exchange}</span></p>
                    <p className="text-xs muted-text mt-1">{asset.name}</p>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Selected Symbol"
              value={tradeForm.symbol}
              placeholder="AAPL"
              onChange={(e) => setTradeForm({ ...tradeForm, symbol: e.target.value.toUpperCase() })}
            />
            <Input
              label="Selected Asset"
              value={tradeForm.assetName}
              placeholder="Apple Inc."
              onChange={(e) => setTradeForm({ ...tradeForm, assetName: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select label="Asset Type" value={tradeForm.assetType} onChange={(e) => setTradeForm({ ...tradeForm, assetType: e.target.value })} options={TRADE_ASSET_TYPES} />
            <Select label="Side" value={tradeForm.side} onChange={(e) => setTradeForm({ ...tradeForm, side: e.target.value })} options={TRADE_SIDES} />
            <Select
              label="Time In Force"
              value={tradeForm.timeInForce}
              onChange={(e) => setTradeForm({ ...tradeForm, timeInForce: e.target.value })}
              options={[
                { value: "day", label: "DAY" },
                { value: "gtc", label: "GTC" },
                { value: "ioc", label: "IOC" },
                { value: "fok", label: "FOK" },
              ]}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Trade Date" type="date" value={tradeForm.executedAt} onChange={(e) => setTradeForm({ ...tradeForm, executedAt: e.target.value })} />
            <div className="rounded-xl border px-3 py-2.5 flex items-center justify-between gap-3" style={{ borderColor: "var(--border)" }}>
              <div>
                <label htmlFor="live-trade-toggle" className="text-sm font-display font-700 cursor-pointer">Execute with broker</label>
                <p className="text-xs muted-text mt-1">
                  {brokerError ? "Unavailable until Alpaca credentials are configured" : "Sends order to Alpaca when enabled"}
                </p>
              </div>
              <input
                id="live-trade-toggle"
                type="checkbox"
                checked={Boolean(tradeForm.executeLive)}
                onChange={(e) => setTradeForm({ ...tradeForm, executeLive: e.target.checked })}
                className="h-4 w-4"
                disabled={Boolean(brokerError)}
                aria-describedby="live-trade-help"
              />
            </div>
          </div>
          <p id="live-trade-help" className="text-xs muted-text">
            You can always record manual trades even when Alpaca is unavailable.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Quantity" type="number" placeholder="0" value={tradeForm.quantity} onChange={(e) => setTradeForm({ ...tradeForm, quantity: e.target.value })} />
            <Input label="Price" type="number" placeholder="0" value={tradeForm.price} onChange={(e) => setTradeForm({ ...tradeForm, price: e.target.value })} />
            <Input label="Fees" type="number" placeholder="0" value={tradeForm.fees} onChange={(e) => setTradeForm({ ...tradeForm, fees: e.target.value })} />
          </div>
          <Input label="Platform" placeholder="e.g. Zerodha, Groww, Paper Trading" value={tradeForm.platform} onChange={(e) => setTradeForm({ ...tradeForm, platform: e.target.value })} />
          <div>
            <label className="label">Notes</label>
            <textarea
              rows={4}
              className="input-field resize-none"
              placeholder="Optional thesis, trigger, or execution note"
              value={tradeForm.notes}
              onChange={(e) => setTradeForm({ ...tradeForm, notes: e.target.value })}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" className="flex-1" onClick={() => setShowTradeModal(false)}>Cancel</Button>
            <Button className="flex-1" loading={saving} onClick={handleAddTrade}>Record Trade</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Investments;


