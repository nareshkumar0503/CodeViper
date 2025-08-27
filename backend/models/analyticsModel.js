const mongoose = require("mongoose");

const analyticsSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  data: {
    type: Map,
    of: {
      events: [
        {
          actionType: String,
          user: String,
          details: mongoose.Mixed, // Changed from Object to mongoose.Mixed for flexibility
          timestamp: String,
        },
      ],
      totalActions: { type: Number, default: 0 },
      linesOfCode: { type: Number, default: 0 }, // New: User-specific lines of code
      compilations: { type: Number, default: 0 }, // New: User-specific compilations
      lastActive: String, // New: Timestamp of last user action
    },
    default: new Map(),
  },
  totalSessionHours: { type: Number, default: 0 },
  totalActions: { type: Number, default: 0 },
  linesOfCode: { type: Number, default: 0 },
  compilationFrequency: { type: Number, default: 0 },
});

// Add index for faster queries by roomId
analyticsSchema.index({ roomId: 1 });

module.exports = mongoose.model("Analytics", analyticsSchema);