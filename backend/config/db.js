const mongoose = require("mongoose");
require('dotenv').config();  // Load the environment variables from the .env file

const connectDB = async () => {
  try {
    // Ensure the MONGO_URI is available in the environment
    if (!process.env.MONGO_URI) {
      console.error("MONGO_URI is not defined in the .env file");
      process.exit(1);
    }

    // Connect to MongoDB without deprecated options
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("MongoDB Connected Successfully");
  } catch (error) {
    console.error("MongoDB Connection Error:", error.message);
    process.exit(1);  // Exit the process if connection fails
  }
};

module.exports = connectDB;
