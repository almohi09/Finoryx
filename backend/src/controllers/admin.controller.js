const User = require("../models/user.model");
const Investment = require("../models/investment.model");
const Income = require("../models/income.model");
const Habit = require("../models/habit.model");
const Goal = require("../models/goal.model");
const Expense = require("../models/expense.model");
const Feedback = require("../models/feedback.model");

const buildAdminUser = (
  user,
  habitsByUser = {},
  expensesByUser = {},
  investedByUser = {},
  investmentValueByUser = {},
  investmentCountByUser = {}
) => ({
  ...user.toObject(),
  name: user.username,
  isActive: true,
  habitCount: habitsByUser[String(user._id)] || 0,
  totalExpenses: expensesByUser[String(user._id)] || 0,
  totalInvested: investedByUser[String(user._id)] || 0,
  currentInvestmentValue: investmentValueByUser[String(user._id)] || 0,
  investmentCount: investmentCountByUser[String(user._id)] || 0,
});

const getUsers = async (req, res, next) => {
  try {
    const users = await User.find({ role: "user" }).select("-password").sort({ createdAt: -1 });

    const userIds = users.map((user) => user._id);
    const [habitCounts, expenseTotals, investmentTotals] = await Promise.all([
      Habit.aggregate([
        { $match: { userId: { $in: userIds } } },
        { $group: { _id: "$userId", count: { $sum: 1 } } },
      ]),
      Expense.aggregate([
        { $match: { userId: { $in: userIds } } },
        { $group: { _id: "$userId", total: { $sum: "$amount" } } },
      ]),
      Investment.aggregate([
        { $match: { userId: { $in: userIds } } },
        {
          $group: {
            _id: "$userId",
            totalInvested: { $sum: "$amountInvested" },
            currentValue: { $sum: "$currentValue" },
            investmentCount: { $sum: 1 },
          },
        },
      ]),
    ]);

    const habitsByUser = Object.fromEntries(habitCounts.map((item) => [String(item._id), item.count]));
    const expensesByUser = Object.fromEntries(expenseTotals.map((item) => [String(item._id), item.total]));
    const investedByUser = Object.fromEntries(investmentTotals.map((item) => [String(item._id), item.totalInvested]));
    const investmentValueByUser = Object.fromEntries(investmentTotals.map((item) => [String(item._id), item.currentValue]));
    const investmentCountByUser = Object.fromEntries(investmentTotals.map((item) => [String(item._id), item.investmentCount]));

    res.status(200).json({
      users: users.map((user) => buildAdminUser(
        user,
        habitsByUser,
        expensesByUser,
        investedByUser,
        investmentValueByUser,
        investmentCountByUser
      )),
    });
  } catch (err) {
    next(err);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const [habitCount, expenseTotal, investments, investmentSummary] = await Promise.all([
      Habit.countDocuments({ userId: user._id }),
      Expense.aggregate([
        { $match: { userId: user._id } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Investment.find({ userId: user._id })
        .sort({ dateOfInvestment: -1 })
        .select("name type amountInvested currentValue dateOfInvestment notes"),
      Investment.aggregate([
        { $match: { userId: user._id } },
        {
          $group: {
            _id: "$type",
            totalInvested: { $sum: "$amountInvested" },
            currentValue: { $sum: "$currentValue" },
            count: { $sum: 1 },
          },
        },
        { $sort: { currentValue: -1 } },
      ]),
    ]);

    res.status(200).json({
      user: {
        ...buildAdminUser(
          user,
          { [String(user._id)]: habitCount },
          { [String(user._id)]: expenseTotal[0]?.total || 0 },
          { [String(user._id)]: investmentSummary.reduce((sum, item) => sum + item.totalInvested, 0) },
          { [String(user._id)]: investmentSummary.reduce((sum, item) => sum + item.currentValue, 0) },
          { [String(user._id)]: investments.length }
        ),
        investments: investments.map((investment) => ({
          ...investment.toObject(),
          amount: investment.amountInvested,
          purchaseDate: investment.dateOfInvestment,
        })),
        investmentBreakdown: investmentSummary.map((item) => ({
          type: item._id,
          totalInvested: item.totalInvested,
          currentValue: item.currentValue,
          count: item.count,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const updates = {};
    if (req.body.name || req.body.username) {
      updates.username = (req.body.name || req.body.username).trim();
    }
    if (req.body.email) {
      updates.email = req.body.email.toLowerCase().trim();
    }
    if (req.body.role) {
      updates.role = req.body.role;
    }

    const user = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "User updated successfully",
      user: buildAdminUser(user),
    });
  } catch (err) {
    next(err);
  }
};

const getStats = async (req, res, next) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(todayStart.getDate() + 1);

    const [
      totalUsers,
      totalExpenses,
      totalIncomes,
      totalGoals,
      totalHabits,
      totalInvestments,
      newUsersThisMonth,
      habitsCompletedToday,
    ] =
      await Promise.all([
        User.countDocuments({ role: "user" }),
        Expense.countDocuments(),
        Income.countDocuments(),
        Goal.countDocuments(),
        Habit.countDocuments(),
        Investment.countDocuments(),
        User.countDocuments({ role: "user", createdAt: { $gte: monthStart } }),
        Habit.countDocuments({
          completedDates: {
            $elemMatch: { $gte: todayStart, $lt: tomorrowStart },
          },
        }),
      ]);

    const [savingsTracked] = await Income.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]);

    res.status(200).json({
      totalUsers,
      activeUsers: totalUsers,
      totalTransactions: totalExpenses + totalIncomes,
      avgHabitCompletion: totalHabits ? `${Math.round((habitsCompletedToday / totalHabits) * 100)}%` : "0%",
      totalSavingsTracked: savingsTracked?.total || 0,
      newUsersThisMonth,
      raw: {
        totalExpenses,
        totalIncomes,
        totalInvestments,
        totalGoals,
        totalHabits,
        habitsCompletedToday,
      },
    });
  } catch (err) {
    next(err);
  }
};

const getAnalytics = async (req, res, next) => {
  try {
    const [incomeTotal, expenseTotal, investmentTotal] = await Promise.all([
      Income.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]),
      Expense.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]),
      Investment.aggregate([{ $group: { _id: null, total: { $sum: "$currentValue" } } }]),
    ]);

    res.status(200).json({
      analytics: {
        totalIncome: incomeTotal[0]?.total || 0,
        totalExpense: expenseTotal[0]?.total || 0,
        totalInvestmentValue: investmentTotal[0]?.total || 0,
      },
    });
  } catch (err) {
    next(err);
  }
};

const getFeedback = async (req, res) => {
  const feedback = await Feedback.find()
    .populate("userId", "username email")
    .sort({ createdAt: -1 });

  return res.status(200).json({
    feedback: feedback.map((item) => ({
      ...item.toObject(),
      user: item.userId?.username || "User",
      email: item.userId?.email || "",
      date: item.createdAt,
    })),
  });
};

const respondFeedback = async (req, res) => {
  const feedback = await Feedback.findByIdAndUpdate(
    req.params.id,
    {
      status: req.body.status || "reviewed",
      adminResponse: (req.body.adminResponse || "").trim(),
      respondedAt: new Date(),
    },
    { new: true }
  ).populate("userId", "username email");

  if (!feedback) {
    return res.status(404).json({ message: "Feedback not found" });
  }

  return res.status(200).json({
    message: "Feedback response recorded",
    feedback: {
      ...feedback.toObject(),
      user: feedback.userId?.username || "User",
      email: feedback.userId?.email || "",
      date: feedback.createdAt,
    },
  });
};

const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role === "admin") {
      return res.status(403).json({ message: "Cannot delete admin" });
    }

    await Promise.all([
      Expense.deleteMany({ userId: user._id }),
      Income.deleteMany({ userId: user._id }),
      Habit.deleteMany({ userId: user._id }),
      Goal.deleteMany({ userId: user._id }),
      Investment.deleteMany({ userId: user._id }),
      user.deleteOne(),
    ]);

    res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getUsers,
  getUserById,
  updateUser,
  getStats,
  getAnalytics,
  getFeedback,
  respondFeedback,
  deleteUser,
};
