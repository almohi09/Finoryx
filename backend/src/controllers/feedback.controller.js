const Feedback = require("../models/feedback.model");

const createFeedback = async (req, res, next) => {
  try {
    const message = (req.body.message || "").trim();
    const category = req.body.category || "other";
    const rating = Number(req.body.rating || 5);

    if (!message) {
      return res.status(400).json({ message: "Feedback message is required" });
    }

    if (Number.isNaN(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    const feedback = await Feedback.create({
      userId: req.user._id,
      message,
      category,
      rating,
    });

    return res.status(201).json({
      message: "Feedback submitted successfully",
      feedback,
    });
  } catch (err) {
    next(err);
  }
};

const getMyFeedback = async (req, res, next) => {
  try {
    const feedback = await Feedback.find({ userId: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json({ feedback });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createFeedback,
  getMyFeedback,
};
