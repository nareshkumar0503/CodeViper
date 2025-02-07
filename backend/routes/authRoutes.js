const express = require("express");
const passport = require("passport");

const router = express.Router();

// Google Authentication Route
router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Google OAuth Callback Route
router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login", session: false }),
  (req, res) => {
    const token = req.user.token;
    res.redirect(`http://localhost:5173/home?token=${token}`);
  }
);

module.exports = router;
