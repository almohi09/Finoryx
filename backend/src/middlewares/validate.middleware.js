const validateIncome = (req, res, next) => {
  const source = (req.body.source || req.body.description || "").trim();
  const amount = Number(req.body.amount);

  if (!source) {
    return res.status(400).json({ message: "Source is required" });
  }

  if (Number.isNaN(amount) || amount <= 0) {
    return res.status(400).json({ message: "Amount must be a positive number" });
  }

  if (req.body.date && Number.isNaN(Date.parse(req.body.date))) {
    return res.status(400).json({ message: "Invalid date" });
  }

  req.body.source = source;
  req.body.description = source;
  req.body.amount = amount;
  next();
};

const validateExpense = (req, res, next) => {
  const title = (req.body.title || req.body.description || "").trim();
  const category = (req.body.category || "").trim();
  const amount = Number(req.body.amount);

  if (!title) {
    return res.status(400).json({ message: "Title is required" });
  }

  if (!category) {
    return res.status(400).json({ message: "Category is required" });
  }

  if (Number.isNaN(amount) || amount <= 0) {
    return res.status(400).json({ message: "Amount must be a positive number" });
  }

  req.body.title = title;
  req.body.description = title;
  req.body.category = category;
  req.body.amount = amount;
  next();
};

const validateInvestment = (req, res, next) => {
  const name = (req.body.name || "").trim();
  const amount = Number(req.body.amount ?? req.body.amountInvested);
  const currentValue = Number(req.body.currentValue ?? amount);
  const purchaseDate = req.body.purchaseDate || req.body.dateOfInvestment;

  if (!name) {
    return res.status(400).json({ message: "Name is required" });
  }

  if (Number.isNaN(amount) || amount <= 0) {
    return res.status(400).json({ message: "Invalid investment amount" });
  }

  if (Number.isNaN(currentValue) || currentValue < 0) {
    return res.status(400).json({ message: "Invalid current value" });
  }

  if (purchaseDate && Number.isNaN(Date.parse(purchaseDate))) {
    return res.status(400).json({ message: "Invalid date" });
  }

  req.body.name = name;
  req.body.amount = amount;
  req.body.amountInvested = amount;
  req.body.currentValue = currentValue;
  req.body.purchaseDate = purchaseDate;
  req.body.dateOfInvestment = purchaseDate;
  next();
};

const validateHabit = (req, res, next) => {
  if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH") {
    const name = (req.body.name || "").trim();
    const frequency = req.body.frequency;
    const allowedFrequencies = ["daily", "weekly", "monthly"];

    if (!name) {
      return res.status(400).json({ message: "Habit name is required" });
    }

    if (!allowedFrequencies.includes(frequency)) {
      return res.status(400).json({ message: "Frequency must be daily, weekly, or monthly" });
    }

    req.body.name = name;
  }

  next();
};

const validateGoal = (req, res, next) => {
  const name = (req.body.name || req.body.title || "").trim();
  const category = (req.body.category || "other").trim();
  const targetAmount = Number(req.body.targetAmount);
  const currentAmount = Number(req.body.currentAmount ?? req.body.savedAmount ?? 0);
  const targetDate = req.body.targetDate || req.body.deadline || null;

  if (!name) {
    return res.status(400).json({ message: "Goal name is required" });
  }

  if (Number.isNaN(targetAmount) || targetAmount <= 0) {
    return res.status(400).json({ message: "Invalid target amount" });
  }

  if (Number.isNaN(currentAmount) || currentAmount < 0) {
    return res.status(400).json({ message: "Invalid current amount" });
  }

  if (targetDate && Number.isNaN(Date.parse(targetDate))) {
    return res.status(400).json({ message: "Invalid date" });
  }

  req.body.name = name;
  req.body.title = name;
  req.body.category = category;
  req.body.targetAmount = targetAmount;
  req.body.currentAmount = currentAmount;
  req.body.savedAmount = currentAmount;
  req.body.targetDate = targetDate;
  req.body.deadline = targetDate;
  next();
};

const validateGoalContribution = (req, res, next) => {
  const amount = Number(req.body.amount);

  if (Number.isNaN(amount) || amount <= 0) {
    return res.status(400).json({ message: "Invalid amount" });
  }

  req.body.amount = amount;
  next();
};

module.exports = {
  validateIncome,
  validateExpense,
  validateInvestment,
  validateHabit,
  validateGoal,
  validateGoalContribution,
};
