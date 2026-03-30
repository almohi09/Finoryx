const Habit = require("../models/habit.model");

const isSameDay = (day1, day2) => new Date(day1).toDateString() === new Date(day2).toDateString();

const getPeriodStart = (date, frequency = "daily") => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);

  if (frequency === "weekly") {
    const day = value.getDay();
    const mondayOffset = (day + 6) % 7;
    value.setDate(value.getDate() - mondayOffset);
    return value;
  }

  if (frequency === "monthly") {
    value.setDate(1);
    return value;
  }

  return value;
};

const addPeriod = (date, frequency = "daily", amount = 1) => {
  const next = new Date(date);
  if (frequency === "weekly") {
    next.setDate(next.getDate() + (7 * amount));
    return next;
  }
  if (frequency === "monthly") {
    next.setMonth(next.getMonth() + amount);
    return next;
  }
  next.setDate(next.getDate() + amount);
  return next;
};

const isSamePeriod = (lastDay, today, frequency = "daily") => {
  const lastStart = getPeriodStart(lastDay, frequency).getTime();
  const todayStart = getPeriodStart(today, frequency).getTime();
  return lastStart === todayStart;
};

const isNextPeriod = (lastDay, today, frequency = "daily") => {
  const lastStart = getPeriodStart(lastDay, frequency);
  const todayStart = getPeriodStart(today, frequency).getTime();
  return addPeriod(lastStart, frequency, 1).getTime() === todayStart;
};

const shouldResetStreak = (lastDay, today, frequency = "daily") => {
  if (!lastDay) return false;
  const lastStart = getPeriodStart(lastDay, frequency);
  const expectedCurrentOrPrevious = addPeriod(lastStart, frequency, 1).getTime();
  const todayStart = getPeriodStart(today, frequency).getTime();
  return expectedCurrentOrPrevious < todayStart;
};

const toHabitResponse = (habit) => {
  const today = new Date();
  const lastCompleted = habit.completedDates?.[habit.completedDates.length - 1];
  const effectiveStreak = shouldResetStreak(lastCompleted, today, habit.frequency)
    ? 0
    : (habit.streak || 0);

  return {
    ...habit.toObject(),
    streak: effectiveStreak,
    description: habit.notes || "",
    completedToday: lastCompleted ? isSamePeriod(lastCompleted, today, habit.frequency) : false,
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

    if (lastCompleted && isSamePeriod(lastCompleted, today, habit.frequency)) {
      return res.status(400).json({ message: `Already completed for this ${habit.frequency} period` });
    }

    habit.streak = lastCompleted && isNextPeriod(lastCompleted, today, habit.frequency) ? habit.streak + 1 : 1;
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
