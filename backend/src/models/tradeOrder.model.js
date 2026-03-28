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
    broker: {
      type: String,
      enum: ["manual", "alpaca"],
      default: "manual",
      trim: true,
    },
    brokerOrderId: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    status: {
      type: String,
      default: "filled",
      trim: true,
    },
    timeInForce: {
      type: String,
      default: "day",
      trim: true,
    },
    liveExecution: {
      type: Boolean,
      default: false,
    },
    filledQty: {
      type: Number,
      default: 0,
      min: 0,
    },
    filledAvgPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    rawBrokerResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
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
