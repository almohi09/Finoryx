const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();

const normalizeApiBaseUrl = (url) =>
  url
    .replace(/\/+(auth|finance|investments|dashboard|habits|goals|admin|feedback)(\/.*)?$/i, "")
    .replace(/\/+$/, "");

const resolveApiBaseUrl = () => {
  if (configuredApiUrl) {
    return normalizeApiBaseUrl(configuredApiUrl);
  }

  if (import.meta.env.DEV) {
    return "http://localhost:3000/api";
  }

  if (typeof window !== "undefined") {
    const { hostname, origin } = window.location;
    const isLocalHost = ["localhost", "127.0.0.1"].includes(hostname);

    if (isLocalHost) {
      return `${origin}/api`;
    }

    console.warn(
      "VITE_API_URL is not configured for production. Requests will fall back to /api on the current domain, which will 404 on Render if the backend is deployed as a separate service."
    );
  }

  return "/api";
};

export const API_BASE_URL = resolveApiBaseUrl();

export const EXPENSE_CATEGORIES = [
  { value: "food", label: "Food & Dining", icon: "Food", color: "#f59e0b" },
  { value: "transport", label: "Transport", icon: "Transport", color: "#60a5fa" },
  { value: "rent", label: "Rent & Housing", icon: "Home", color: "#a78bfa" },
  { value: "utilities", label: "Utilities", icon: "Utilities", color: "#34d399" },
  { value: "health", label: "Health & Medical", icon: "Health", color: "#fb7185" },
  { value: "entertainment", label: "Entertainment", icon: "Entertainment", color: "#fbbf24" },
  { value: "shopping", label: "Shopping", icon: "Shopping", color: "#f472b6" },
  { value: "education", label: "Education", icon: "Education", color: "#38bdf8" },
  { value: "investment", label: "Investment", icon: "Investment", color: "#4ade80" },
  { value: "other", label: "Other", icon: "Other", color: "#94a3b8" },
];

export const INCOME_SOURCES = [
  { value: "salary", label: "Salary" },
  { value: "freelance", label: "Freelance" },
  { value: "business", label: "Business" },
  { value: "investment", label: "Investment Returns" },
  { value: "rental", label: "Rental Income" },
  { value: "other", label: "Other" },
];

export const HABIT_FREQUENCIES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

export const HABIT_TYPES = [
  { value: "save", label: "Save Money", icon: "Save" },
  { value: "track_expenses", label: "Track Expenses", icon: "Track" },
  { value: "invest", label: "Invest", icon: "Invest" },
  { value: "budget_review", label: "Review Budget", icon: "Review" },
  { value: "no_spend", label: "No-Spend Day", icon: "No Spend" },
  { value: "custom", label: "Custom Habit", icon: "Custom" },
];

export const INVESTMENT_TYPES = [
  { value: "stocks", label: "Stocks" },
  { value: "mutual_funds", label: "Mutual Funds" },
  { value: "fd", label: "Fixed Deposit" },
  { value: "real_estate", label: "Real Estate" },
  { value: "gold", label: "Gold" },
  { value: "crypto", label: "Crypto" },
  { value: "ppf", label: "PPF" },
  { value: "other", label: "Other" },
];

export const GOAL_CATEGORIES = [
  { value: "emergency_fund", label: "Emergency Fund", icon: "Emergency" },
  { value: "vacation", label: "Vacation", icon: "Vacation" },
  { value: "home", label: "Home Purchase", icon: "Home" },
  { value: "car", label: "Car Purchase", icon: "Car" },
  { value: "education", label: "Education", icon: "Education" },
  { value: "retirement", label: "Retirement", icon: "Retirement" },
  { value: "wedding", label: "Wedding", icon: "Wedding" },
  { value: "other", label: "Other", icon: "Goal" },
];

export const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
