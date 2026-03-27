const express = require("express");
const { authUser } = require("../middlewares/auth.middleware");
const { validateHabit } = require("../middlewares/validate.middleware");
const {
  addHabit,
  getHabit,
  editHabit,
  completeHabit,
  deleteHabit,
  getHabitStats,
} = require("../controllers/habit.controller");

const habitRouter = express.Router();

habitRouter.post("/", authUser, validateHabit, addHabit);
habitRouter.get("/", authUser, getHabit);
habitRouter.get("/stats", authUser, getHabitStats);
habitRouter.put("/:id", authUser, validateHabit, editHabit);
habitRouter.patch("/:id", authUser, validateHabit, editHabit);
habitRouter.post("/:id/complete", authUser, completeHabit);
habitRouter.delete("/:id", authUser, deleteHabit);

module.exports = habitRouter;
