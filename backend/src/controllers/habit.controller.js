const Habit = require("../models/habit.model");

const isSameDay = (day1, day2) => new Date(day1).toDateString() === new Date(day2).toDateString();

const isNextDay = (lastDay, today) => {
  const oneDay = 24 * 60 * 60 * 1000;
  const difference =
    new Date(today).setHours(0, 0, 0, 0) - new Date(lastDay).setHours(0, 0, 0, 0);
  return difference === oneDay;
};

const toHabitResponse = (habit) => {
  const today = new Date();
  const lastCompleted = habit.completedDates?.[habit.completedDates.length - 1];

  return {
    ...habit.toObject(),
    description: habit.notes || "",
    completedToday: lastCompleted ? isSameDay(lastCompleted, today) : false,
    totalCompletions: habit.completedDates?.length || 0,
  };
};

const addHabit = async (req, res, next) => {
  try {
    const habit = await Habit.create({
      userId: req.user._id,
      name: req.body.name,
      type: req.body.type || "custom",
      frequency: req.body.frequency,
      streak: 0,
      completedDates: [],
      notes: req.body.description || req.body.notes || "",
    });

    res.status(201).json(toHabitResponse(habit));
  } catch (err) {
    next(err);
  }
};

const getHabit = async (req, res, next) => {
  try {
    const habits = await Habit.find({ userId: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json({ habits: habits.map(toHabitResponse) });
  } catch (err) {
    next(err);
  }
};

const editHabit = async (req, res, next) => {
  try {
    const habit = await Habit.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      {
        name: req.body.name,
        type: req.body.type || "custom",
        frequency: req.body.frequency,
        notes: req.body.description || req.body.notes || "",
      },
      { new: true, runValidators: true }
    );

    if (!habit) {
      return res.status(404).json({ message: "Habit not found" });
    }

    res.status(200).json(toHabitResponse(habit));
  } catch (err) {
    next(err);
  }
};

const completeHabit = async (req, res, next) => {
  try {
    const habit = await Habit.findOne({ _id: req.params.id, userId: req.user._id });

    if (!habit) {
      return res.status(404).json({ message: "Habit not found" });
    }

    const today = new Date();
    const lastCompleted = habit.completedDates.length > 0
      ? habit.completedDates[habit.completedDates.length - 1]
      : null;

    if (lastCompleted && isSameDay(lastCompleted, today)) {
      return res.status(400).json({ message: "Already completed today" });
    }

    habit.streak = lastCompleted && isNextDay(lastCompleted, today) ? habit.streak + 1 : 1;
    habit.lastCompleted = today;
    habit.completedDates.push(today);

    await habit.save();

    res.status(200).json({
      message: "Habit marked complete",
      habit: toHabitResponse(habit),
    });
  } catch (err) {
    next(err);
  }
};

const deleteHabit = async (req, res, next) => {
  try {
    const deleted = await Habit.findOneAndDelete({ _id: req.params.id, userId: req.user._id });

    if (!deleted) {
      return res.status(404).json({ message: "Habit not found" });
    }

    return res.json({ message: "Habit deleted successfully" });
  } catch (err) {
    next(err);
  }
};

const getHabitStats = async (req, res, next) => {
  try {
    const habits = await Habit.find({ userId: req.user._id });
    const mapped = habits.map(toHabitResponse);
    const completedToday = mapped.filter((habit) => habit.completedToday).length;

    return res.status(200).json({
      totalHabits: mapped.length,
      completedToday,
      completionRate: mapped.length ? Math.round((completedToday / mapped.length) * 100) : 0,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { addHabit, getHabit, editHabit, completeHabit, deleteHabit, getHabitStats };
