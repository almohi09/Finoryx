const express = require("express");
const { authUser } = require("../middlewares/auth.middleware");
const { validateInvestment, validateTradeOrder } = require("../middlewares/validate.middleware");
const {
  addInvestment,
  getInvestments,
  updateInvestment,
  deleteInvestment,
  getTradeOrders,
  addTradeOrder,
  getTradeSummary,
} = require("../controllers/investment.controller");

const investmentRouter = express.Router();

investmentRouter.post("/", authUser, validateInvestment, addInvestment);
investmentRouter.get("/", authUser, getInvestments);
investmentRouter.put("/:id", authUser, validateInvestment, updateInvestment);
investmentRouter.patch("/:id", authUser, validateInvestment, updateInvestment);
investmentRouter.delete("/:id", authUser, deleteInvestment);
investmentRouter.get("/trades", authUser, getTradeOrders);
investmentRouter.post("/trades", authUser, validateTradeOrder, addTradeOrder);
investmentRouter.get("/trades/summary", authUser, getTradeSummary);

module.exports = investmentRouter;
