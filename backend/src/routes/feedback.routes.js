const express = require("express");
const { authUser } = require("../middlewares/auth.middleware");
const { createFeedback, getMyFeedback } = require("../controllers/feedback.controller");

const feedbackRouter = express.Router();

feedbackRouter.post("/", authUser, createFeedback);
feedbackRouter.get("/me", authUser, getMyFeedback);

module.exports = feedbackRouter;
