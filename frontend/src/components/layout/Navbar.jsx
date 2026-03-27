import { Menu, Bell, MessageSquare } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getGreeting } from "../../utils/helpers";

const Navbar = ({ onMenuToggle, onFeedbackClick }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  return (
    <header
      className="h-14 flex items-center justify-between px-4 md:px-6 border-b sticky top-0 z-20"
      style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="p-2 rounded-xl hover:bg-white/5 transition-colors lg:hidden muted-text hover:text-white"
        >
          <Menu size={18} />
        </button>
        <div className="hidden sm:block">
          <span className="text-sm muted-text">
            {getGreeting()},{" "}
            <span className="text-[var(--text-primary)] font-display font-600">
              {user?.name?.split(" ")[0] || "there"}
            </span>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {!isAdmin && (
          <button
            onClick={onFeedbackClick}
            className="p-2 rounded-xl hover:bg-white/5 transition-colors muted-text hover:text-white"
            title="Send feedback"
          >
            <MessageSquare size={16} />
          </button>
        )}
        <button className="p-2 rounded-xl hover:bg-white/5 transition-colors muted-text hover:text-white relative">
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-400" />
        </button>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-display font-700"
          style={{ background: "var(--accent-gold)", color: "var(--bg-primary)" }}>
          {user?.name?.[0]?.toUpperCase() || "U"}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
