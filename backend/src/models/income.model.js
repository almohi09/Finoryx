const mongoose = require('mongoose');

const incomeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  source: {
    type: String,
    default: 'other',
    trim: true
  },
  amount: {
    type: Number,
    required: [true, "income amount is required"],
    min: 1
  },
  date: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    default:"",
    trim: true
  }
}, { timestamps: true });

module.exports = mongoose.model("Income", incomeSchema);