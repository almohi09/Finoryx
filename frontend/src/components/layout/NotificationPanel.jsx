import { Link } from "react-router-dom";
import { Bell, CheckCheck, RefreshCcw } from "lucide-react";
import { useNotifications } from "../../context/NotificationsContext";
import { formatRelativeTime } from "../../utils/helpers";

const toneStyles = {
  gold: {
    badge: "bg-amber-400/12 text-amber-300 border-amber-400/20",
    dot: "bg-amber-400",
  },
  red: {
    badge: "bg-rose-500/12 text-rose-300 border-rose-500/20",
    dot: "bg-rose-400",
  },
  green: {
    badge: "bg-emerald-500/12 text-emerald-300 border-emerald-500/20",
    dot: "bg-emerald-400",
  },
  blue: {
    badge: "bg-sky-500/12 text-sky-300 border-sky-500/20",
    dot: "bg-sky-400",
  },
};

const NotificationPanel = ({ onClose }) => {
  const {
    notifications,
    unreadCount,
    loading,
    lastUpdated,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
    isRead,
  } = useNotifications();

  return (
    <div
      className="absolute right-0 top-[calc(100%+0.75rem)] w-[22rem] max-w-[calc(100vw-2rem)] rounded-2xl border shadow-2xl overflow-hidden"
      style={{
        background: "linear-gradient(180deg, rgba(37, 35, 25, 0.98), rgba(26, 24, 18, 0.98))",
        borderColor: "var(--border-light)",
      }}
    >
      <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-display font-700">Notifications</p>
            <p className="text-xs muted-text">
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={refreshNotifications}
              className="p-2 rounded-lg hover:bg-white/5 muted-text hover:text-white transition-colors"
              title="Refresh notifications"
            >
              <RefreshCcw size={14} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              onClick={markAllAsRead}
              className="p-2 rounded-lg hover:bg-white/5 muted-text hover:text-white transition-colors"
              title="Mark all as read"
            >
              <CheckCheck size={14} />
            </button>
          </div>
        </div>
        {lastUpdated ? <p className="text-[11px] muted-text mt-2">Updated {formatRelativeTime(lastUpdated)}</p> : null}
      </div>

      <div className="max-h-[24rem] overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center bg-white/5 text-amber-300">
              <Bell size={18} />
            </div>
            <p className="font-display font-600">No notifications yet</p>
            <p className="text-xs muted-text mt-1">New activity will show up here.</p>
          </div>
        ) : (
          notifications.map((item) => {
            const read = isRead(item.id);
            const tone = toneStyles[item.tone] || toneStyles.gold;

            return (
              <Link
                key={item.id}
                to={item.href}
                onClick={() => {
                  markAsRead(item.id);
                  onClose();
                }}
                className="block px-4 py-3 border-b hover:bg-white/[0.03] transition-colors"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="flex items-start gap-3">
                  <div className="pt-1">
                    <span className={`block w-2.5 h-2.5 rounded-full ${read ? "bg-white/15" : tone.dot}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <p className={`text-sm font-display ${read ? "font-500 muted-text" : "font-700 text-[var(--text-primary)]"}`}>
                        {item.title}
                      </p>
                      <span className={`text-[10px] px-2 py-1 rounded-full border uppercase tracking-[0.14em] ${tone.badge}`}>
                        {item.type}
                      </span>
                    </div>
                    <p className="text-xs mt-1 muted-text leading-5">{item.message}</p>
                    <div className="flex items-center justify-between gap-3 mt-2">
                      <span className="text-[11px] muted-text">{formatRelativeTime(item.createdAt)}</span>
                      <span className="text-[11px] gold-text font-display font-600">{item.cta}</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
};

export default NotificationPanel;
