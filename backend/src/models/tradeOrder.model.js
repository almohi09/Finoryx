const mongoose = require("mongoose");

const tradeOrderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    symbol: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    assetName: {
      type: String,
      required: true,
      trim: true,
    },
    assetType: {
      type: String,
      enum: ["stock", "etf", "crypto", "mutual_fund", "bond", "other"],
      default: "stock",
    },
    side: {
      type: String,
      enum: ["buy", "sell"],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    fees: {
      type: Number,
      default: 0,
      min: 0,
    },
    platform: {
      type: String,
      default: "Paper Trading",
      trim: true,
    },
    executedAt: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TradeOrder", tradeOrderSchema);
