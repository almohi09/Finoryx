import { useEffect, useState } from "react";
import { Trash2, Users, Activity, BarChart3, MessageSquare, Eye } from "lucide-react";
import { adminService } from "../../services/admin.service";
import { formatDate, formatCurrency } from "../../utils/helpers";
import Card from "../../components/ui/Card";
import Modal from "../../components/ui/Modal";
import EmptyState from "../../components/ui/EmptyState";
import toast from "react-hot-toast";

const EMPTY_STATS = {
  totalUsers: 0,
  activeUsers: 0,
  totalTransactions: 0,
  avgHabitCompletion: "0%",
  totalSavingsTracked: 0,
  newUsersThisMonth: 0,
};

const tabs = ["Overview", "Users", "Feedback"];

const Admin = () => {
  const [activeTab, setActiveTab] = useState("Overview");
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [feedback, setFeedback] = useState([]);
  const [viewUser, setViewUser] = useState(null);
  const [loadingUserId, setLoadingUserId] = useState(null);
  const [respondingId, setRespondingId] = useState(null);

  const fetchData = async () => {
    const [usersRes, statsRes, feedbackRes] = await Promise.allSettled([
      adminService.getUsers(),
      adminService.getPlatformStats(),
      adminService.getFeedback(),
    ]);

    setUsers(usersRes.status === "fulfilled" ? usersRes.value.data?.users || [] : []);
    setStats(statsRes.status === "fulfilled" ? { ...EMPTY_STATS, ...(statsRes.value.data || {}) } : EMPTY_STATS);
    setFeedback(feedbackRes.status === "fulfilled" ? feedbackRes.value.data?.feedback || [] : []);
  };

  useEffect(() => {
    Promise.resolve().then(fetchData);
  }, []);

  const handleViewUser = async (id) => {
    setLoadingUserId(id);
    try {
      const { data } = await adminService.getUserById(id);
      setViewUser(data?.user || null);
    } catch {
      toast.error("Failed to load user details");
    } finally {
      setLoadingUserId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this user? This action cannot be undone.")) return;
    try {
      await adminService.deleteUser(id);
      toast.success("User deleted");
      fetchData();
    } catch {
      toast.error("Failed to delete user");
    }
  };

  const handleRespondFeedback = async (item) => {
    const adminResponse = prompt("Enter admin response:", item.adminResponse || "");
    if (adminResponse === null) return;

    setRespondingId(item._id);
    try {
      await adminService.respondFeedback(item._id, {
        status: "reviewed",
        adminResponse,
      });
      toast.success("Feedback updated");
      fetchData();
    } catch {
      toast.error("Failed to update feedback");
    } finally {
      setRespondingId(null);
    }
  };

  const statCards = [
    { label: "Total Users", value: stats.totalUsers, sub: "Registered user accounts", icon: Users, color: "text-blue-400 bg-blue-400/10" },
    { label: "Active Users", value: stats.activeUsers, sub: "Users currently counted as active", icon: Activity, color: "text-green-400 bg-green-400/10" },
    { label: "Total Transactions", value: String(stats.totalTransactions || 0), sub: "Income and expense records", icon: BarChart3, color: "text-amber-400 bg-amber-400/10" },
    { label: "Habit Completion", value: stats.avgHabitCompletion || "0%", sub: "Habits completed today", icon: Activity, color: "text-purple-400 bg-purple-400/10" },
    { label: "Savings Tracked", value: formatCurrency(stats.totalSavingsTracked || 0), sub: "Total income recorded", icon: BarChart3, color: "text-emerald-400 bg-emerald-400/10" },
    { label: "New This Month", value: stats.newUsersThisMonth || 0, sub: "Users created this calendar month", icon: Users, color: "text-rose-400 bg-rose-400/10" },
  ];

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="animate-fade-up">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="page-title">Admin Panel</h1>
          <span className="badge-gold ml-2">Admin</span>
        </div>
        <p className="muted-text text-sm">Platform management and analytics</p>
      </div>

      <div className="flex gap-1 p-1 rounded-xl w-fit animate-fade-up animate-delay-100" style={{ background: "var(--bg-secondary)" }}>
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-display font-500 transition-all ${activeTab === tab ? "text-[var(--bg-primary)]" : "muted-text hover:text-white"}`}
            style={{ background: activeTab === tab ? "var(--accent-gold)" : "transparent" }}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Overview" && (
        <div className="space-y-5 animate-fade-up">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {statCards.map((item) => (
              <Card key={item.label}>
                <div className="flex items-start justify-between mb-3">
                  <span className="muted-text text-xs">{item.label}</span>
                  <span className={`p-2 rounded-xl ${item.color}`}>
                    <item.icon size={14} />
                  </span>
                </div>
                <div className="stat-value">{item.value}</div>
                <div className="text-xs muted-text mt-1">{item.sub}</div>
              </Card>
            ))}
          </div>

          <Card>
            <h3 className="section-title mb-4">Recent Signups</h3>
            {users.length === 0 ? (
              <div className="text-center py-12 muted-text text-sm">No users found</div>
            ) : (
              <div className="space-y-2">
                {users.slice(0, 5).map((user) => (
                  <div key={user._id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/3 transition-colors">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-display font-700 flex-shrink-0" style={{ background: "var(--accent-gold)", color: "var(--bg-primary)" }}>
                      {user.name?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-display font-600 truncate">{user.name}</p>
                      <p className="text-xs muted-text">{user.email}</p>
                    </div>
                    <div className="text-right">
                      <span className={`badge-${user.isActive ? "green" : "red"}`}>{user.isActive ? "Active" : "Inactive"}</span>
                      <p className="text-xs muted-text mt-1">{formatDate(user.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === "Users" && (
        <Card className="animate-fade-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title">All Users ({users.length})</h3>
          </div>
          {users.length === 0 ? (
            <EmptyState icon="Users" title="No users found" description="User records will appear here." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                    {["User", "Email", "Joined", "Habits", "Invested", "Status", "Actions"].map((header) => (
                      <th key={header} className="text-left py-3 pr-6 text-xs font-display font-600 muted-text uppercase tracking-wider">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user._id} className="border-b hover:bg-white/2 transition-colors" style={{ borderColor: "var(--border)" }}>
                      <td className="py-3 pr-6">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-display font-700 flex-shrink-0" style={{ background: "var(--accent-gold)", color: "var(--bg-primary)" }}>
                            {user.name?.[0]?.toUpperCase()}
                          </div>
                          <span className="font-display font-500">{user.name}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-6 muted-text text-xs">{user.email}</td>
                      <td className="py-3 pr-6 muted-text text-xs">{formatDate(user.createdAt)}</td>
                      <td className="py-3 pr-6"><span className="badge-gold">{user.habitCount || 0}</span></td>
                      <td className="py-3 pr-6 text-xs">
                        <div className="font-display font-600">{formatCurrency(user.currentInvestmentValue || 0)}</div>
                        <div className="muted-text mt-0.5">{user.investmentCount || 0} holdings</div>
                      </td>
                      <td className="py-3 pr-6"><span className={`badge-${user.isActive ? "green" : "red"}`}>{user.isActive ? "Active" : "Inactive"}</span></td>
                      <td className="py-3 pr-6">
                        <div className="flex gap-1">
                          <button onClick={() => handleViewUser(user._id)} className="p-1.5 rounded-lg hover:bg-white/5 muted-text hover:text-white transition-colors" disabled={loadingUserId === user._id}>
                            <Eye size={13} />
                          </button>
                          <button onClick={() => handleDelete(user._id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400/60 hover:text-red-400 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {activeTab === "Feedback" && (
        <Card className="animate-fade-up">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare size={18} className="text-amber-400" />
            <h3 className="section-title">User Feedback</h3>
          </div>
          {feedback.length === 0 ? (
            <div className="text-center py-12 muted-text text-sm">No feedback submitted</div>
          ) : (
            <div className="space-y-3">
              {feedback.map((fb, index) => (
                <div key={fb._id || index} className="p-4 rounded-xl border" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-display font-600 text-sm">{fb.user || "User"}</span>
                      {fb.email ? <p className="text-xs muted-text mt-0.5">{fb.email}</p> : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="badge-gold">{fb.category || "other"}</span>
                      <span className="badge-gold">{fb.rating || 0}/5</span>
                      <span className="badge-gold">{fb.status || "new"}</span>
                      <span className="text-xs muted-text">{fb.date ? formatDate(fb.date) : "-"}</span>
                    </div>
                  </div>
                  <p className="text-sm muted-text">"{fb.message || ""}"</p>
                  {fb.adminResponse ? (
                    <div className="mt-3 p-3 rounded-lg text-xs" style={{ background: "rgba(245, 158, 11, 0.08)" }}>
                      <span className="font-display font-600">Admin response:</span> {fb.adminResponse}
                    </div>
                  ) : null}
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => handleRespondFeedback(fb)}
                      disabled={respondingId === fb._id}
                      className="px-3 py-1.5 rounded-lg text-xs font-display font-600 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors disabled:opacity-60"
                    >
                      {fb.adminResponse ? "Edit Response" : "Respond"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <Modal isOpen={!!viewUser} onClose={() => setViewUser(null)} title="User Details" size="lg">
        {viewUser ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "var(--bg-secondary)" }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-base font-display font-700" style={{ background: "var(--accent-gold)", color: "var(--bg-primary)" }}>
                {viewUser.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="font-display font-700">{viewUser.name}</p>
                <p className="text-xs muted-text">{viewUser.email}</p>
              </div>
            </div>
            {[
              ["Role", viewUser.role],
              ["Status", viewUser.isActive ? "Active" : "Inactive"],
              ["Joined", formatDate(viewUser.createdAt)],
              ["Habits", viewUser.habitCount || 0],
              ["Total Invested", formatCurrency(viewUser.totalInvested || 0)],
              ["Current Value", formatCurrency(viewUser.currentInvestmentValue || 0)],
              ["Investments", viewUser.investmentCount || 0],
              ["Total Expenses", formatCurrency(viewUser.totalExpenses || 0)],
            ].map(([key, value]) => (
              <div key={key} className="grid grid-cols-[140px,1fr] gap-3 py-2 border-b items-start" style={{ borderColor: "var(--border)" }}>
                <span className="muted-text text-sm">{key}</span>
                <span className="text-sm font-display font-600 break-words text-right">{value}</span>
              </div>
            ))}
            <div className="pt-2">
              <p className="text-xs font-display font-700 mb-2">Investment Breakdown</p>
              {viewUser.investmentBreakdown?.length ? (
                <div className="space-y-2">
                  {viewUser.investmentBreakdown.map((item) => (
                    <div key={item.type} className="grid grid-cols-[120px,1fr] gap-3 text-xs p-2 rounded-lg items-start" style={{ background: "var(--bg-secondary)" }}>
                      <span className="muted-text break-words">{item.type}</span>
                      <span className="break-words text-right">{formatCurrency(item.currentValue)} from {item.count} holding{item.count > 1 ? "s" : ""}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs muted-text">No investments recorded</p>
              )}
            </div>
            <div className="pt-2">
              <p className="text-xs font-display font-700 mb-2">Investment Records</p>
              {viewUser.investments?.length ? (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {viewUser.investments.map((investment) => (
                    <div key={investment._id} className="p-3 rounded-xl border" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
                      <div className="grid grid-cols-[1fr,140px] gap-3 items-start">
                        <div className="min-w-0">
                          <p className="text-sm font-display font-600 truncate">{investment.name}</p>
                          <p className="text-xs muted-text">{investment.type} | {formatDate(investment.purchaseDate)}</p>
                        </div>
                        <div className="text-right text-xs break-words">
                          <div>{formatCurrency(investment.amount || 0)} invested</div>
                          <div className="muted-text">{formatCurrency(investment.currentValue || 0)} current</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs muted-text">No investment records for this user</p>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default Admin;
