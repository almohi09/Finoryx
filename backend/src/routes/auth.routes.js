const express = require("express");
const {
  registerUser,
  loginUser,
  logoutUser,
  getMe,
  updateProfile,
  changePassword,
} = require("../controllers/auth.controller");
const { authUser } = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);
router.get("/me", authUser, getMe);
router.get("/profile", authUser, getMe);
router.patch("/profile", authUser, updateProfile);
router.put("/change-password", authUser, changePassword);

module.exports = router;
