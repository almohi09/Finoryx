const mongoose = require("mongoose");
const Income = require("../models/income.model");
const Expense = require("../models/expense.model");

const toIncomeResponse = (income) => ({
  ...income.toObject(),
  description: income.source,
});

const toExpenseResponse = (expense) => ({
  ...expense.toObject(),
  description: expense.title,
});

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
};
