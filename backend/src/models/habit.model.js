const mongoose = require('mongoose');

const habitSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  name: {
    type: String,
    required: [true, "habit name is required"],
    trim: true
  },
  type: {
    type: String,
    default: "custom",
    trim: true
  },
  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    default: 'daily'
  },
  streak: {
    type: Number,
    default: 0
  },
  lastCompleted: {
    type: Date
  },
  completedDates: [{
    type: Date
  }],
  startDate: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    default:"",
    trim: true
  }
}, { timestamps: true });

module.exports = mongoose.model("Habit", habitSchema);
