const express = require("express");
const { createGoal, getGoal, updateGoal, contributeGoal, deleteGoal } = require("../controllers/goal.controller");
const { authUser } = require("../middlewares/auth.middleware");
const { validateGoal, validateGoalContribution } = require("../middlewares/validate.middleware");

const goalRouter = express.Router();

goalRouter.post("/", authUser, validateGoal, createGoal);
goalRouter.get("/", authUser, getGoal);
goalRouter.put("/:id", authUser, validateGoal, updateGoal);
goalRouter.patch("/:id", authUser, validateGoal, updateGoal);
goalRouter.post("/:id/contribute", authUser, validateGoalContribution, contributeGoal);
goalRouter.delete("/:id", authUser, deleteGoal);

module.exports = goalRouter;
