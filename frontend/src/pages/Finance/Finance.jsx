import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import { financeService } from "../../services/finance.service";
import { formatCurrency, formatDate, getCategoryInfo } from "../../utils/helpers";
import { EXPENSE_CATEGORIES } from "../../constants";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Modal from "../../components/ui/Modal";
import ExpenseBreakdown from "../../components/charts/ExpenseBreakdown";
import toast from "react-hot-toast";

const tabs = ["All", "Income", "Expenses"];

const Finance = () => {
  const [activeTab, setActiveTab] = useState("All");
  const [incomes, setIncomes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("expense");
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({
    description: "",
    amount: "",
    category: "food",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      const [incRes, expRes] = await Promise.allSettled([
        financeService.getIncomes(),
        financeService.getExpenses(),
      ]);
      if (incRes.status === "fulfilled") setIncomes(incRes.value.data?.incomes || []);
      if (expRes.status === "fulfilled") setExpenses(expRes.value.data?.expenses || []);
    } catch {
      setIncomes([]);
      setExpenses([]);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const openAdd = (type) => {
    setModalType(type);
    setEditItem(null);
    setForm({
      description: "",
      amount: "",
      category: "food",
      date: new Date().toISOString().split("T")[0],
      notes: "",
    });
    setShowModal(true);
  };

  const openEdit = (item, type) => {
    setModalType(type);
    setEditItem(item);
    setForm({
      description: item.description || "",
      amount: item.amount || "",
      category: item.category || "food",
      date: item.date ? item.date.split("T")[0] : new Date().toISOString().split("T")[0],
      notes: item.notes || "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.description || !form.amount) return toast.error("Fill required fields");
    setSaving(true);
    try {
      if (modalType === "expense") {
        if (editItem) await financeService.updateExpense(editItem._id, form);
        else await financeService.addExpense(form);
      } else {
        const incomePayload = {
          amount: form.amount,
          date: form.date,
          notes: form.notes,
          source: form.description,
          description: form.description,
        };
        if (editItem) await financeService.updateIncome(editItem._id, incomePayload);
        else await financeService.addIncome(incomePayload);
      }
      toast.success(editItem ? "Updated!" : "Added successfully!");
      setShowModal(false);
      fetchData();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, type) => {
    if (!confirm("Delete this record?")) return;
    try {
      if (type === "expense") await financeService.deleteExpense(id);
      else await financeService.deleteIncome(id);
      toast.success("Deleted");
      fetchData();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const allTx = [
    ...incomes.map((item) => ({ ...item, type: "income" })),
    ...expenses.map((item) => ({ ...item, type: "expense" })),
  ].sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));

  const displayed = activeTab === "All"
    ? allTx
    : activeTab === "Income"
      ? allTx.filter((tx) => tx.type === "income")
      : allTx.filter((tx) => tx.type === "expense");

  const totalIncome = incomes.reduce((sum, item) => sum + (item.amount || 0), 0);
  const totalExpense = expenses.reduce((sum, item) => sum + (item.amount || 0), 0);
  const balance = totalIncome - totalExpense;

  const categoryData = EXPENSE_CATEGORIES.map((cat) => ({
    name: cat.label,
    value: expenses.filter((item) => item.category === cat.value).reduce((sum, item) => sum + (item.amount || 0), 0),
  })).filter((item) => item.value > 0);

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between animate-fade-up">
        <div>
          <h1 className="page-title">Finance</h1>
          <p className="muted-text text-sm mt-1">Track your income and expenses</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => openAdd("expense")}>
            <Plus size={13} /> Expense
          </Button>
          <Button size="sm" onClick={() => openAdd("income")}>
            <Plus size={13} /> Income
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 animate-fade-up animate-delay-100">
        {[
          { label: "Total Income", value: totalIncome, color: "text-green-400" },
          { label: "Total Expenses", value: totalExpense, color: "text-red-400" },
          { label: "Net Balance", value: balance, color: balance >= 0 ? "text-green-400" : "text-red-400" },
        ].map((item) => (
          <Card key={item.label}>
            <div className="muted-text text-xs mb-2">{item.label}</div>
            <div className={`text-xl font-display font-800 ${item.color}`}>{formatCurrency(item.value)}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-fade-up animate-delay-200">
        <Card>
          <h3 className="section-title mb-4">Expense Breakdown</h3>
          {categoryData.length > 0 ? (
            <ExpenseBreakdown data={categoryData} />
          ) : (
            <div className="text-center py-12 muted-text text-sm">No expense data yet</div>
          )}
        </Card>

        <div className="lg:col-span-2">
          <Card>
            <div className="flex gap-1 mb-4 p-1 rounded-xl w-fit" style={{ background: "var(--bg-secondary)" }}>
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-display font-500 transition-all ${activeTab === tab ? "text-[var(--bg-primary)]" : "muted-text hover:text-white"}`}
                  style={{ background: activeTab === tab ? "var(--accent-gold)" : "transparent" }}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="space-y-1 max-h-96 overflow-y-auto pr-1">
              {displayed.length === 0 ? (
                <div className="text-center py-12 muted-text text-sm">No transactions yet</div>
              ) : displayed.map((tx) => {
                const categoryInfo = getCategoryInfo(tx.category || tx.source);
                return (
                  <div key={tx._id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/3 group transition-colors">
                    <span className="text-xl">{categoryInfo.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-display font-500 truncate">{tx.description}</p>
                      <p className="text-xs muted-text">{categoryInfo.label} | {formatDate(tx.date || tx.createdAt)}</p>
                      {tx.notes ? <p className="text-xs muted-text truncate mt-1">{tx.notes}</p> : null}
                    </div>
                    <span className={`text-sm font-display font-700 ${tx.type === "income" ? "text-green-400" : "text-red-400"}`}>
                      {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
                    </span>
                    <div className="hidden group-hover:flex gap-1">
                      <button onClick={() => openEdit(tx, tx.type)} className="p-1.5 rounded-lg hover:bg-white/5 muted-text hover:text-white transition-colors">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handleDelete(tx._id, tx.type)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={`${editItem ? "Edit" : "Add"} ${modalType === "income" ? "Income" : "Expense"}`}>
        <div className="space-y-4">
          <Input
            label={modalType === "income" ? "Income Source" : "Description"}
            placeholder={modalType === "income" ? "e.g. Salary, Freelance, Gift" : "e.g. Grocery, Rent"}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Amount (INR)" type="number" placeholder="0.00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            <Input label="Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          {modalType === "expense" ? (
            <Select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} options={EXPENSE_CATEGORIES} />
          ) : null}
          <Input label="Notes (optional)" placeholder="Any additional details" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" className="flex-1" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button className="flex-1" loading={saving} onClick={handleSave}>{editItem ? "Update" : "Add"}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Finance;
