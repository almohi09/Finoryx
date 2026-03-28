const mongoose = require("mongoose");

const bankTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    bankAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BankAccount",
      required: true,
      index: true,
    },
    externalId: {
      type: String,
      default: "",
      trim: true,
    },
    source: {
      type: String,
      enum: ["manual", "synced"],
      default: "synced",
    },
    transactionType: {
      type: String,
      enum: ["income", "expense", "transfer", "investment"],
      default: "expense",
    },
    direction: {
      type: String,
      enum: ["credit", "debit"],
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    merchant: {
      type: String,
      default: "",
      trim: true,
    },
    category: {
      type: String,
      default: "other",
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { timestamps: true }
);

bankTransactionSchema.index({ userId: 1, externalId: 1 }, { unique: true, partialFilterExpression: { externalId: { $type: "string", $ne: "" } } });

module.exports = mongoose.model("BankTransaction", bankTransactionSchema);
