/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { dashboardService } from "../services/dashboard.service";
import { goalService } from "../services/goal.service";
import { adminService } from "../services/admin.service";
import { useAuth } from "./AuthContext";

const NotificationsContext = createContext(null);

const MAX_NOTIFICATIONS = 10;

const normalizeDate = (value, fallback = Date.now()) => {
  const timestamp = value ? new Date(value).getTime() : NaN;
  return Number.isNaN(timestamp) ? fallback : timestamp;
};

const createNotification = ({
  id,
  type,
  title,
  message,
  tone = "gold",
  createdAt,
  href = "/dashboard",
  cta = "Open",
}) => ({
  id,
  type,
  title,
  message,
  tone,
  createdAt: normalizeDate(createdAt),
  href,
  cta,
});

const buildUserNotifications = ({ summary, transactions, habits, goals }) => {
  const notifications = [];
  const now = Date.now();

  const incompleteHabits = habits.filter((habit) => !habit.completedToday);
  if (incompleteHabits.length > 0) {
    notifications.push(
      createNotification({
        id: `habit-pending-${new Date().toDateString()}-${incompleteHabits.length}`,
        type: "habit",
        title: "Habits pending today",
        message: `${incompleteHabits.length} habit${incompleteHabits.length > 1 ? "s are" : " is"} still waiting for completion.`,
        tone: "blue",
        createdAt: now,
        href: "/habits",
        cta: "Complete habits",
      })
    );
  }

  habits
    .filter((habit) => (habit.streak || 0) > 0 && [7, 30, 100].includes(habit.streak))
    .forEach((habit) => {
      notifications.push(
        createNotification({
          id: `habit-streak-${habit._id}-${habit.streak}`,
          type: "habit",
          title: "Streak milestone",
          message: `${habit.name} reached a ${habit.streak}-day streak.`,
          tone: "gold",
          createdAt: habit.updatedAt || now,
          href: "/habits",
          cta: "View habit",
        })
      );
    });

  goals.forEach((goal) => {
    const currentAmount = goal.currentAmount || 0;
    const targetAmount = goal.targetAmount || 0;
    const targetDate = goal.targetDate ? new Date(goal.targetDate) : null;
    const progress = targetAmount > 0 ? Math.round((currentAmount / targetAmount) * 100) : 0;
    const daysRemaining = targetDate
      ? Math.ceil((targetDate.getTime() - now) / (1000 * 60 * 60 * 24))
      : null;

    if (targetAmount > 0 && currentAmount >= targetAmount) {
      notifications.push(
        createNotification({
          id: `goal-complete-${goal._id}`,
          type: "goal",
          title: "Goal completed",
          message: `${goal.name} is fully funded.`,
          tone: "green",
          createdAt: goal.updatedAt || now,
          href: "/goals",
          cta: "Review goal",
        })
      );
      return;
    }

    if (daysRemaining !== null && daysRemaining < 0) {
      notifications.push(
        createNotification({
          id: `goal-overdue-${goal._id}`,
          type: "goal",
          title: "Goal deadline passed",
          message: `${goal.name} is overdue. Add funds or extend the deadline.`,
          tone: "red",
          createdAt: targetDate,
          href: "/goals",
          cta: "Update goal",
        })
      );
      return;
    }

    if (daysRemaining !== null && daysRemaining <= 14) {
      notifications.push(
        createNotification({
          id: `goal-deadline-${goal._id}`,
          type: "goal",
          title: "Goal deadline is close",
          message: `${goal.name} is due in ${daysRemaining === 0 ? "less than a day" : `${daysRemaining} day${daysRemaining > 1 ? "s" : ""}`}.`,
          tone: "red",
          createdAt: targetDate,
          href: "/goals",
          cta: "Add funds",
        })
      );
      return;
    }

    if (progress >= 80) {
      notifications.push(
        createNotification({
          id: `goal-progress-${goal._id}-${progress}`,
          type: "goal",
          title: "Goal almost there",
          message: `${goal.name} is ${progress}% funded.`,
          tone: "gold",
          createdAt: goal.updatedAt || now,
          href: "/goals",
          cta: "Keep going",
        })
      );
    }
  });

  const latestExpense = transactions.find((item) => item.type === "expense");
  if (latestExpense && summary.monthlyIncome > 0 && latestExpense.amount >= summary.monthlyIncome * 0.4) {
    notifications.push(
      createNotification({
        id: `expense-large-${latestExpense._id || latestExpense.createdAt}`,
        type: "finance",
        title: "Large recent expense",
        message: `${latestExpense.description || "An expense"} is a significant share of this month's income.`,
        tone: "red",
        createdAt: latestExpense.date || latestExpense.createdAt || now,
        href: "/finance",
        cta: "Review finances",
      })
    );
  }

  if (summary.monthlyIncome > 0 && summary.monthlyExpenses > summary.monthlyIncome) {
    notifications.push(
      createNotification({
        id: `budget-alert-${new Date().getFullYear()}-${new Date().getMonth()}`,
        type: "finance",
        title: "Expenses exceeded income",
        message: "This month's expenses are currently above tracked income.",
        tone: "red",
        createdAt: now,
        href: "/finance",
        cta: "Check budget",
      })
    );
  }

  return notifications;
};

const buildAdminNotifications = ({ feedback, users }) => {
  const notifications = [];
  const newFeedback = feedback.filter((item) => item.status === "new");
  const inactiveUsers = users.filter((user) => user.isActive === false);

  if (newFeedback.length > 0) {
    const newestFeedback = [...newFeedback].sort((a, b) => normalizeDate(b.createdAt || b.date) - normalizeDate(a.createdAt || a.date))[0];
    notifications.push(
      createNotification({
        id: `feedback-new-${newFeedback.length}-${normalizeDate(newestFeedback?.createdAt || newestFeedback?.date)}`,
        type: "admin",
        title: "New feedback awaiting review",
        message: `${newFeedback.length} feedback item${newFeedback.length > 1 ? "s are" : " is"} still marked as new.`,
        tone: "gold",
        createdAt: newestFeedback?.createdAt || newestFeedback?.date || Date.now(),
        href: "/admin",
        cta: "Review feedback",
      })
    );
  }

  if (inactiveUsers.length > 0) {
    const latestInactive = [...inactiveUsers].sort((a, b) => normalizeDate(b.createdAt) - normalizeDate(a.createdAt))[0];
    notifications.push(
      createNotification({
        id: `users-inactive-${inactiveUsers.length}`,
        type: "admin",
        title: "Inactive users detected",
        message: `${inactiveUsers.length} user account${inactiveUsers.length > 1 ? "s are" : " is"} currently inactive.`,
        tone: "blue",
        createdAt: latestInactive?.createdAt || Date.now(),
        href: "/admin",
        cta: "Open users",
      })
    );
  }

  return notifications;
};

export const NotificationsProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [readIds, setReadIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const storageKey = user?._id ? `fynvester.notifications.read.${user._id}` : "";

  useEffect(() => {
    if (!storageKey) {
      setReadIds([]);
      return;
    }

    try {
      const parsed = JSON.parse(window.localStorage.getItem(storageKey) || "[]");
      setReadIds(Array.isArray(parsed) ? parsed : []);
    } catch {
      setReadIds([]);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    window.localStorage.setItem(storageKey, JSON.stringify(readIds));
  }, [readIds, storageKey]);

  const refreshNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      return;
    }

    setLoading(true);
    try {
      if (user.role === "admin") {
        const [feedbackRes, usersRes] = await Promise.allSettled([
          adminService.getFeedback(),
          adminService.getUsers(),
        ]);

        const feedback = feedbackRes.status === "fulfilled" ? feedbackRes.value.data?.feedback || [] : [];
        const users = usersRes.status === "fulfilled" ? usersRes.value.data?.users || [] : [];

        setNotifications(
          buildAdminNotifications({ feedback, users })
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, MAX_NOTIFICATIONS)
        );
      } else {
        const [summaryRes, transactionsRes, habitRes, goalRes] = await Promise.allSettled([
          dashboardService.getSummary(),
          dashboardService.getRecentTransactions(),
          dashboardService.getHabitOverview(),
          goalService.getGoals(),
        ]);

        const summary = summaryRes.status === "fulfilled" ? summaryRes.value.data || {} : {};
        const transactions = transactionsRes.status === "fulfilled" ? transactionsRes.value.data?.transactions || [] : [];
        const habits = habitRes.status === "fulfilled" ? habitRes.value.data?.habits || [] : [];
        const goals = goalRes.status === "fulfilled" ? goalRes.value.data?.goals || [] : [];

        setNotifications(
          buildUserNotifications({ summary, transactions, habits, goals })
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, MAX_NOTIFICATIONS)
        );
      }

      setLastUpdated(Date.now());
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  useEffect(() => {
    if (!user) return undefined;

    const intervalId = window.setInterval(() => {
      refreshNotifications();
    }, 60000);

    return () => window.clearInterval(intervalId);
  }, [refreshNotifications, user]);

  const markAsRead = (id) => {
    if (!id) return;
    setReadIds((current) => (current.includes(id) ? current : [...current, id]));
  };

  const markAllAsRead = () => {
    setReadIds((current) => {
      const next = new Set(current);
      notifications.forEach((item) => next.add(item.id));
      return [...next];
    });
  };

  const unreadCount = notifications.filter((item) => !readIds.includes(item.id)).length;

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        lastUpdated,
        markAsRead,
        markAllAsRead,
        refreshNotifications,
        isRead: (id) => readIds.includes(id),
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) throw new Error("useNotifications must be used within NotificationsProvider");
  return context;
};

export default NotificationsContext;
