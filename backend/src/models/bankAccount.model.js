const mongoose = require("mongoose");

const bankAccountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    institutionName: {
      type: String,
      required: true,
      trim: true,
    },
    accountName: {
      type: String,
      required: true,
      trim: true,
    },
    accountType: {
      type: String,
      enum: ["checking", "savings", "credit", "brokerage", "wallet", "other"],
      default: "checking",
    },
    mask: {
      type: String,
      default: "",
      trim: true,
      maxlength: 4,
    },
    balance: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["connected", "attention", "disconnected"],
      default: "connected",
    },
    provider: {
      type: String,
      default: "manual",
      trim: true,
    },
    lastSyncedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BankAccount", bankAccountSchema);
