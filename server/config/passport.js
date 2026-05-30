// Passport.js Google OAuth 2.0 strategy configuration

import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';

passport.use(
  new GoogleStrategy(
    {
      clientID:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:  process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // 1. Try to find user by googleId
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          // 2. Try to find user by email (existing account — link Google)
          const email = profile.emails?.[0]?.value;
          user = await User.findOne({ email });

          if (user) {
            user.googleId = profile.id;
            await user.save();
          } else {
            // 3. Create brand-new Google user
            user = await User.create({
              googleId:      profile.id,
              username:      profile.displayName,
              email:         profile.emails?.[0]?.value,
              password:      null,
              skillsOffered: [],
              skillsWanted:  [],
            });
          }
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user._id));

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});
