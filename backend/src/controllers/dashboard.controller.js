const mongoose = require("mongoose");
const Income = require("../models/income.model");
const Expense = require("../models/expense.model");
const Investment = require("../models/investment.model");
const Habit = require("../models/habit.model");

const getSummary = async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user._id);

    const [income, expense, investment] = await Promise.all([
      Income.aggregate([{ $match: { userId } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      Expense.aggregate([{ $match: { userId } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      Investment.aggregate([{ $match: { userId } }, { $group: { _id: null, total: { $sum: "$currentValue" } } }]),
    ]);

    const totalIncome = income[0]?.total || 0;
    const totalExpense = expense[0]?.total || 0;
    const totalInvestments = investment[0]?.total || 0;
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

    const [openingIncome, openingExpense, incomeData, expenseData, investments] = await Promise.all([
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
    ]);

    const byKey = new Map();
    [...incomeData, ...expenseData].forEach((item) => {
      const key = `${item._id.year}-${item._id.month}`;
      byKey.set(key, { ...(byKey.get(key) || {}), ...item });
    });

    let savingsBalance = (openingIncome[0]?.total || 0) - (openingExpense[0]?.total || 0);

    const wealthGrowth = Array.from({ length: months }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (months - 1) + index, 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
      const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
      const bucket = byKey.get(key) || {};
      const income = bucket.income || 0;
      const expense = bucket.expense || 0;
      const monthlySavings = income - expense;
      savingsBalance += monthlySavings;
      const investmentValue = investments.reduce(
        (sum, investment) => (
          new Date(investment.dateOfInvestment) <= monthEnd
            ? sum + (investment.currentValue || 0)
            : sum
        ),
        0
      );

      return {
        month: date.toLocaleDateString("en-US", { month: "short" }),
        income,
        expenses: expense,
        monthlySavings,
        savings: savingsBalance,
        investments: investmentValue,
        netWorth: savingsBalance + investmentValue,
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
