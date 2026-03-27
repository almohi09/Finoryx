const express = require("express");
const { authUser } = require("../middlewares/auth.middleware");
const {
  getSummary,
  getWealthGrowth,
  getRecentTransactions,
  getHabitOverview,
} = require("../controllers/dashboard.controller");

const dashboardRouter = express.Router();

dashboardRouter.get("/", authUser, getSummary);
dashboardRouter.get("/summary", authUser, getSummary);
dashboardRouter.get("/wealth-growth", authUser, getWealthGrowth);
dashboardRouter.get("/recent-transactions", authUser, getRecentTransactions);
dashboardRouter.get("/habit-overview", authUser, getHabitOverview);

module.exports = dashboardRouter;
