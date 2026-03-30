import { EXPENSE_CATEGORIES } from "../constants";

export const formatCurrency = (amount, currency = "Rs ") => {
  if (amount === null || amount === undefined) return `${currency}0`;
  const num = Number(amount);
  if (Number.isNaN(num)) return `${currency}0`;
  const absValue = Math.abs(num);

  if (absValue >= 1000) {
    const compact = new Intl.NumberFormat("en-US", {
      notation: "compact",
      compactDisplay: "short",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num);
    return `${currency}${compact}`;
  }

  return `${currency}${num.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

export const formatDate = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const formatRelativeTime = (date) => {
  if (!date) return "";

  const timestamp = new Date(date).getTime();
  if (Number.isNaN(timestamp)) return "";

  const diffMs = timestamp - Date.now();
  const absMs = Math.abs(diffMs);
  const minutes = Math.round(absMs / (1000 * 60));
  const hours = Math.round(absMs / (1000 * 60 * 60));
  const days = Math.round(absMs / (1000 * 60 * 60 * 24));

  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (minutes < 60) return rtf.format(diffMs < 0 ? -minutes : minutes, "minute");
  if (hours < 24) return rtf.format(diffMs < 0 ? -hours : hours, "hour");
  return rtf.format(diffMs < 0 ? -days : days, "day");
};

export const formatMonth = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
};

export const getPercentage = (current, target) => {
  if (!target || target === 0) return 0;
  return Math.min(Math.round((current / target) * 100), 100);
};

export const getDaysRemaining = (targetDate) => {
  if (!targetDate) return null;
  const now = new Date();
  const target = new Date(targetDate);
  const diff = target - now;
  return Math.max(Math.ceil(diff / (1000 * 60 * 60 * 24)), 0);
};

export const getCategoryInfo = (value) => {
  return (
    EXPENSE_CATEGORIES.find((c) => c.value === value) || {
      value,
      label: value || "Other",
      icon: "Other",
      color: "#94a3b8",
    }
  );
};

export const getIncomeSourceInfo = (value) => {
  const label = String(value || "").trim();

  return {
    value: label || "other",
    label: label || "Other",
    icon: "Other",
    color: "#94a3b8",
  };
};

export const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
};

export const calculateNetWorth = (savings = 0, investments = 0, debt = 0) => {
  return savings + investments - debt;
};

export const groupByMonth = (items, dateField = "date") => {
  return items.reduce((acc, item) => {
    const month = new Date(item[dateField]).toLocaleDateString("en-IN", {
      month: "short",
      year: "numeric",
    });
    acc[month] = acc[month] || [];
    acc[month].push(item);
    return acc;
  }, {});
};

export const sumBy = (arr, field) => {
  return arr.reduce((sum, item) => sum + (parseFloat(item[field]) || 0), 0);
};

export const truncate = (str, length = 30) => {
  if (!str) return "";
  return str.length > length ? `${str.substring(0, length)}...` : str;
};

export const getStreakLabel = (streak) => {
  if (streak === 0) return "Start today!";
  if (streak === 1) return "1 day";
  if (streak < 7) return `${streak} days`;
  if (streak < 30) return `${streak} days strong`;
  return `${streak} days elite`;
};
