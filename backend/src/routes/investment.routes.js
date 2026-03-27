const express = require("express");
const { authUser } = require("../middlewares/auth.middleware");
const { validateInvestment } = require("../middlewares/validate.middleware");
const {
  addInvestment,
  getInvestments,
  updateInvestment,
  deleteInvestment,
} = require("../controllers/investment.controller");

const investmentRouter = express.Router();

investmentRouter.post("/", authUser, validateInvestment, addInvestment);
investmentRouter.get("/", authUser, getInvestments);
investmentRouter.put("/:id", authUser, validateInvestment, updateInvestment);
investmentRouter.patch("/:id", authUser, validateInvestment, updateInvestment);
investmentRouter.delete("/:id", authUser, deleteInvestment);

module.exports = investmentRouter;
