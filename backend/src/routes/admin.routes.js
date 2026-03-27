const express = require("express");
const { authUser } = require("../middlewares/auth.middleware");
const isAdmin = require("../middlewares/admin.middleware");
const {
  getUsers,
  getUserById,
  updateUser,
  getStats,
  getAnalytics,
  getFeedback,
  respondFeedback,
  deleteUser,
} = require("../controllers/admin.controller");

const adminRouter = express.Router();

adminRouter.get("/users", authUser, isAdmin, getUsers);
adminRouter.get("/users/:id", authUser, isAdmin, getUserById);
adminRouter.put("/users/:id", authUser, isAdmin, updateUser);
adminRouter.get("/stats", authUser, isAdmin, getStats);
adminRouter.get("/analytics", authUser, isAdmin, getAnalytics);
adminRouter.get("/feedback", authUser, isAdmin, getFeedback);
adminRouter.put("/feedback/:id", authUser, isAdmin, respondFeedback);
adminRouter.delete("/users/:id", authUser, isAdmin, deleteUser);
adminRouter.delete("/:id", authUser, isAdmin, deleteUser);

module.exports = adminRouter;
