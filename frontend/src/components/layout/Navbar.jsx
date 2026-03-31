import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Menu, Bell, MessageSquare, BrainCircuit } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationsContext";
import { getGreeting } from "../../utils/helpers";
import NotificationPanel from "./NotificationPanel";
import AdvisorPanel from "./AdvisorPanel";

const Navbar = ({ onMenuToggle, onFeedbackClick, scrollTargetRef }) => {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const location = useLocation();
  const isAdmin = user?.role === "admin";
  const [advisorOpen, setAdvisorOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const advisorRef = useRef(null);
  const notificationsRef = useRef(null);

  useEffect(() => {
    const target = scrollTargetRef?.current;
    if (!target) return;

    let lastTop = target.scrollTop;
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        const currentTop = target.scrollTop;
        const delta = currentTop - lastTop;

        if (currentTop <= 8) {
          setIsHidden(false);
        } else if (Math.abs(delta) > 6) {
          setIsHidden(delta > 0);
        }

        lastTop = currentTop;
        ticking = false;
      });
    };

    target.addEventListener("scroll", onScroll, { passive: true });
    return () => target.removeEventListener("scroll", onScroll);
  }, [scrollTargetRef]);

  const shouldHideNavbar = isHidden && !advisorOpen && !notificationsOpen;

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!notificationsRef.current?.contains(event.target)) {
        setNotificationsOpen(false);
      }
      if (!advisorRef.current?.contains(event.target)) {
        setAdvisorOpen(false);
      }
    };

    if (notificationsOpen || advisorOpen) {
      document.addEventListener("mousedown", handlePointerDown);
    }

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [notificationsOpen, advisorOpen]);

  const deriveAdvisorScope = (pathname = "") => {
    const segments = pathname
      .split("/")
      .map((item) => String(item || "").trim().toLowerCase())
      .filter(Boolean);

    const aliases = {
      investment: "investments",
      investments: "investments",
      goal: "goals",
      goals: "goals",
      habit: "habits",
      habits: "habits",
      analytic: "analytics",
      analytics: "analytics",
      finance: "finance",
      dashboard: "dashboard",
      account: "account",
    };

    for (const segment of segments) {
      if (aliases[segment]) {
        return aliases[segment];
      }
    }

    return "overall";
  };

  const advisorScope = deriveAdvisorScope(location.pathname);

  return (
    <header
      className={`sticky top-0 z-20 h-14 shrink-0 flex items-center justify-between px-4 md:px-6 border-b backdrop-blur-md transition-transform duration-300 ${shouldHideNavbar ? "-translate-y-full" : "translate-y-0"}`}
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
        <div className="relative" ref={advisorRef}>
          <button
            onClick={() => {
              setAdvisorOpen((open) => !open);
              setNotificationsOpen(false);
            }}
            className={`p-2 rounded-xl transition-colors muted-text hover:text-white ${advisorOpen ? "bg-white/10 text-white" : "hover:bg-white/5"}`}
            title={`Open ${advisorScope} advisor`}
          >
            <BrainCircuit size={16} />
          </button>
          {advisorOpen ? <AdvisorPanel scope={advisorScope} onClose={() => setAdvisorOpen(false)} /> : null}
        </div>
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
            onClick={() => {
              setNotificationsOpen((open) => !open);
              setAdvisorOpen(false);
            }}
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
