const mongoose = require('mongoose');

const investmentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  type: {
    type: String,
    enum: ['stocks', 'mutual_funds', 'fd', 'real_estate', 'gold', 'crypto', 'ppf', 'other'],
    default: 'other'
  },
  name: {
    type: String,
    required: [true, "investment name is required"],
    trim: true
  },
  amountInvested: {
    type: Number,
    required: true,
    min: 1
  },
  currentValue: {
    type: Number,
    default: 0,
    min: 0
  },
  dateOfInvestment: {
    type: Date,
    default:Date.now,
    required: true
  },
  expectedReturnRate: {
    type: Number,
    min: 0,
    max: 100
  },
  notes: {
    type: String,
    default:"",
    trim: true
  }
}, { timestamps: true });

module.exports = mongoose.model("Investment", investmentSchema);
