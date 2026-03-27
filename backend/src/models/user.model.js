const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, "username is required"],
    unique: true,
    trim: true
  },

  role:{
    type:String,
    enum:["user","admin"],
    default:"user"
  },

  email: {
    type: String,
    required: [true, "email is required"],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, "password is required"],
    minlength: 6
  }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);