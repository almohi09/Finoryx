const express = require("express");
const { authUser } = require("../middlewares/auth.middleware");
const { validateIncome, validateExpense, validateBankAccount } = require("../middlewares/validate.middleware");
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
  getBankAccounts,
  addBankAccount,
  createPlaidLinkToken,
  exchangePlaidPublicToken,
  searchBankInstitutions,
  syncBankAccount,
  getBankTransactions,
  getAdvisorInsights,
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
financeRouter.post("/bank/link-token", authUser, createPlaidLinkToken);
financeRouter.post("/bank/exchange-public-token", authUser, exchangePlaidPublicToken);
financeRouter.get("/bank/institutions/search", authUser, searchBankInstitutions);
financeRouter.get("/bank-accounts", authUser, getBankAccounts);
financeRouter.post("/bank-accounts", authUser, validateBankAccount, addBankAccount);
financeRouter.post("/bank-accounts/:id/sync", authUser, syncBankAccount);
financeRouter.get("/bank-transactions", authUser, getBankTransactions);
financeRouter.get("/advisor", authUser, getAdvisorInsights);

module.exports = financeRouter;
