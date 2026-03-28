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
      enum: ["manual", "plaid"],
      default: "manual",
      trim: true,
    },
    providerItemId: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    providerAccountId: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    providerAccessTokenEnc: {
      type: String,
      default: "",
    },
    providerSyncCursor: {
      type: String,
      default: "",
      trim: true,
    },
    providerMeta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    lastSyncedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

bankAccountSchema.index(
  { userId: 1, provider: 1, providerAccountId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      provider: { $eq: "plaid" },
      providerAccountId: { $type: "string", $ne: "" },
    },
  }
);

module.exports = mongoose.model("BankAccount", bankAccountSchema);
