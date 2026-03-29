import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import BrandLogo from "../branding/BrandLogo";
import {
  LayoutDashboard, TrendingUp, Repeat2, Target,
  BarChart3, ShieldCheck, LogOut, Wallet, ChevronRight, Settings,
} from "lucide-react";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/finance", icon: Wallet, label: "Finance" },
  { to: "/investments", icon: TrendingUp, label: "Investments" },
  { to: "/habits", icon: Repeat2, label: "Habits" },
  { to: "/goals", icon: Target, label: "Goals" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/account", icon: Settings, label: "Account" },
];

const Sidebar = ({ open, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const isAdmin = user?.role === "admin";

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full z-40 flex flex-col transition-transform duration-300
          w-60 border-r
          ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
      >
        {/* Logo */}
        <div className="px-5 pt-6 pb-5">
          <BrandLogo size="sm" />
        </div>

        <div className="divider mx-4 my-0" />

        {/* Nav */}
        <nav className="flex-1 px-3 pt-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-display font-500 transition-all duration-150 group
                ${isActive
                  ? "text-[var(--accent-gold)] bg-amber-500/10"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {(() => {
                    const NavIcon = icon;
                    return <NavIcon size={16} className="flex-shrink-0" />;
                  })()}
                  <span className="flex-1">{label}</span>
                  {isActive && <ChevronRight size={13} className="opacity-60" />}
                </>
              )}
            </NavLink>
          ))}

          {isAdmin && (
            <>
              <div className="divider mx-0 my-3" />
              <NavLink
                to="/admin"
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-display font-500 transition-all duration-150
                  ${isActive
                    ? "text-purple-400 bg-purple-500/10"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5"
                  }`
                }
              >
                <ShieldCheck size={16} />
                <span>Admin Panel</span>
              </NavLink>
            </>
          )}
        </nav>

        {/* User */}
        <div className="p-3 border-t" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1"
            style={{ background: "var(--bg-card)" }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-display font-700 flex-shrink-0"
              style={{ background: "var(--accent-gold)", color: "var(--bg-primary)" }}>
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-display font-600 truncate">{user?.name || "User"}</p>
              <p className="text-xs muted-text truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors font-display font-500"
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
