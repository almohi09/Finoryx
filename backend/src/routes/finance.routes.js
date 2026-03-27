const express = require("express");
const { authUser } = require("../middlewares/auth.middleware");
const { validateIncome, validateExpense } = require("../middlewares/validate.middleware");
const {
  addIncome,
  getIncomes,
  updateIncome,
  addExpense,
  getExpenses,
  updateExpense,
  deleteTransaction,
  getSummary,
  getCategoryBreakdown,
} = require("../controllers/finance.controller");

const financeRouter = express.Router();

financeRouter.get("/income", authUser, getIncomes);
financeRouter.post("/income", authUser, validateIncome, addIncome);
financeRouter.put("/income/:id", authUser, validateIncome, updateIncome);
financeRouter.delete(
  "/income/:id",
  authUser,
  (req, res, next) => {
    req.params.type = "income";
    next();
  },
  deleteTransaction
);

financeRouter.get("/expense", authUser, getExpenses);
financeRouter.post("/expense", authUser, validateExpense, addExpense);
financeRouter.put("/expense/:id", authUser, validateExpense, updateExpense);
financeRouter.delete(
  "/expense/:id",
  authUser,
  (req, res, next) => {
    req.params.type = "expense";
    next();
  },
  deleteTransaction
);

financeRouter.get("/summary", authUser, getSummary);
financeRouter.get("/category-breakdown", authUser, getCategoryBreakdown);

module.exports = financeRouter;
