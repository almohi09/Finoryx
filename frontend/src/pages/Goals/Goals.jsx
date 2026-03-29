import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, PlusCircle } from "lucide-react";
import { goalService } from "../../services/goal.service";
import { formatCurrency, getDaysRemaining, getPercentage } from "../../utils/helpers";
import { GOAL_CATEGORIES } from "../../constants";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Modal from "../../components/ui/Modal";
import ProgressBar from "../../components/ui/ProgressBar";
import EmptyState from "../../components/ui/EmptyState";
import toast from "react-hot-toast";

const Goals = () => {
  const [goals, setGoals] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [contribution, setContribution] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", category: "emergency_fund", targetAmount: "", currentAmount: "0", targetDate: "", notes: "",
  });

  const fetchData = async () => {
    try {
      const { data } = await goalService.getGoals();
      setGoals(data?.goals || data || []);
    } catch {
      setGoals([]);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const openAdd = () => {
    setEditItem(null);
    setForm({ name: "", category: "emergency_fund", targetAmount: "", currentAmount: "0", targetDate: "", notes: "" });
    setShowModal(true);
  };

  const openEdit = (goal) => {
    setEditItem(goal);
    setForm({
      name: goal.name,
      category: goal.category,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      targetDate: goal.targetDate?.split("T")[0] || "",
      notes: goal.notes || "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.targetAmount) return toast.error("Fill required fields");
    setSaving(true);
    try {
      if (editItem) await goalService.updateGoal(editItem._id, form);
      else await goalService.addGoal(form);
      toast.success(editItem ? "Goal updated!" : "Goal created!");
      setShowModal(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save goal");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this goal?")) return;
    try {
      await goalService.deleteGoal(id);
      toast.success("Goal deleted");
      fetchData();
    } catch {
      toast.error("Failed");
    }
  };

  const openContribute = (goal) => {
    setSelectedGoal(goal);
    setContribution("");
    setShowContributeModal(true);
  };

  const handleContribute = async () => {
    if (!contribution || isNaN(contribution)) return toast.error("Enter valid amount");
    setSaving(true);
    try {
      await goalService.addContribution(selectedGoal._id, parseFloat(contribution));
      toast.success(`${formatCurrency(contribution)} added to "${selectedGoal.name}"`);
      setShowContributeModal(false);
      fetchData();
    } catch {
      toast.error("Failed to add funds");
    } finally {
      setSaving(false);
    }
  };

  const catInfo = (cat) => GOAL_CATEGORIES.find((c) => c.value === cat) || { icon: "Target", label: cat };
  const totalTarget = goals.reduce((s, g) => s + (g.targetAmount || 0), 0);
  const totalSaved = goals.reduce((s, g) => s + (g.currentAmount || 0), 0);
  const completedGoals = goals.filter((g) => g.currentAmount >= g.targetAmount).length;

  return (
    <div className="space-y-4 max-w-6xl mx-auto w-full">
      <div className="flex items-center justify-between animate-fade-up">
        <div>
          <h1 className="page-title">Savings Goals</h1>
          <p className="muted-text text-sm mt-1">Set targets and track your progress</p>
        </div>
        <Button onClick={openAdd}><Plus size={14} /> New Goal</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-up animate-delay-100">
        {[
          { label: "Total Target", value: formatCurrency(totalTarget), color: "text-amber-400" },
          { label: "Total Saved", value: formatCurrency(totalSaved), color: "text-green-400" },
          { label: "Goals Completed", value: `${completedGoals}/${goals.length}`, color: "text-blue-400" },
        ].map((s) => (
          <Card key={s.label}>
            <div className="muted-text text-xs mb-2">{s.label}</div>
            <div className={`text-xl font-display font-800 ${s.color}`}>{s.value}</div>
          </Card>
        ))}
      </div>

      {goals.length === 0 ? (
        <Card className="animate-fade-up animate-delay-200">
          <EmptyState
            icon="Target"
            title="No goals yet"
            description="Set your first savings goal and start working towards it"
            action={openAdd}
            actionLabel="Create Goal"
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-up animate-delay-200">
          {goals.map((goal) => {
            const info = catInfo(goal.category);
            const pct = getPercentage(goal.currentAmount, goal.targetAmount);
            const daysLeft = getDaysRemaining(goal.targetDate);
            const isComplete = goal.currentAmount >= goal.targetAmount;

            return (
              <Card key={goal._id} className="relative group">
                {isComplete && <div className="absolute top-3 right-3 badge-green">Completed</div>}
                <div className="flex items-start gap-3 mb-4">
                  <span className="text-3xl">{info.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-700 truncate">{goal.name}</h3>
                    <p className="text-xs muted-text">{info.label}</p>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-display font-700">{formatCurrency(goal.currentAmount)}</span>
                    <span className="muted-text">of {formatCurrency(goal.targetAmount)}</span>
                  </div>
                  <ProgressBar value={goal.currentAmount} max={goal.targetAmount} color={isComplete ? "green" : pct > 60 ? "gold" : "blue"} showLabel={false} />
                  <div className="flex justify-between mt-1.5">
                    <span className="text-xs font-display font-600 gold-text">{pct}%</span>
                    {daysLeft !== null && !isComplete && (
                      <span className={`text-xs ${daysLeft < 30 ? "text-red-400" : "muted-text"}`}>
                        {daysLeft > 0 ? `${daysLeft} days left` : "Overdue"}
                      </span>
                    )}
                  </div>
                </div>

                {goal.notes && <p className="text-xs muted-text mb-3 italic">"{goal.notes}"</p>}

                <div className="flex gap-2 mt-3">
                  {!isComplete && (
                    <Button size="sm" className="flex-1" onClick={() => openContribute(goal)}>
                      <PlusCircle size={12} /> Add Funds
                    </Button>
                  )}
                  <button onClick={() => openEdit(goal)} className="p-2 rounded-xl hover:bg-white/5 muted-text hover:text-white transition-colors border" style={{ borderColor: "var(--border)" }}>
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => handleDelete(goal._id)} className="p-2 rounded-xl hover:bg-red-500/10 text-red-400/60 hover:text-red-400 transition-colors border" style={{ borderColor: "var(--border)" }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={`${editItem ? "Edit" : "New"} Goal`}>
        <div className="space-y-4">
          <Input label="Goal Name" placeholder="e.g. Emergency Fund" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} options={GOAL_CATEGORIES} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Target Amount (INR)" type="number" placeholder="100000" value={form.targetAmount} onChange={(e) => setForm({ ...form, targetAmount: e.target.value })} />
            <Input label="Already Saved (INR)" type="number" placeholder="0" value={form.currentAmount} onChange={(e) => setForm({ ...form, currentAmount: e.target.value })} />
          </div>
          <Input label="Target Date" type="date" value={form.targetDate} onChange={(e) => setForm({ ...form, targetDate: e.target.value })} />
          <Input label="Notes (optional)" placeholder="What's this goal for?" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" className="flex-1" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button className="flex-1" loading={saving} onClick={handleSave}>{editItem ? "Update" : "Create Goal"}</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showContributeModal} onClose={() => setShowContributeModal(false)} title={`Add to "${selectedGoal?.name}"`} size="sm">
        <div className="space-y-4">
          <div className="p-3 rounded-xl text-center" style={{ background: "var(--bg-secondary)" }}>
            <div className="text-2xl mb-1">{catInfo(selectedGoal?.category)?.icon}</div>
            <div className="muted-text text-sm">
              {formatCurrency(selectedGoal?.currentAmount)} / {formatCurrency(selectedGoal?.targetAmount)}
            </div>
            <div className="text-xs muted-text mt-1">
              {getPercentage(selectedGoal?.currentAmount, selectedGoal?.targetAmount)}% complete
            </div>
          </div>
          <Input label="Amount to Add (INR)" type="number" placeholder="Enter amount" value={contribution} onChange={(e) => setContribution(e.target.value)} />
          <div className="flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setShowContributeModal(false)}>Cancel</Button>
            <Button className="flex-1" loading={saving} onClick={handleContribute}>Add Funds</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Goals;


