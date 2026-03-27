import { useEffect, useRef, useState } from "react";
import { Menu, Bell, MessageSquare } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationsContext";
import { getGreeting } from "../../utils/helpers";
import NotificationPanel from "./NotificationPanel";

const Navbar = ({ onMenuToggle, onFeedbackClick }) => {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const isAdmin = user?.role === "admin";
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsRef = useRef(null);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!notificationsRef.current?.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };

    if (notificationsOpen) {
      document.addEventListener("mousedown", handlePointerDown);
    }

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [notificationsOpen]);

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
        <div className="relative" ref={notificationsRef}>
          <button
            onClick={() => setNotificationsOpen((open) => !open)}
            className="p-2 rounded-xl hover:bg-white/5 transition-colors muted-text hover:text-white relative"
            title="Open notifications"
          >
            <Bell size={16} />
            {unreadCount > 0 ? (
              <>
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span className="absolute -top-1 -right-1 min-w-[1rem] h-4 px-1 rounded-full bg-amber-400 text-[10px] leading-4 text-black font-display font-700">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              </>
            ) : null}
          </button>
          {notificationsOpen ? <NotificationPanel onClose={() => setNotificationsOpen(false)} /> : null}
        </div>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-display font-700"
          style={{ background: "var(--accent-gold)", color: "var(--bg-primary)" }}>
          {user?.name?.[0]?.toUpperCase() || "U"}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
