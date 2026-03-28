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

const validateBankAccount = (req, res, next) => {
  const institutionName = (req.body.institutionName || "").trim();
  const accountName = (req.body.accountName || "").trim();
  const accountType = (req.body.accountType || "checking").trim();
  const balance = Number(req.body.balance ?? 0);
  const supportedTypes = ["checking", "savings", "credit", "brokerage", "wallet", "other"];
  const provider = String(req.body.provider || "manual").trim().toLowerCase();
  const supportedProviders = ["manual", "plaid"];

  if (!institutionName) {
    return res.status(400).json({ message: "Institution name is required" });
  }

  if (!accountName) {
    return res.status(400).json({ message: "Account name is required" });
  }

  if (!supportedTypes.includes(accountType)) {
    return res.status(400).json({ message: "Invalid account type" });
  }

  if (Number.isNaN(balance)) {
    return res.status(400).json({ message: "Invalid balance" });
  }

  if (!supportedProviders.includes(provider)) {
    return res.status(400).json({ message: "Invalid provider" });
  }

  req.body.institutionName = institutionName;
  req.body.accountName = accountName;
  req.body.accountType = accountType;
  req.body.balance = balance;
  req.body.provider = provider;
  req.body.mask = String(req.body.mask || "").trim().slice(-4);
  next();
};

const validateTradeOrder = (req, res, next) => {
  const symbol = String(req.body.symbol || "").trim().toUpperCase();
  const assetName = String(req.body.assetName || "").trim();
  const side = String(req.body.side || "buy").trim().toLowerCase();
  const assetType = String(req.body.assetType || "stock").trim().toLowerCase();
  const quantity = Number(req.body.quantity);
  const price = Number(req.body.price);
  const fees = Number(req.body.fees ?? 0);
  const validSides = ["buy", "sell"];
  const validAssetTypes = ["stock", "etf", "crypto", "mutual_fund", "bond", "other"];
  const timeInForce = String(req.body.timeInForce || req.body.time_in_force || "day").trim().toLowerCase();
  const validTimeInForce = ["day", "gtc", "opg", "cls", "ioc", "fok"];
  const executeLive = Boolean(req.body.executeLive);

  if (!symbol) {
    return res.status(400).json({ message: "Symbol is required" });
  }

  if (!assetName) {
    return res.status(400).json({ message: "Asset name is required" });
  }

  if (!validSides.includes(side)) {
    return res.status(400).json({ message: "Invalid trade side" });
  }

  if (!validAssetTypes.includes(assetType)) {
    return res.status(400).json({ message: "Invalid asset type" });
  }

  if (Number.isNaN(quantity) || quantity <= 0) {
    return res.status(400).json({ message: "Quantity must be a positive number" });
  }

  if (Number.isNaN(price) || price <= 0) {
    return res.status(400).json({ message: "Price must be a positive number" });
  }

  if (Number.isNaN(fees) || fees < 0) {
    return res.status(400).json({ message: "Fees cannot be negative" });
  }

  if (!validTimeInForce.includes(timeInForce)) {
    return res.status(400).json({ message: "Invalid time in force" });
  }

  if (req.body.executedAt && Number.isNaN(Date.parse(req.body.executedAt))) {
    return res.status(400).json({ message: "Invalid trade date" });
  }

  req.body.symbol = symbol;
  req.body.assetName = assetName;
  req.body.side = side;
  req.body.assetType = assetType;
  req.body.quantity = quantity;
  req.body.price = price;
  req.body.fees = fees;
  req.body.timeInForce = timeInForce;
  req.body.executeLive = executeLive;
  next();
};

module.exports = {
  validateIncome,
  validateExpense,
  validateInvestment,
  validateHabit,
  validateGoal,
  validateGoalContribution,
  validateBankAccount,
  validateTradeOrder,
};
