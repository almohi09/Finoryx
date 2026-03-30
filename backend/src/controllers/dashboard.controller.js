const mongoose = require("mongoose");
const Income = require("../models/income.model");
const Expense = require("../models/expense.model");
const Investment = require("../models/investment.model");
const TradeOrder = require("../models/tradeOrder.model");
const Habit = require("../models/habit.model");

const tradeCashFlowProjection = [
  {
    $project: {
      effectiveQty: { $cond: [{ $gt: ["$filledQty", 0] }, "$filledQty", "$quantity"] },
      effectivePrice: { $cond: [{ $gt: ["$filledAvgPrice", 0] }, "$filledAvgPrice", "$price"] },
      fees: "$fees",
      side: "$side",
      executedAt: "$executedAt",
      tradeCashFlow: {
        $cond: [
          { $eq: ["$side", "buy"] },
          { $add: [{ $multiply: [{ $cond: [{ $gt: ["$filledQty", 0] }, "$filledQty", "$quantity"] }, { $cond: [{ $gt: ["$filledAvgPrice", 0] }, "$filledAvgPrice", "$price"] }] }, "$fees"] },
          { $multiply: [-1, { $subtract: [{ $multiply: [{ $cond: [{ $gt: ["$filledQty", 0] }, "$filledQty", "$quantity"] }, { $cond: [{ $gt: ["$filledAvgPrice", 0] }, "$filledAvgPrice", "$price"] }] }, "$fees"] }] },
        ],
      },
    },
  },
];

const getSummary = async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user._id);

    const [income, expense, investment, tradeTotals] = await Promise.all([
      Income.aggregate([{ $match: { userId } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      Expense.aggregate([{ $match: { userId } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      Investment.aggregate([{ $match: { userId } }, { $group: { _id: null, total: { $sum: "$currentValue" } } }]),
      TradeOrder.aggregate([
        { $match: { userId } },
        ...tradeCashFlowProjection,
        { $group: { _id: null, tradeNetInvested: { $sum: "$tradeCashFlow" } } },
      ]),
    ]);

    const totalIncome = income[0]?.total || 0;
    const totalExpense = expense[0]?.total || 0;
    const manualInvestments = investment[0]?.total || 0;
    const tradeNetInvested = tradeTotals[0]?.tradeNetInvested || 0;
    const totalInvestments = manualInvestments + tradeNetInvested;
    const totalSavings = totalIncome - totalExpense;

    res.status(200).json({
      monthlyIncome: totalIncome,
      monthlyExpenses: totalExpense,
      totalSavings,
      totalInvestments,
      netWorth: totalSavings + totalInvestments,
    });
  } catch (err) {
    next(err);
  }
};

const getWealthGrowth = async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user._id);
    const months = 6;
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [openingIncome, openingExpense, incomeData, expenseData, investments, openingTrade, monthlyTrade] = await Promise.all([
      Income.aggregate([
        { $match: { userId, date: { $lt: start } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Expense.aggregate([
        { $match: { userId, date: { $lt: start } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Income.aggregate([
        { $match: { userId, date: { $gte: start, $lte: end } } },
        {
          $group: {
            _id: { year: { $year: "$date" }, month: { $month: "$date" } },
            income: { $sum: "$amount" },
          },
        },
      ]),
      Expense.aggregate([
        { $match: { userId, date: { $gte: start, $lte: end } } },
        {
          $group: {
            _id: { year: { $year: "$date" }, month: { $month: "$date" } },
            expense: { $sum: "$amount" },
          },
        },
      ]),
      Investment.find({ userId, dateOfInvestment: { $lte: end } })
        .select("dateOfInvestment currentValue amountInvested"),
      TradeOrder.aggregate([
        { $match: { userId, executedAt: { $lt: start } } },
        ...tradeCashFlowProjection,
        { $group: { _id: null, tradeNetInvested: { $sum: "$tradeCashFlow" } } },
      ]),
      TradeOrder.aggregate([
        { $match: { userId, executedAt: { $gte: start, $lte: end } } },
        ...tradeCashFlowProjection,
        {
          $group: {
            _id: { year: { $year: "$executedAt" }, month: { $month: "$executedAt" } },
            tradeNetInvested: { $sum: "$tradeCashFlow" },
          },
        },
      ]),
    ]);

    const byKey = new Map();
    [...incomeData, ...expenseData].forEach((item) => {
      const key = `${item._id.year}-${item._id.month}`;
      byKey.set(key, { ...(byKey.get(key) || {}), ...item });
    });

    const tradeByKey = new Map();
    monthlyTrade.forEach((item) => {
      const key = `${item._id.year}-${item._id.month}`;
      tradeByKey.set(key, item.tradeNetInvested || 0);
    });

    let savingsBalance = (openingIncome[0]?.total || 0) - (openingExpense[0]?.total || 0);
    let tradeInvestedBalance = openingTrade[0]?.tradeNetInvested || 0;

    const wealthGrowth = Array.from({ length: months }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (months - 1) + index, 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
      const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
      const bucket = byKey.get(key) || {};
      const income = bucket.income || 0;
      const expense = bucket.expense || 0;
      const monthlySavings = income - expense;
      savingsBalance += monthlySavings;
      const monthlyTradeNetInvested = tradeByKey.get(key) || 0;
      tradeInvestedBalance += monthlyTradeNetInvested;
      const investmentValue = investments.reduce(
        (sum, investment) => (
          new Date(investment.dateOfInvestment) <= monthEnd
            ? sum + (investment.currentValue || 0)
            : sum
        ),
        0
      );
      const combinedInvestmentValue = investmentValue + tradeInvestedBalance;

      return {
        monthKey: key,
        month: date.toLocaleDateString("en-US", { month: "short" }),
        income,
        expenses: expense,
        monthlySavings,
        savings: savingsBalance,
        investments: combinedInvestmentValue,
        tradeNetInvested: monthlyTradeNetInvested,
        netWorth: savingsBalance + combinedInvestmentValue,
      };
    });

    res.status(200).json({ wealthGrowth });
  } catch (err) {
    next(err);
  }
};

const getRecentTransactions = async (req, res, next) => {
  try {
    const [incomes, expenses] = await Promise.all([
      Income.find({ userId: req.user._id }).sort({ date: -1 }).limit(5),
      Expense.find({ userId: req.user._id }).sort({ date: -1 }).limit(5),
    ]);

    const transactions = [
      ...incomes.map((item) => ({
        ...item.toObject(),
        type: "income",
        description: item.source,
        category: item.source,
      })),
      ...expenses.map((item) => ({
        ...item.toObject(),
        type: "expense",
        description: item.title,
      })),
    ]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);

    res.status(200).json({ transactions });
  } catch (err) {
    next(err);
  }
};

const getHabitOverview = async (req, res, next) => {
  try {
    const habits = await Habit.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(6);
    const today = new Date();

    res.status(200).json({
      habits: habits.map((habit) => {
        const lastCompleted = habit.completedDates?.[habit.completedDates.length - 1];
        return {
          ...habit.toObject(),
          completedToday: lastCompleted
            ? new Date(lastCompleted).toDateString() === today.toDateString()
            : false,
        };
      }),
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getSummary, getWealthGrowth, getRecentTransactions, getHabitOverview };
