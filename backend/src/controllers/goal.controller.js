const Goal = require("../models/goal.model");

const normalizeStatus = (goal) => (goal.savedAmount >= goal.targetAmount ? "completed" : "active");

const toGoalResponse = (goal) => ({
  ...goal.toObject(),
  name: goal.title,
  currentAmount: goal.savedAmount,
  targetDate: goal.deadline,
  progress: goal.targetAmount ? Number(((goal.savedAmount / goal.targetAmount) * 100).toFixed(2)) : 0,
  status: normalizeStatus(goal),
});

const createGoal = async (req, res, next) => {
  try {
    const goal = await Goal.create({
      userId: req.user._id,
      title: req.body.title,
      category: req.body.category,
      targetAmount: req.body.targetAmount,
      savedAmount: req.body.savedAmount || 0,
      deadline: req.body.deadline || null,
      notes: req.body.notes || "",
      status: req.body.savedAmount >= req.body.targetAmount ? "completed" : "active",
    });

    return res.status(201).json({ message: "Goal created successfully", goal: toGoalResponse(goal) });
  } catch (err) {
    next(err);
  }
};

const getGoal = async (req, res, next) => {
  try {
    const goals = await Goal.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ goals: goals.map(toGoalResponse) });
  } catch (err) {
    next(err);
  }
};

const updateGoal = async (req, res, next) => {
  try {
    const goal = await Goal.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      {
        title: req.body.title,
        category: req.body.category,
        targetAmount: req.body.targetAmount,
        savedAmount: Math.min(req.body.savedAmount, req.body.targetAmount),
        deadline: req.body.deadline || null,
        notes: req.body.notes || "",
        status: req.body.savedAmount >= req.body.targetAmount ? "completed" : "active",
      },
      { new: true, runValidators: true }
    );

    if (!goal) {
      return res.status(404).json({ message: "Goal not found" });
    }

    res.status(200).json({ message: "Goal updated", goal: toGoalResponse(goal) });
  } catch (err) {
    next(err);
  }
};

const contributeGoal = async (req, res, next) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, userId: req.user._id });

    if (!goal) {
      return res.status(404).json({ message: "Goal not found" });
    }

    goal.savedAmount = Math.min(goal.savedAmount + Number(req.body.amount), goal.targetAmount);
    goal.status = normalizeStatus(goal);
    await goal.save();

    res.status(200).json({
      message: "Contribution added successfully",
      goal: toGoalResponse(goal),
    });
  } catch (err) {
    next(err);
  }
};

const deleteGoal = async (req, res, next) => {
  try {
    const deleted = await Goal.findOneAndDelete({ _id: req.params.id, userId: req.user._id });

    if (!deleted) {
      return res.status(404).json({ message: "Goal not found" });
    }

    return res.status(200).json({ message: "Goal deleted successfully" });
  } catch (err) {
    next(err);
  }
};

module.exports = { createGoal, getGoal, updateGoal, contributeGoal, deleteGoal };
