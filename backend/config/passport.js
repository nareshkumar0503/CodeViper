const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/userModel");
const jwt = require("jsonwebtoken");

require("dotenv").config(); // Load environment variables

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:5000/api/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ email: profile.emails[0].value });

        if (!user) {
          // Create new user with Google details
          user = new User({
            email: profile.emails[0].value,
            password: null, // No password required for Google login
            username: profile.displayName || `User-${profile.id}`, // Default username if none exists
            googleId: profile.id, // Store the unique Google ID
          });
          await user.save();
        }

        // Generate JWT token
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
          expiresIn: "7d",
        });

        return done(null, { user, token });
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

// ✅ Store user ID in session
passport.serializeUser((user, done) => {
  done(null, user.user._id); 
});

// ✅ Retrieve user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    if (user) {
      return done(null, user);
    } else {
      return done(new Error("User not found"), null);
    }
  } catch (error) {
    return done(error, null);
  }
});
