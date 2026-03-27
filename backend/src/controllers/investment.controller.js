const mongoose = require("mongoose");
const Investment = require("../models/investment.model");

const toInvestmentResponse = (investment) => ({
  ...investment.toObject(),
  amount: investment.amountInvested,
  purchaseDate: investment.dateOfInvestment,
});

const addInvestment = async (req, res, next) => {
  try {
    const investment = await Investment.create({
      userId: req.user._id,
      name: req.body.name,
      type: req.body.type,
      amountInvested: req.body.amountInvested,
      currentValue: req.body.currentValue,
      dateOfInvestment: req.body.dateOfInvestment || new Date(),
      notes: req.body.notes || "",
    });

    res.status(201).json(toInvestmentResponse(investment));
  } catch (err) {
    next(err);
  }
};

const getInvestments = async (req, res, next) => {
  try {
    const investments = await Investment.find({ userId: req.user._id }).sort({ dateOfInvestment: -1 });
    res.json({ investments: investments.map(toInvestmentResponse) });
  } catch (err) {
    next(err);
  }
};

const updateInvestment = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: "Invalid investment ID" });
    }

    const investment = await Investment.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      {
        name: req.body.name,
        type: req.body.type,
        amountInvested: req.body.amountInvested,
        currentValue: req.body.currentValue,
        dateOfInvestment: req.body.dateOfInvestment || new Date(),
        notes: req.body.notes || "",
      },
      { new: true, runValidators: true }
    );

    if (!investment) {
      return res.status(404).json({ message: "Investment not found" });
    }

    res.json(toInvestmentResponse(investment));
  } catch (err) {
    next(err);
  }
};

const deleteInvestment = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: "Invalid investment ID" });
    }

    const deleted = await Investment.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!deleted) {
      return res.status(404).json({ message: "Investment not found" });
    }

    res.status(200).json({ message: "Deleted successfully" });
  } catch (err) {
    next(err);
  }
};

module.exports = { addInvestment, getInvestments, updateInvestment, deleteInvestment };
