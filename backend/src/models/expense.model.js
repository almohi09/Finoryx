const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  title: {
    type: String,
    required: [true, "expense title is required"],
    trim: true
  },
  category: {
    type: String,
    enum: ['food', 'transport', 'rent', 'utilities', 'health', 'entertainment', 'shopping', 'education', 'investment', 'other'],
    default: 'other'
  },
  amount: {
    type: Number,
    required: [true, "expense amount is required"],
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

module.exports = mongoose.model("Expense", expenseSchema);
