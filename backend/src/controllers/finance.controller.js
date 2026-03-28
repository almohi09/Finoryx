const mongoose = require("mongoose");
const Income = require("../models/income.model");
const Expense = require("../models/expense.model");
const BankAccount = require("../models/bankAccount.model");
const BankTransaction = require("../models/bankTransaction.model");
const { createLinkToken, exchangePublicToken, getAccounts, syncTransactions, searchInstitutions } = require("../services/plaid.service");
const { decryptSecret, encryptSecret } = require("../utils/encryption.util");
const { generateAdvisorInsights } = require("../services/openaiAdvisor.service");

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

const buildRuleBasedInsights = ({ trackedBalance, accounts, linkedBalance, foodExpense, totalExpense, investmentDebits, recurringIncome }) => {
  const insights = [];

  insights.push({
    id: "cash-flow",
    title: trackedBalance >= 0 ? "Cash flow remains positive" : "Cash flow needs attention",
    tone: trackedBalance >= 0 ? "positive" : "warning",
    summary:
      trackedBalance >= 0
        ? `Your tracked income is ahead of expenses by Rs ${trackedBalance.toLocaleString("en-IN")}.`
        : `Your tracked expenses are ahead of income by Rs ${Math.abs(trackedBalance).toLocaleString("en-IN")}.`,
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
      summary: `${accounts.length} linked account${accounts.length > 1 ? "s" : ""} currently show a combined balance of Rs ${linkedBalance.toLocaleString("en-IN")}.`,
      action: "Run account sync after large transfers so recommendations stay current.",
    });
  }

  if (foodExpense > 0) {
    insights.push({
      id: "food-spend",
      title: "Food and dining is a visible spending driver",
      tone: foodExpense > totalExpense * 0.25 ? "warning" : "neutral",
      summary: `Food-related expenses total Rs ${foodExpense.toLocaleString("en-IN")} across your tracked records.`,
      action: foodExpense > totalExpense * 0.25 ? "Set a weekly cap for delivery and dining orders." : "Keep this category monitored to avoid leakage.",
    });
  }

  insights.push({
    id: "investment-rhythm",
    title: investmentDebits > 0 ? "Investment activity is already showing up in account syncs" : "Investment activity is still light",
    tone: investmentDebits > 0 ? "positive" : "neutral",
    summary:
      investmentDebits > 0
        ? `Recent synced investment debits total Rs ${investmentDebits.toLocaleString("en-IN")}.`
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
    summary: `Recent recorded income suggests an average inflow near Rs ${Math.round(recurringIncome).toLocaleString("en-IN")} per entry.`,
    action: "Use this baseline to cap fixed obligations below 60% of regular inflows.",
  });

  return insights;
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
      clientName: "Finoryx",
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
    const userId = new mongoose.Types.ObjectId(req.user._id);
    const [income, expense, accounts, transactions, expenses, incomes] = await Promise.all([
      Income.aggregate([
        { $match: { userId } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Expense.aggregate([
        { $match: { userId } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      BankAccount.find({ userId: req.user._id }).sort({ createdAt: -1 }),
      BankTransaction.find({ userId: req.user._id }).sort({ date: -1 }).limit(40),
      Expense.find({ userId: req.user._id }).sort({ date: -1 }).limit(60),
      Income.find({ userId: req.user._id }).sort({ date: -1 }).limit(30),
    ]);

    const totalIncome = income[0]?.total || 0;
    const totalExpense = expense[0]?.total || 0;
    const trackedBalance = totalIncome - totalExpense;
    const linkedBalance = accounts.reduce((sum, item) => sum + (item.balance || 0), 0);
    const foodExpense = expenses
      .filter((item) => item.category === "food")
      .reduce((sum, item) => sum + (item.amount || 0), 0);
    const investmentDebits = transactions
      .filter((item) => item.transactionType === "investment" || item.category === "investment")
      .reduce((sum, item) => sum + (item.amount || 0), 0);
    const recurringIncome = incomes.slice(0, 3).reduce((sum, item) => sum + (item.amount || 0), 0) / Math.max(incomes.slice(0, 3).length, 1);

    const ruleInsights = buildRuleBasedInsights({
      trackedBalance,
      accounts,
      linkedBalance,
      foodExpense,
      totalExpense,
      investmentDebits,
      recurringIncome,
    });

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
    };

    const aiInsights = await generateAdvisorInsights(advisorInput);
    const insights = aiInsights || ruleInsights;

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
        source: aiInsights ? "openai" : "rules",
      },
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
};
