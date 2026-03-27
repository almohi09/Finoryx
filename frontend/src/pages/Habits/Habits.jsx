import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, CheckCircle2, Circle, Flame } from "lucide-react";
import { habitService } from "../../services/habit.service";
import { HABIT_FREQUENCIES, HABIT_TYPES } from "../../constants";
import { getStreakLabel } from "../../utils/helpers";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Modal from "../../components/ui/Modal";
import EmptyState from "../../components/ui/EmptyState";
import HabitStreakChart from "../../components/charts/HabitStreakChart";
import toast from "react-hot-toast";

const EMPTY_CHART = [
  { day: "Mon", completed: 0 },
  { day: "Tue", completed: 0 },
  { day: "Wed", completed: 0 },
  { day: "Thu", completed: 0 },
  { day: "Fri", completed: 0 },
  { day: "Sat", completed: 0 },
  { day: "Sun", completed: 0 },
];

const buildWeeklyChart = (habits = []) => {
  const today = new Date();
  const mondayOffset = (today.getDay() + 6) % 7;
  const weekStart = new Date(today);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(today.getDate() - mondayOffset);

  return EMPTY_CHART.map((item, index) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + index);
    const dayKey = day.toDateString();

    return {
      ...item,
      completed: habits.filter((habit) => (
        habit.completedDates || []
      ).some((date) => new Date(date).toDateString() === dayKey)).length,
    };
  });
};

const Habits = () => {
  const [habits, setHabits] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(null);
  const [form, setForm] = useState({ name: "", type: "save", frequency: "daily", description: "" });

  const fetchData = async () => {
    try {
      const { data } = await habitService.getHabits();
      setHabits(data?.habits || []);
    } catch {
      setHabits([]);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const openAdd = () => {
    setEditItem(null);
    setForm({ name: "", type: "save", frequency: "daily", description: "" });
    setShowModal(true);
  };

  const openEdit = (habit) => {
    setEditItem(habit);
    setForm({ name: habit.name, type: habit.type, frequency: habit.frequency, description: habit.description || "" });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error("Habit name is required");
    setSaving(true);
    try {
      if (editItem) await habitService.updateHabit(editItem._id, form);
      else await habitService.addHabit(form);
      toast.success(editItem ? "Habit updated!" : "Habit created!");
      setShowModal(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save habit");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this habit?")) return;
    try {
      await habitService.deleteHabit(id);
      toast.success("Habit deleted");
      fetchData();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleComplete = async (habit) => {
    if (habit.completedToday) return;
    setCompleting(habit._id);
    try {
      await habitService.markComplete(habit._id);
      toast.success(`"${habit.name}" marked complete!`);
      fetchData();
    } catch {
      toast.error("Failed to mark complete");
    } finally {
      setCompleting(null);
    }
  };

  const completedCount = habits.filter((habit) => habit.completedToday).length;
  const completionRate = habits.length ? Math.round((completedCount / habits.length) * 100) : 0;
  const totalStreak = habits.reduce((sum, habit) => sum + (habit.streak || 0), 0);
  const longestStreak = Math.max(...habits.map((habit) => habit.streak || 0), 0);
  const typeInfo = (type) => HABIT_TYPES.find((item) => item.value === type) || { icon: "Star", label: type };
  const freqLabel = (frequency) => HABIT_FREQUENCIES.find((item) => item.value === frequency)?.label || frequency;
  const weeklyChart = buildWeeklyChart(habits);

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between animate-fade-up">
        <div>
          <h1 className="page-title">Habit Tracker</h1>
          <p className="muted-text text-sm mt-1">Build consistent financial discipline</p>
        </div>
        <Button onClick={openAdd}><Plus size={14} /> New Habit</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-up animate-delay-100">
        {[
          { label: "Today's Progress", value: `${completedCount}/${habits.length}`, sub: `${completionRate}% done`, color: "text-amber-400" },
          { label: "Total Habits", value: habits.length, sub: "active habits", color: "text-blue-400" },
          { label: "Longest Streak", value: `${longestStreak}d`, sub: "personal best", color: "text-orange-400" },
          { label: "Combined Streak", value: totalStreak, sub: "total days", color: "text-green-400" },
        ].map((item) => (
          <Card key={item.label}>
            <div className="muted-text text-xs mb-2">{item.label}</div>
            <div className={`text-2xl font-display font-800 ${item.color}`}>{item.value}</div>
            <div className="text-xs muted-text mt-1">{item.sub}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-fade-up animate-delay-200 items-start">
        <Card className="self-start">
          <h3 className="section-title mb-1">This Week</h3>
          <p className="text-xs muted-text mb-4">Daily completions</p>
          <HabitStreakChart data={weeklyChart} />
          <div className="mt-4 p-3 rounded-xl" style={{ background: "var(--bg-secondary)" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-display font-600">Today</span>
              <span className="badge-gold">{completionRate}%</span>
            </div>
            <div className="progress-bar-bg h-2">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-700" style={{ width: `${completionRate}%` }} />
            </div>
            <p className="text-xs muted-text mt-2">{completedCount} of {habits.length} habits completed</p>
          </div>
        </Card>

        <div className="lg:col-span-2">
          <Card>
            <h3 className="section-title mb-4">Your Habits</h3>
            {habits.length === 0 ? (
              <EmptyState icon="Habit" title="No habits yet" description="Create your first financial habit to start building discipline" action={openAdd} actionLabel="Create Habit" />
            ) : (
              <div className="space-y-3">
                {habits.map((habit) => {
                  const info = typeInfo(habit.type);
                  return (
                    <div
                      key={habit._id}
                      className={`group rounded-[1.35rem] border overflow-hidden transition-all ${habit.completedToday ? "opacity-80" : "hover:-translate-y-[1px]"}`}
                      style={{
                        background: habit.completedToday
                          ? "linear-gradient(135deg, rgba(245,158,11,0.09), rgba(255,255,255,0.02) 35%, rgba(255,255,255,0.01))"
                          : "linear-gradient(135deg, rgba(96,165,250,0.08), rgba(255,255,255,0.02) 35%, rgba(255,255,255,0.01))",
                        borderColor: habit.completedToday ? "rgba(245,158,11,0.18)" : "var(--border-light)",
                      }}
                    >
                      <div className="px-4 py-2.5 border-b flex items-center justify-between gap-3" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="badge-gold text-[11px]">{freqLabel(habit.frequency)}</span>
                          <span className="text-xs muted-text">{info.label}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {habit.streak > 0 ? (
                            <span className="flex items-center gap-1 text-xs text-orange-400">
                              <Flame size={11} />{getStreakLabel(habit.streak)}
                            </span>
                          ) : <span className="text-xs muted-text">No streak yet</span>}
                        </div>
                      </div>

                      <div className="p-4 flex items-start gap-4">
                        <button
                          onClick={() => handleComplete(habit)}
                          disabled={habit.completedToday || completing === habit._id}
                          className="flex-shrink-0 transition-transform hover:scale-110 disabled:cursor-default"
                        >
                          {habit.completedToday ? <CheckCircle2 size={24} className="text-amber-400" /> : <Circle size={24} className="muted-text hover:text-amber-400 transition-colors" />}
                        </button>

                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-white/5 text-2xl">
                          {info.icon}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                            <div className="min-w-0">
                              <p className={`text-base font-display font-700 leading-6 break-words ${habit.completedToday ? "line-through muted-text" : ""}`}>{habit.name}</p>
                              {habit.description ? <p className="text-sm muted-text mt-3 leading-6 break-words">{habit.description}</p> : null}
                            </div>

                            <div className="md:text-right shrink-0">
                              <div className="text-xl font-display font-800">{habit.streak || 0}</div>
                              <div className="text-xs muted-text">streak days</div>
                            </div>
                          </div>
                        </div>

                        <div className="hidden group-hover:flex gap-1 flex-shrink-0">
                          <button onClick={() => openEdit(habit)} className="p-1.5 rounded-lg hover:bg-white/5 muted-text hover:text-white transition-colors">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => handleDelete(habit._id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={`${editItem ? "Edit" : "New"} Habit`}>
        <div className="space-y-4">
          <Input label="Habit Name" placeholder="e.g. Save 500 every day" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Select label="Habit Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} options={HABIT_TYPES} />
          <Select label="Frequency" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} options={HABIT_FREQUENCIES} />
          <Input label="Description (optional)" placeholder="What does completing this mean?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" className="flex-1" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button className="flex-1" loading={saving} onClick={handleSave}>{editItem ? "Update" : "Create Habit"}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Habits;
