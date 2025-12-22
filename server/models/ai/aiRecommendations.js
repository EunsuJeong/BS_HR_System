const mongoose = require("mongoose");

const aiRecommendationSchema = new mongoose.Schema({
  id: Number,
  date: String,
  time: String,
  title: String,
  content: String,
  recommendations: [
    { type: { type: String }, title: String, description: String },
  ],
  timestamp: String,
  createdAt: { type: Date, default: Date.now },
}, { collection: 'aiRecommendations' });

const AiRecommendation = mongoose.model("AiRecommendation", aiRecommendationSchema);
module.exports = AiRecommendation;
