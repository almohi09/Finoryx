const mongoose = require("mongoose");
const Income = require("../models/income.model");
const Expense = require("../models/expense.model");
const BankAccount = require("../models/bankAccount.model");
const BankTransaction = require("../models/bankTransaction.model");
const Investment = require("../models/investment.model");
const Goal = require("../models/goal.model");
const Habit = require("../models/habit.model");
const { createLinkToken, exchangePublicToken, getAccounts, syncTransactions, searchInstitutions } = require("../services/plaid.service");
const { decryptSecret, encryptSecret } = require("../utils/encryption.util");
const { generateAdvisorInsights } = require("../services/openaiAdvisor.service");
const { integrationConfig } = require("../config/integrations");

const ADVISOR_AI_CACHE = new Map();
const AI_SUCCESS_CACHE_MS = 2 * 60 * 1000;
const AI_RETRY_COOLDOWN_MS = 30 * 1000;

const ALLOWED_ADVISOR_SCOPES = new Set([
  "overall",
  "dashboard",
  "finance",
  "investments",
  "habits",
  "goals",
  "analytics",
  "account",
]);

const resolveAdvisorScope = (value) => {
  const scope = String(value || "overall").trim().toLowerCase();
  return ALLOWED_ADVISOR_SCOPES.has(scope) ? scope : "overall";
};

const buildScopedAdvisorInput = (payload, scope = "overall") => {
  if (scope === "overall" || scope === "dashboard" || scope === "analytics") {
    return payload;
  }

  if (scope === "finance") {
    return {
      totals: payload.totals,
      accounts: payload.accounts,
      behavior: payload.behavior,
      spending: payload.spending,
      trends: payload.trends,
      recent: {
        incomes: payload.recent?.incomes || [],
        expenses: payload.recent?.expenses || [],
        bankTransactions: payload.recent?.bankTransactions || [],
      },
    };
  }

  if (scope === "investments") {
    return {
      totals: payload.totals,
      investments: payload.investments,
      trends: payload.trends,
      recent: {
        investments: payload.recent?.investments || [],
        bankTransactions: payload.recent?.bankTransactions || [],
      },
    };
  }

  if (scope === "habits") {
    return {
      habits: payload.habits,
      recent: {
        habits: payload.recent?.habits || [],
      },
    };
  }

  if (scope === "goals") {
    return {
      goals: payload.goals,
      totals: payload.totals,
      recent: {
        goals: payload.recent?.goals || [],
      },
    };
  }

  if (scope === "account") {
    return {
      totals: payload.totals,
      goals: payload.goals,
      habits: payload.habits,
      accounts: payload.accounts,
    };
  }

  return payload;
};

const toIncomeResponse = (income) => ({
  ...income.toObject(),
  description: income.source,
});

const toExpenseResponse = (expense) => ({
  ...expense.toObject(),
  description: expense.title,
});

const toBankAccountResponse = (account) => ({
  ...account.toObject(),
  maskedNumber: account.mask ? `****${account.mask}` : "Not set",
  isProviderLinked: account.provider === "plaid" && Boolean(account.providerAccountId),
  providerAccessTokenEnc: undefined,
});

const toBankTransactionResponse = (transaction) => ({
  ...transaction.toObject(),
  accountName: transaction.bankAccountId?.accountName || "",
  institutionName: transaction.bankAccountId?.institutionName || "",
});

const categorizeTransaction = (description = "") => {
  const value = description.toLowerCase();

  if (value.includes("salary") || value.includes("payroll") || value.includes("bonus")) {
    return { category: "salary", transactionType: "income", direction: "credit" };
  }

  if (value.includes("dividend") || value.includes("interest")) {
    return { category: "investment", transactionType: "income", direction: "credit" };
  }

  if (value.includes("uber") || value.includes("fuel") || value.includes("metro")) {
    return { category: "transport", transactionType: "expense", direction: "debit" };
  }

  if (value.includes("grocery") || value.includes("restaurant") || value.includes("swiggy")) {
    return { category: "food", transactionType: "expense", direction: "debit" };
  }

  if (value.includes("rent")) {
    return { category: "rent", transactionType: "expense", direction: "debit" };
  }

  if (value.includes("electric") || value.includes("utility") || value.includes("broadband")) {
    return { category: "utilities", transactionType: "expense", direction: "debit" };
  }

  if (value.includes("sip") || value.includes("broker") || value.includes("investment")) {
    return { category: "investment", transactionType: "investment", direction: "debit" };
  }

  return { category: "other", transactionType: "expense", direction: "debit" };
};

const mapPlaidType = (tx, direction) => {
  const primary = String(tx?.personal_finance_category?.primary || tx?.personal_finance_category?.detailed || "").toLowerCase();

  if (primary.includes("investment")) return "investment";
  if (primary.includes("payroll") || primary.includes("income")) return "income";
  if (direction === "credit") return "income";
  return "expense";
};

const mapPlaidToBankTransaction = ({ userId, bankAccountId, tx }) => {
  const rawAmount = Number(tx.amount || 0);
  const direction = rawAmount < 0 ? "credit" : "debit";
  const amount = Math.abs(rawAmount);
  const dateValue = tx.authorized_date || tx.date || tx.datetime || new Date().toISOString();
  const categoryRaw = tx?.personal_finance_category?.primary || tx?.category?.[0] || "other";

  return {
    userId,
    bankAccountId,
    externalId: tx.transaction_id || "",
    source: "synced",
    transactionType: mapPlaidType(tx, direction),
    direction,
    description: tx.name || tx.original_description || "Bank Transaction",
    merchant: tx.merchant_name || "",
    category: String(categoryRaw || "other").toLowerCase(),
    amount,
    date: new Date(dateValue),
  };
};

const formatRuleAmount = (value) => Number(value || 0).toLocaleString("en-US");

const buildRuleBasedInsights = ({ trackedBalance, accounts, linkedBalance, foodExpense, totalExpense, investmentDebits, recurringIncome }) => {
  const insights = [];

  insights.push({
    id: "cash-flow",
    title: trackedBalance >= 0 ? "Cash flow remains positive" : "Cash flow needs attention",
    tone: trackedBalance >= 0 ? "positive" : "warning",
    summary:
      trackedBalance >= 0
        ? `Your tracked income is ahead of expenses by Rs ${formatRuleAmount(trackedBalance)}.`
        : `Your tracked expenses are ahead of income by Rs ${formatRuleAmount(Math.abs(trackedBalance))}.`,
    action:
      trackedBalance >= 0
        ? "Move part of the surplus into emergency savings or recurring investments."
        : "Reduce discretionary spending and review the latest synced debits before next month begins.",
  });

  if (accounts.length > 0) {
    insights.push({
      id: "bank-link",
      title: "Linked accounts are contributing live balance context",
      tone: "neutral",
      summary: `${accounts.length} linked account${accounts.length > 1 ? "s" : ""} currently show a combined balance of Rs ${formatRuleAmount(linkedBalance)}.`,
      action: "Run account sync after large transfers so recommendations stay current.",
    });
  }

  if (foodExpense > 0) {
    insights.push({
      id: "food-spend",
      title: "Food and dining is a visible spending driver",
      tone: foodExpense > totalExpense * 0.25 ? "warning" : "neutral",
      summary: `Food-related expenses total Rs ${formatRuleAmount(foodExpense)} across your tracked records.`,
      action: foodExpense > totalExpense * 0.25 ? "Set a weekly cap for delivery and dining orders." : "Keep this category monitored to avoid leakage.",
    });
  }

  insights.push({
    id: "investment-rhythm",
    title: investmentDebits > 0 ? "Investment activity is already showing up in account syncs" : "Investment activity is still light",
    tone: investmentDebits > 0 ? "positive" : "neutral",
    summary:
      investmentDebits > 0
        ? `Recent synced investment debits total Rs ${formatRuleAmount(investmentDebits)}.`
        : "No recent investment debits were detected from linked transactions.",
    action:
      investmentDebits > 0
        ? "Compare your recurring debits with executed trades to confirm allocation discipline."
        : "Set a recurring SIP or periodic buy order if long-term investing is a goal.",
  });

  insights.push({
    id: "income-stability",
    title: "Income baseline estimate",
    tone: "neutral",
    summary: `Recent recorded income suggests an average inflow near Rs ${formatRuleAmount(Math.round(recurringIncome))} per entry.`,
    action: "Use this baseline to cap fixed obligations below 60% of regular inflows.",
  });

  return insights;
};

const buildScopeRuleInsights = ({ scope, advisorInput, defaultInsights }) => {
  if (scope === "overall") {
    return defaultInsights;
  }

  if (scope === "dashboard") {
    const totals = advisorInput?.totals || {};
    const goals = advisorInput?.goals || {};
    const habits = advisorInput?.habits || {};
    return [
      {
        id: "dash-net",
        title: totals.trackedBalance >= 0 ? "Dashboard snapshot is net-positive" : "Dashboard snapshot shows pressure",
        tone: totals.trackedBalance >= 0 ? "positive" : "warning",
        summary: `Tracked balance is Rs ${formatRuleAmount(totals.trackedBalance || 0)} with linked balance Rs ${formatRuleAmount(totals.linkedBalance || 0)}.`,
        action: totals.trackedBalance >= 0 ? "Allocate part of surplus toward goals and emergency reserves." : "Reduce discretionary expenses and restore positive cash flow.",
      },
      {
        id: "dash-goals",
        title: "Goals progress at dashboard level",
        tone: goals.overallProgressPct >= 50 ? "positive" : "neutral",
        summary: `Goal progress is ${goals.overallProgressPct || 0}% with Rs ${formatRuleAmount(goals.totalSaved || 0)} saved.`,
        action: "Set monthly contribution targets per active goal and track variance weekly.",
      },
      {
        id: "dash-habits",
        title: "Habit consistency signal",
        tone: habits.completionRateLast30Days >= 60 ? "positive" : "warning",
        summary: `Habit completion in last 30 days is ${habits.completionRateLast30Days || 0}% across ${habits.totalHabits || 0} habits.`,
        action: "Keep only high-impact habits active if consistency drops.",
      },
    ];
  }

  if (scope === "analytics") {
    const trends = advisorInput?.trends?.monthly || [];
    const investments = advisorInput?.investments || {};
    const latest = trends[trends.length - 1] || {};
    return [
      {
        id: "ana-latest-month",
        title: "Latest month trend snapshot",
        tone: (latest.savings || 0) >= 0 ? "positive" : "warning",
        summary: `Latest tracked month shows income Rs ${formatRuleAmount(latest.income || 0)}, expense Rs ${formatRuleAmount(latest.expense || 0)}, savings Rs ${formatRuleAmount(latest.savings || 0)}.`,
        action: "Use this month as baseline and target at least 10% savings improvement next month.",
      },
      {
        id: "ana-investment",
        title: "Investment trend context",
        tone: (investments.unrealizedPnL || 0) >= 0 ? "positive" : "neutral",
        summary: `Current investment value is Rs ${formatRuleAmount(investments.totalCurrent || 0)} with unrealized P/L Rs ${formatRuleAmount(investments.unrealizedPnL || 0)}.`,
        action: "Compare portfolio growth against monthly savings trend for allocation balance.",
      },
    ];
  }

  if (scope === "finance") {
    return defaultInsights;
  }

  if (scope === "investments") {
    const investments = advisorInput?.investments || {};
    const pnl = Number(investments.unrealizedPnL || 0);
    return [
      {
        id: "inv-allocation",
        title: "Investment allocation snapshot",
        tone: "neutral",
        summary: `You currently track Rs ${formatRuleAmount(investments.totalCurrent || 0)} across ${investments.count || 0} investment records.`,
        action: "Review concentration by asset type and cap single-asset exposure risk.",
      },
      {
        id: "inv-pnl",
        title: pnl >= 0 ? "Portfolio is in unrealized gain" : "Portfolio is in unrealized drawdown",
        tone: pnl >= 0 ? "positive" : "warning",
        summary: `Unrealized P/L is around Rs ${formatRuleAmount(Math.abs(pnl))}${pnl >= 0 ? " in profit" : " in loss"}.`,
        action: pnl >= 0 ? "Consider partial profit-booking rules for overextended positions." : "Re-check stop-loss and position sizing discipline.",
      },
      {
        id: "inv-process",
        title: "Execution discipline reminder",
        tone: "neutral",
        summary: "Trade decisions are strongest when entries and exits are tied to predefined rules.",
        action: "Log a setup, invalidation, and risk per trade before placing the next order.",
      },
    ];
  }

  if (scope === "habits") {
    const habits = advisorInput?.habits || {};
    return [
      {
        id: "habit-rate",
        title: "Habit consistency checkpoint",
        tone: habits.completionRateLast30Days >= 60 ? "positive" : "warning",
        summary: `30-day habit completion is ${habits.completionRateLast30Days || 0}% across ${habits.totalHabits || 0} habits.`,
        action: habits.completionRateLast30Days >= 60 ? "Sustain momentum with weekly reviews." : "Reduce active habits and focus on 1-2 keystone habits first.",
      },
      {
        id: "habit-streak",
        title: "Streak quality",
        tone: "neutral",
        summary: `Average streak is ${habits.avgStreakDays || 0} days.`,
        action: "Use smaller daily targets to preserve streak continuity.",
      },
    ];
  }

  if (scope === "goals") {
    const goals = advisorInput?.goals || {};
    return [
      {
        id: "goal-progress",
        title: "Goal progress snapshot",
        tone: goals.overallProgressPct >= 50 ? "positive" : "warning",
        summary: `Goal progress is ${goals.overallProgressPct || 0}% with Rs ${formatRuleAmount(goals.totalSaved || 0)} saved out of Rs ${formatRuleAmount(goals.totalTarget || 0)}.`,
        action: "Map monthly contribution targets for each active goal.",
      },
      {
        id: "goal-deadline",
        title: "Deadline pressure check",
        tone: (goals.dueSoonGoals || 0) > 0 ? "warning" : "neutral",
        summary: `${goals.dueSoonGoals || 0} active goals are due within the next 30 days.`,
        action: (goals.dueSoonGoals || 0) > 0 ? "Prioritize urgent goals and defer lower-priority spend." : "Keep scheduled contributions automated.",
      },
    ];
  }

  if (scope === "account") {
    return [
      {
        id: "account-health",
        title: "Account-level planning snapshot",
        tone: "neutral",
        summary: "Your account profile combines balance, goals, and habit discipline signals.",
        action: "Review profile monthly to keep spending, goals, and habits aligned.",
      },
    ];
  }

  return defaultInsights;
};

const buildQuestionFallbackInsight = ({ question, scope, advisorInput }) => {
  const cleanQuestion = String(question || "").trim();
  if (!cleanQuestion) return null;

  const totals = advisorInput?.totals || {};
  const goals = advisorInput?.goals || {};
  const habits = advisorInput?.habits || {};
  const investments = advisorInput?.investments || {};

  const scopeSummaryByType = {
    finance: `Tracked balance is Rs ${formatRuleAmount(totals.trackedBalance || 0)} with linked balance Rs ${formatRuleAmount(totals.linkedBalance || 0)}.`,
    investments: `Current investments are Rs ${formatRuleAmount(investments.totalCurrent || 0)} with unrealized P/L Rs ${formatRuleAmount(investments.unrealizedPnL || 0)}.`,
    goals: `Goal progress is ${goals.overallProgressPct || 0}% with ${goals.dueSoonGoals || 0} goals due soon.`,
    habits: `Habit completion for last 30 days is ${habits.completionRateLast30Days || 0}% with average streak ${habits.avgStreakDays || 0} days.`,
  };

  return {
    id: "question-fallback",
    title: "Question-Based Guidance (Rules Mode)",
    tone: "neutral",
    summary: `AI provider is unavailable right now, so this is a deterministic answer for your ${scope} question: "${cleanQuestion}".`,
    action: scopeSummaryByType[scope] || `Use scoped advisor metrics to answer this question. Current tracked balance is Rs ${formatRuleAmount(totals.trackedBalance || 0)}.`,
  };
};

const addIncome = async (req, res, next) => {
  try {
    const income = await Income.create({
      userId: req.user._id,
      source: req.body.source,
      amount: req.body.amount,
      date: req.body.date || new Date(),
      notes: req.body.notes || "",
    });

    return res.status(201).json(toIncomeResponse(income));
  } catch (err) {
    next(err);
  }
};

const getIncomes = async (req, res, next) => {
  try {
    const incomes = await Income.find({ userId: req.user._id }).sort({ date: -1 });
    return res.status(200).json({ incomes: incomes.map(toIncomeResponse) });
  } catch (err) {
    next(err);
  }
};

const updateIncome = async (req, res, next) => {
  try {
    const income = await Income.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      {
        source: req.body.source,
        amount: req.body.amount,
        date: req.body.date || new Date(),
        notes: req.body.notes || "",
      },
      { new: true, runValidators: true }
    );

    if (!income) {
      return res.status(404).json({ message: "Income not found" });
    }

    return res.status(200).json(toIncomeResponse(income));
  } catch (err) {
    next(err);
  }
};

const addExpense = async (req, res, next) => {
  try {
    const expense = await Expense.create({
      userId: req.user._id,
      title: req.body.title,
      category: req.body.category,
      amount: req.body.amount,
      date: req.body.date || new Date(),
      notes: req.body.notes || "",
    });

    return res.status(201).json(toExpenseResponse(expense));
  } catch (err) {
    next(err);
  }
};

const getExpenses = async (req, res, next) => {
  try {
    const expenses = await Expense.find({ userId: req.user._id }).sort({ date: -1 });
    return res.status(200).json({ expenses: expenses.map(toExpenseResponse) });
  } catch (err) {
    next(err);
  }
};

const updateExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      {
        title: req.body.title,
        category: req.body.category,
        amount: req.body.amount,
        date: req.body.date || new Date(),
        notes: req.body.notes || "",
      },
      { new: true, runValidators: true }
    );

    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    return res.status(200).json(toExpenseResponse(expense));
  } catch (err) {
    next(err);
  }
};

const deleteTransaction = async (req, res, next) => {
  const { id, type } = req.params;

  try {
    const Model = type === "income" ? Income : type === "expense" ? Expense : null;

    if (!Model) {
      return res.status(400).json({ message: "Invalid type" });
    }

    const deleted = await Model.findOneAndDelete({ _id: id, userId: req.user._id });
    if (!deleted) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    return res.status(200).json({ message: "Transaction deleted successfully" });
  } catch (err) {
    next(err);
  }
};

const getSummary = async (req, res, next) => {
  try {
    const [income, expense] = await Promise.all([
      Income.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(req.user._id) } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Expense.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(req.user._id) } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

    const totalIncome = income[0]?.total || 0;
    const totalExpense = expense[0]?.total || 0;

    return res.status(200).json({
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
    });
  } catch (err) {
    next(err);
  }
};

const getCategoryBreakdown = async (req, res, next) => {
  try {
    const breakdown = await Expense.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(req.user._id) } },
      { $group: { _id: "$category", amount: { $sum: "$amount" } } },
      { $sort: { amount: -1 } },
    ]);

    return res.status(200).json({
      categories: breakdown.map((item) => ({
        category: item._id,
        amount: item.amount,
      })),
    });
  } catch (err) {
    next(err);
  }
};

const getBankAccounts = async (req, res, next) => {
  try {
    const accounts = await BankAccount.find({ userId: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json({ accounts: accounts.map(toBankAccountResponse) });
  } catch (err) {
    next(err);
  }
};

const addBankAccount = async (req, res, next) => {
  try {
    const account = await BankAccount.create({
      userId: req.user._id,
      institutionName: req.body.institutionName,
      accountName: req.body.accountName,
      accountType: req.body.accountType,
      mask: req.body.mask,
      balance: req.body.balance,
      provider: req.body.provider || "manual",
      status: "connected",
    });

    return res.status(201).json(toBankAccountResponse(account));
  } catch (err) {
    next(err);
  }
};

const createPlaidLinkToken = async (req, res, next) => {
  try {
    const result = await createLinkToken({
      userId: req.user._id.toString(),
      clientName: "Fynvester",
    });

    return res.status(200).json({
      linkToken: result.link_token,
      expiration: result.expiration,
      requestId: result.request_id,
    });
  } catch (err) {
    next(err);
  }
};

const exchangePlaidPublicToken = async (req, res, next) => {
  try {
    const publicToken = String(req.body.publicToken || "").trim();
    if (!publicToken) {
      return res.status(400).json({ message: "publicToken is required" });
    }

    const exchange = await exchangePublicToken(publicToken);
    const accessToken = exchange.access_token;
    const itemId = exchange.item_id;
    const accounts = await getAccounts(accessToken);

    const createdAccounts = [];
    for (const account of accounts) {
      const subtype = String(account.subtype || account.type || "other").toLowerCase();
      const normalizedType = ["checking", "savings", "credit", "brokerage"].includes(subtype) ? subtype : "other";

      const doc = await BankAccount.findOneAndUpdate(
        {
          userId: req.user._id,
          provider: "plaid",
          providerAccountId: account.account_id,
        },
        {
          userId: req.user._id,
          institutionName: account.official_name || account.name || "Linked Account",
          accountName: account.name || account.official_name || "Linked Account",
          accountType: normalizedType,
          mask: String(account.mask || "").slice(-4),
          balance: Number(account.balances?.current ?? account.balances?.available ?? 0),
          provider: "plaid",
          providerItemId: itemId,
          providerAccountId: account.account_id,
          providerAccessTokenEnc: encryptSecret(accessToken),
          providerMeta: {
            type: account.type,
            subtype: account.subtype,
            available: account.balances?.available,
            limit: account.balances?.limit,
          },
          status: "connected",
          lastSyncedAt: new Date(),
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      createdAccounts.push(doc);
    }

    return res.status(200).json({
      message: "Bank accounts linked successfully",
      accounts: createdAccounts.map(toBankAccountResponse),
      itemId,
    });
  } catch (err) {
    next(err);
  }
};

const searchBankInstitutions = async (req, res, next) => {
  try {
    const q = String(req.query.q || "").trim();
    if (!q) {
      return res.status(200).json({ institutions: [] });
    }

    const limit = Number(req.query.limit || 10);
    const institutions = await searchInstitutions(q, limit);
    return res.status(200).json({ institutions });
  } catch (err) {
    next(err);
  }
};

const syncBankAccount = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: "Invalid bank account ID" });
    }

    const account = await BankAccount.findOne({ _id: req.params.id, userId: req.user._id });
    if (!account) {
      return res.status(404).json({ message: "Bank account not found" });
    }

    if (account.provider !== "plaid") {
      return res.status(400).json({ message: "Automatic sync is only supported for Plaid-linked accounts" });
    }

    if (!account.providerAccessTokenEnc) {
      return res.status(400).json({ message: "Missing provider credentials for this account" });
    }

    const accessToken = decryptSecret(account.providerAccessTokenEnc);
    const syncResult = await syncTransactions({
      accessToken,
      cursor: account.providerSyncCursor || "",
    });

    let writeCount = 0;
    for (const tx of syncResult.added) {
      if (tx.account_id !== account.providerAccountId) continue;
      const payload = mapPlaidToBankTransaction({
        userId: req.user._id,
        bankAccountId: account._id,
        tx,
      });
      if (!payload.externalId) continue;

      await BankTransaction.findOneAndUpdate(
        { userId: req.user._id, externalId: payload.externalId },
        payload,
        { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
      );
      writeCount += 1;
    }

    for (const tx of syncResult.modified) {
      if (tx.account_id !== account.providerAccountId) continue;
      const payload = mapPlaidToBankTransaction({
        userId: req.user._id,
        bankAccountId: account._id,
        tx,
      });
      if (!payload.externalId) continue;

      await BankTransaction.findOneAndUpdate(
        { userId: req.user._id, externalId: payload.externalId },
        payload,
        { upsert: true, new: true, runValidators: true }
      );
      writeCount += 1;
    }

    if (syncResult.removed.length) {
      const removedIds = syncResult.removed.map((item) => item.transaction_id).filter(Boolean);
      if (removedIds.length) {
        await BankTransaction.deleteMany({ userId: req.user._id, externalId: { $in: removedIds } });
      }
    }

    account.providerSyncCursor = syncResult.nextCursor || account.providerSyncCursor;
    account.lastSyncedAt = new Date();
    account.status = "connected";
    await account.save();

    const syncedTransactions = await BankTransaction.find({ bankAccountId: account._id })
      .populate("bankAccountId", "accountName institutionName")
      .sort({ date: -1 })
      .limit(30);

    return res.status(200).json({
      message: "Bank account synced successfully",
      account: toBankAccountResponse(account),
      transactions: syncedTransactions.map(toBankTransactionResponse),
      delta: {
        added: syncResult.added.length,
        modified: syncResult.modified.length,
        removed: syncResult.removed.length,
        written: writeCount,
      },
    });
  } catch (err) {
    next(err);
  }
};

const getBankTransactions = async (req, res, next) => {
  try {
    const transactions = await BankTransaction.find({ userId: req.user._id })
      .populate("bankAccountId", "accountName institutionName")
      .sort({ date: -1, createdAt: -1 })
      .limit(300);

    return res.status(200).json({ transactions: transactions.map(toBankTransactionResponse) });
  } catch (err) {
    next(err);
  }
};

const getAdvisorInsights = async (req, res, next) => {
  try {
    const scope = resolveAdvisorScope(req.query.scope || req.body?.scope);
    const question = String(req.query.question || req.body?.question || "").trim().slice(0, 500);
    const cacheKey = `${req.user._id}:${scope}:${question}`;
    const nowMs = Date.now();
    const userId = new mongoose.Types.ObjectId(req.user._id);
    const now = new Date();
    const last30DaysStart = new Date(now);
    last30DaysStart.setDate(last30DaysStart.getDate() - 29);
    last30DaysStart.setHours(0, 0, 0, 0);
    const trendStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const trendEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [
      income,
      expense,
      accounts,
      transactions,
      recentExpenses,
      recentIncomes,
      expenseByCategory,
      incomeBySource,
      monthlyIncome,
      monthlyExpense,
      investmentTotals,
      investmentsByType,
      recentInvestments,
      goals,
      habits,
    ] = await Promise.all([
      Income.aggregate([
        { $match: { userId } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Expense.aggregate([
        { $match: { userId } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      BankAccount.find({ userId: req.user._id }).sort({ createdAt: -1 }),
      BankTransaction.find({ userId: req.user._id }).sort({ date: -1 }).limit(120),
      Expense.find({ userId: req.user._id }).sort({ date: -1 }).limit(20),
      Income.find({ userId: req.user._id }).sort({ date: -1 }).limit(20),
      Expense.aggregate([
        { $match: { userId } },
        { $group: { _id: "$category", amount: { $sum: "$amount" }, count: { $sum: 1 } } },
        { $sort: { amount: -1 } },
        { $limit: 12 },
      ]),
      Income.aggregate([
        { $match: { userId } },
        { $group: { _id: "$source", amount: { $sum: "$amount" }, count: { $sum: 1 } } },
        { $sort: { amount: -1 } },
        { $limit: 12 },
      ]),
      Income.aggregate([
        { $match: { userId, date: { $gte: trendStart, $lte: trendEnd } } },
        { $group: { _id: { year: { $year: "$date" }, month: { $month: "$date" } }, amount: { $sum: "$amount" } } },
      ]),
      Expense.aggregate([
        { $match: { userId, date: { $gte: trendStart, $lte: trendEnd } } },
        { $group: { _id: { year: { $year: "$date" }, month: { $month: "$date" } }, amount: { $sum: "$amount" } } },
      ]),
      Investment.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: null,
            totalInvested: { $sum: "$amountInvested" },
            totalCurrent: { $sum: "$currentValue" },
            count: { $sum: 1 },
          },
        },
      ]),
      Investment.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: "$type",
            invested: { $sum: "$amountInvested" },
            current: { $sum: "$currentValue" },
            count: { $sum: 1 },
          },
        },
        { $sort: { current: -1 } },
        { $limit: 10 },
      ]),
      Investment.find({ userId: req.user._id })
        .sort({ dateOfInvestment: -1 })
        .limit(15)
        .select("name type amountInvested currentValue dateOfInvestment"),
      Goal.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .select("title category targetAmount savedAmount deadline status createdAt"),
      Habit.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .select("name type frequency streak lastCompleted completedDates startDate createdAt"),
    ]);

    const totalIncome = income[0]?.total || 0;
    const totalExpense = expense[0]?.total || 0;
    const trackedBalance = totalIncome - totalExpense;
    const linkedBalance = accounts.reduce((sum, item) => sum + (item.balance || 0), 0);
    const foodExpense = recentExpenses
      .filter((item) => item.category === "food")
      .reduce((sum, item) => sum + (item.amount || 0), 0);
    const investmentDebits = transactions
      .filter((item) => item.transactionType === "investment" || item.category === "investment")
      .reduce((sum, item) => sum + (item.amount || 0), 0);
    const recurringIncome = recentIncomes.slice(0, 3).reduce((sum, item) => sum + (item.amount || 0), 0) / Math.max(recentIncomes.slice(0, 3).length, 1);

    const debitFlow = transactions
      .filter((item) => item.direction === "debit")
      .reduce((sum, item) => sum + (item.amount || 0), 0);
    const creditFlow = transactions
      .filter((item) => item.direction === "credit")
      .reduce((sum, item) => sum + (item.amount || 0), 0);

    const trendByKey = new Map();
    monthlyIncome.forEach((item) => {
      const key = `${item._id.year}-${item._id.month}`;
      trendByKey.set(key, { ...(trendByKey.get(key) || {}), income: item.amount || 0 });
    });
    monthlyExpense.forEach((item) => {
      const key = `${item._id.year}-${item._id.month}`;
      trendByKey.set(key, { ...(trendByKey.get(key) || {}), expense: item.amount || 0 });
    });

    const monthlyTrend = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
      const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
      const bucket = trendByKey.get(key) || {};
      const incomeAmount = bucket.income || 0;
      const expenseAmount = bucket.expense || 0;
      return {
        monthKey: key,
        month: date.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        income: incomeAmount,
        expense: expenseAmount,
        savings: incomeAmount - expenseAmount,
      };
    });

    const totalGoalTarget = goals.reduce((sum, goal) => sum + (goal.targetAmount || 0), 0);
    const totalGoalSaved = goals.reduce((sum, goal) => sum + (goal.savedAmount || 0), 0);
    const activeGoals = goals.filter((goal) => goal.status === "active");
    const dueSoonGoals = activeGoals.filter((goal) => {
      if (!goal.deadline) return false;
      const deadline = new Date(goal.deadline);
      const days = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
      return days >= 0 && days <= 30;
    });

    const habitsCompletedLast30 = habits.filter((habit) => (
      habit.completedDates || []
    ).some((date) => new Date(date) >= last30DaysStart)).length;
    const avgHabitStreak = habits.length
      ? Math.round(habits.reduce((sum, habit) => sum + (habit.streak || 0), 0) / habits.length)
      : 0;

    const investmentSummary = investmentTotals[0] || { totalInvested: 0, totalCurrent: 0, count: 0 };

    const advisorInput = {
      totals: { totalIncome, totalExpense, trackedBalance, linkedBalance },
      accounts: {
        linkedAccounts: accounts.length,
        syncedTransactions: transactions.length,
      },
      behavior: {
        foodExpense,
        foodExpenseShare: totalExpense > 0 ? foodExpense / totalExpense : 0,
        investmentDebits,
        recurringIncome,
      },
      investments: {
        totalInvested: investmentSummary.totalInvested || 0,
        totalCurrent: investmentSummary.totalCurrent || 0,
        unrealizedPnL: (investmentSummary.totalCurrent || 0) - (investmentSummary.totalInvested || 0),
        count: investmentSummary.count || 0,
        byType: investmentsByType.map((item) => ({
          type: item._id || "other",
          invested: item.invested || 0,
          current: item.current || 0,
          count: item.count || 0,
        })),
      },
      goals: {
        totalGoals: goals.length,
        activeGoals: activeGoals.length,
        completedGoals: goals.filter((goal) => goal.status === "completed").length,
        dueSoonGoals: dueSoonGoals.length,
        totalTarget: totalGoalTarget,
        totalSaved: totalGoalSaved,
        overallProgressPct: totalGoalTarget > 0 ? Math.round((totalGoalSaved / totalGoalTarget) * 100) : 0,
      },
      habits: {
        totalHabits: habits.length,
        completedLast30Days: habitsCompletedLast30,
        completionRateLast30Days: habits.length ? Math.round((habitsCompletedLast30 / habits.length) * 100) : 0,
        avgStreakDays: avgHabitStreak,
      },
      spending: {
        expenseByCategory: expenseByCategory.map((item) => ({
          category: item._id || "other",
          amount: item.amount || 0,
          count: item.count || 0,
        })),
        incomeBySource: incomeBySource.map((item) => ({
          source: item._id || "other",
          amount: item.amount || 0,
          count: item.count || 0,
        })),
        bankFlow: {
          debit: debitFlow,
          credit: creditFlow,
          netFlow: creditFlow - debitFlow,
        },
      },
      trends: {
        monthly: monthlyTrend,
      },
      recent: {
        incomes: recentIncomes.slice(0, 10).map((item) => ({
          source: item.source,
          amount: item.amount,
          date: item.date,
        })),
        expenses: recentExpenses.slice(0, 10).map((item) => ({
          title: item.title,
          category: item.category,
          amount: item.amount,
          date: item.date,
        })),
        bankTransactions: transactions.slice(0, 20).map((item) => ({
          transactionType: item.transactionType,
          direction: item.direction,
          category: item.category,
          amount: item.amount,
          date: item.date,
          description: item.description,
        })),
        investments: recentInvestments.slice(0, 10).map((item) => ({
          name: item.name,
          type: item.type,
          amountInvested: item.amountInvested,
          currentValue: item.currentValue,
          dateOfInvestment: item.dateOfInvestment,
        })),
        goals: goals.slice(0, 10).map((item) => ({
          title: item.title,
          category: item.category,
          targetAmount: item.targetAmount,
          savedAmount: item.savedAmount,
          deadline: item.deadline,
          status: item.status,
        })),
        habits: habits.slice(0, 12).map((item) => ({
          name: item.name,
          frequency: item.frequency,
          streak: item.streak,
          lastCompleted: item.lastCompleted,
        })),
      },
    };

    const defaultRuleInsights = buildRuleBasedInsights({
      trackedBalance,
      accounts,
      linkedBalance,
      foodExpense,
      totalExpense,
      investmentDebits,
      recurringIncome,
    });
    const ruleInsights = buildScopeRuleInsights({
      scope,
      advisorInput,
      defaultInsights: defaultRuleInsights,
    });

    const scopedAdvisorInput = buildScopedAdvisorInput(advisorInput, scope);

    let aiAdvisorResponse = null;
    let advisorNote = "";
    const cached = ADVISOR_AI_CACHE.get(cacheKey);
    if (cached?.insights && nowMs - cached.at < AI_SUCCESS_CACHE_MS) {
      aiAdvisorResponse = { insights: cached.insights, provider: cached.provider };
    } else if (cached?.cooldownUntil && nowMs < cached.cooldownUntil) {
      advisorNote = `AI temporarily limited. Retrying after ${Math.ceil((cached.cooldownUntil - nowMs) / 1000)}s.`;
    } else {
      const aiAttempt = await generateAdvisorInsights(scopedAdvisorInput, {
        scope,
        question: question || undefined,
      });

      if (aiAttempt?.insights?.length) {
        aiAdvisorResponse = aiAttempt;
        ADVISOR_AI_CACHE.set(cacheKey, {
          at: nowMs,
          insights: aiAttempt.insights,
          provider: aiAttempt.provider,
          cooldownUntil: 0,
        });
      } else if (aiAttempt?.error) {
        ADVISOR_AI_CACHE.set(cacheKey, {
          at: nowMs,
          insights: cached?.insights || [],
          provider: cached?.provider || "",
          cooldownUntil: nowMs + AI_RETRY_COOLDOWN_MS,
        });
        if (aiAttempt.error.isRateLimit) {
          advisorNote = "AI rate-limited on provider. Showing rules/cached response temporarily.";
        } else if (aiAttempt.error.isBilling) {
          advisorNote = "AI provider billing/credits issue. Showing rules response.";
        } else {
          advisorNote = "AI provider unavailable. Showing rules response.";
        }
      }
    }

    const questionFallback = buildQuestionFallbackInsight({
      question,
      scope,
      advisorInput: scopedAdvisorInput,
    });
    const fallbackInsights = questionFallback ? [questionFallback, ...ruleInsights] : ruleInsights;
    const insights = aiAdvisorResponse?.insights || fallbackInsights;

    return res.status(200).json({
      insights,
      summary: {
        totalIncome,
        totalExpense,
        trackedBalance,
        linkedBalance,
        linkedAccounts: accounts.length,
        syncedTransactions: transactions.length,
      },
      metadata: {
        source: aiAdvisorResponse?.provider || "rules",
        scope,
        question: question || "",
        note: advisorNote,
      },
    });
  } catch (err) {
    next(err);
  }
};

const getAdvisorHealth = async (req, res, next) => {
  try {
    const provider = integrationConfig.advisor.provider || "openai";
    const openaiConfigured = Boolean(integrationConfig.openaiAdvisor.enabled);
    const geminiConfigured = Boolean(integrationConfig.advisor.gemini.enabled);
    const openrouterConfigured = Boolean(integrationConfig.advisor.openrouter?.enabled);
    const providerConfigured = provider === "gemini"
      ? geminiConfigured
      : provider === "openrouter"
        ? openrouterConfigured
        : openaiConfigured;

    return res.status(200).json({
      advisor: {
        provider,
        providerConfigured,
        fallbackAvailable: true,
      },
      providers: {
        openai: {
          configured: openaiConfigured,
          model: integrationConfig.openaiAdvisor.model,
          baseUrl: integrationConfig.openaiAdvisor.baseUrl,
        },
        gemini: {
          configured: geminiConfigured,
          model: integrationConfig.advisor.gemini.model,
          baseUrl: integrationConfig.advisor.gemini.baseUrl,
        },
        openrouter: {
          configured: openrouterConfigured,
          model: integrationConfig.advisor.openrouter?.model || "",
          baseUrl: integrationConfig.advisor.openrouter?.baseUrl || "",
        },
      },
      status: providerConfigured ? "ready" : "fallback-only",
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  addIncome,
  getIncomes,
  updateIncome,
  addExpense,
  getExpenses,
  updateExpense,
  deleteTransaction,
  getSummary,
  getCategoryBreakdown,
  getBankAccounts,
  addBankAccount,
  createPlaidLinkToken,
  exchangePlaidPublicToken,
  searchBankInstitutions,
  syncBankAccount,
  getBankTransactions,
  getAdvisorInsights,
  getAdvisorHealth,
};
