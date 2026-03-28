const mongoose = require("mongoose");
const Income = require("../models/income.model");
const Expense = require("../models/expense.model");
const BankAccount = require("../models/bankAccount.model");
const BankTransaction = require("../models/bankTransaction.model");

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

const buildSyntheticTransactions = (account) => {
  const syncStamp = new Date();
  const base = [
    {
      description: "Monthly Salary Credit",
      merchant: "Employer Payroll",
      amount: Math.max(25000, Math.round((Math.abs(account.balance) + 40000) * 0.35)),
      date: new Date(syncStamp.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      description: "Swiggy Grocery Order",
      merchant: "Swiggy Instamart",
      amount: Math.max(650, Math.round(Math.abs(account.balance) * 0.012)),
      date: new Date(syncStamp.getTime() - 36 * 60 * 60 * 1000),
    },
    {
      description: "Fuel Station Payment",
      merchant: "Indian Oil",
      amount: Math.max(1200, Math.round(Math.abs(account.balance) * 0.017)),
      date: new Date(syncStamp.getTime() - 22 * 60 * 60 * 1000),
    },
    {
      description: "Mutual Fund SIP",
      merchant: "Broker AutoPay",
      amount: Math.max(3000, Math.round(Math.abs(account.balance) * 0.025)),
      date: new Date(syncStamp.getTime() - 8 * 60 * 60 * 1000),
    },
  ];

  return base.map((item, index) => {
    const tags = categorizeTransaction(item.description);
    return {
      userId: account.userId,
      bankAccountId: account._id,
      externalId: `${account._id}-${syncStamp.toISOString()}-${index}`,
      source: "synced",
      ...tags,
      description: item.description,
      merchant: item.merchant,
      amount: item.amount,
      date: item.date,
    };
  });
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

const syncBankAccount = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: "Invalid bank account ID" });
    }

    const account = await BankAccount.findOne({ _id: req.params.id, userId: req.user._id });
    if (!account) {
      return res.status(404).json({ message: "Bank account not found" });
    }

    const newTransactions = buildSyntheticTransactions(account);
    if (newTransactions.length) {
      await BankTransaction.insertMany(newTransactions, { ordered: false });
    }

    account.lastSyncedAt = new Date();
    account.status = "connected";
    await account.save();

    const syncedTransactions = await BankTransaction.find({ bankAccountId: account._id })
      .populate("bankAccountId", "accountName institutionName")
      .sort({ date: -1 })
      .limit(8);

    return res.status(200).json({
      message: "Bank account synced successfully",
      account: toBankAccountResponse(account),
      transactions: syncedTransactions.map(toBankTransactionResponse),
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(200).json({ message: "Bank account was already synced for this cycle" });
    }
    next(err);
  }
};

const getBankTransactions = async (req, res, next) => {
  try {
    const transactions = await BankTransaction.find({ userId: req.user._id })
      .populate("bankAccountId", "accountName institutionName")
      .sort({ date: -1, createdAt: -1 })
      .limit(100);

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
      BankTransaction.find({ userId: req.user._id }).sort({ date: -1 }).limit(20),
      Expense.find({ userId: req.user._id }).sort({ date: -1 }).limit(50),
      Income.find({ userId: req.user._id }).sort({ date: -1 }).limit(20),
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
  syncBankAccount,
  getBankTransactions,
  getAdvisorInsights,
};
