const bcrypt = require("bcryptjs");
const User = require("../models/user.model");
const generateToken = require("../utils/generateToken.util");

const buildUserResponse = (user) => ({
  id: user._id,
  _id: user._id,
  name: user.username,
  username: user.username,
  email: user.email,
  role: user.role,
});

const setAuthCookie = (res, token) => {
  res.cookie("token", token, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
};

const registerUser = async (req, res) => {
  const { name, username, email, password } = req.body;
  const normalizedName = (name || username || "").trim();

  try {
    if (!normalizedName || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      username: normalizedName,
      email: email.toLowerCase(),
      password: hashedPassword,
    });

    const token = generateToken(user._id);
    setAuthCookie(res, token);

    return res.status(201).json({
      message: "User registered successfully",
      user: buildUserResponse(user),
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: "Email or password is incorrect" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Email or password is incorrect" });
    }

    const token = generateToken(user._id);
    setAuthCookie(res, token);

    return res.status(200).json({
      message: "User logged in successfully",
      user: buildUserResponse(user),
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const logoutUser = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
    });
    return res.status(200).json({ message: "User logged out successfully" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const getMe = async (req, res) => {
  return res.status(200).json({
    message: "User fetched successfully",
    user: buildUserResponse(req.user),
  });
};

const updateProfile = async (req, res) => {
  try {
    const updates = {};

    if (req.body.name || req.body.username) {
      updates.username = (req.body.name || req.body.username).trim();
    }

    if (req.body.email) {
      updates.email = req.body.email.toLowerCase().trim();
    }

    if (updates.username) {
      const usernameTaken = await User.findOne({
        username: updates.username,
        _id: { $ne: req.user._id },
      });
      if (usernameTaken) {
        return res.status(400).json({ message: "Username already in use" });
      }
    }

    if (updates.email) {
      const emailTaken = await User.findOne({
        email: updates.email,
        _id: { $ne: req.user._id },
      });
      if (emailTaken) {
        return res.status(400).json({ message: "Email already in use" });
      }
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    }).select("-password");

    return res.status(200).json({
      message: "Profile updated successfully",
      user: buildUserResponse(user),
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const changePassword = async (req, res) => {
  const { currentPassword, oldPassword, password, newPassword } = req.body;
  const existingPassword = currentPassword || oldPassword;
  const nextPassword = newPassword || password;

  try {
    if (!existingPassword || !nextPassword) {
      return res.status(400).json({ message: "Current password and new password are required" });
    }

    const user = await User.findById(req.user._id);
    const isMatch = await bcrypt.compare(existingPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    user.password = await bcrypt.hash(nextPassword, 10);
    await user.save();

    return res.status(200).json({ message: "Password changed successfully" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  getMe,
  updateProfile,
  changePassword,
};
