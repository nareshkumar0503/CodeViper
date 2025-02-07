const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },  // `username` required for normal signup
  email: { type: String, required: true, unique: true },
  password: { type: String, required: false }, // Make password optional for Google login
  googleId: { type: String },  // For Google login, store the unique Google ID
});

module.exports = mongoose.model("User", userSchema);
