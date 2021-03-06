const router = require("express").Router();

// ℹ️ Handles password encryption
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

// How many rounds should bcrypt run the salt (default [10 - 12 rounds])
const saltRounds = 10;

// Require the User model in order to interact with the database
const User = require("../models/User.model");

const BERLIN_BOROUGHS = require("../utils/consts/berlin-boroughs.js");

const { transporter, welcomeMessage } = require("../utils/mail");

// Require necessary middlewares in order to control access to specific routes
const shouldNotBeLoggedIn = require("../middlewares/shouldNotBeLoggedIn");
const isLoggedIn = require("../middlewares/isLoggedIn");

router.get("/signup", shouldNotBeLoggedIn, (req, res) => {
  res.render("auth/signup", {
    berlinBoroughs: BERLIN_BOROUGHS,
    containsMap: true,
  });
});

// router.post("/signup", shouldNotBeLoggedIn, (req, res) => {
//   const { username, password, email, name, location } = req.body;
// });

router.post("/signup", shouldNotBeLoggedIn, (req, res) => {
  const {
    username,
    password,
    email,
    name,
    berlinBorough,
    location,
    latitude,
    longitude,
  } = req.body;

  if (!username || !name || !email) {
    return res.status(400).render("auth/signup", {
      errorMessage: "Please fill in all required fields.",
      berlinBoroughs: BERLIN_BOROUGHS,
      containsMap: true,
      username,
      password,
      email,
      name,
      berlinBorough,
      latitude,
      longitude,
    });
  }

  if (password.length < 8) {
    return res.status(400).render("auth/signup", {
      errorMessage: "Your password needs to be at least 8 characters long.",
      berlinBoroughs: BERLIN_BOROUGHS,
      containsMap: true,
      username,
      password,
      email,
      name,
      berlinBorough,
      latitude,
      longitude,
    });
  }

  //   ! This use case is using a regular expression to control for special characters and min length
  // const regex = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}/;

  // if (!regex.test(password)) {
  //   return res.status(400).render("signup", {
  //     errorMessage:
  //       "Password needs to have at least 8 chars and must contain at least one number, one lowercase and one uppercase letter.",
  //   });
  // }

  // Search the database for a user with the username submitted in the form
  User.findOne({ $or: [{ username }, { email }] }).then((found) => {
    // If the user is found, send the message username is taken
    if (found) {
      return res.status(400).render("auth/signup", {
        errorMessage: "Username or email already taken",
        berlinBoroughs: BERLIN_BOROUGHS,
        containsMap: true,
        username,
        password,
        email,
        name,
        berlinBorough,
        latitude,
        longitude,
        newsletter,
      });
    }

    return bcrypt
      .genSalt(saltRounds)
      .then((salt) => bcrypt.hash(password, salt))
      .then((hashedPassword) => {
        // Create a user and save it in the database
        return User.create({
          username,
          password: hashedPassword,
          email,
          name,
          berlinBorough,
          location: {
            type: "Point",
            coordinates: [longitude, latitude],
          },
          profilePicture: "/images/default-profile-picture.png",
        });
      })
      .then((user) => {
        // Bind the user to the session object
        req.session.user = user;

        transporter.sendMail({
          from: '"House of Plants 🌱" <houseofplants.ih@gmail.com>',
          to: user.email,
          subject: "🪴 Welcome to House of Plants 🪴",
          text: "Hello world?",
          html: welcomeMessage,
        });

        res.redirect("/");
      })
      .catch((error) => {
        if (error instanceof mongoose.Error.ValidationError) {
          return res
            .status(400)
            .render("auth/signup", { errorMessage: error.message });
        }
        if (error.code === 11000) {
          return res.status(400).render("signup", {
            errorMessage:
              "Username and email need to be unique. The username/email you entered is already in use.",
          });
        }
        return res.status(500).render("auth/signup", {
          errorMessage: error.message,
        });
      });
  });
});

router.get("/login", shouldNotBeLoggedIn, (req, res) => {
  res.render("auth/login");
});

router.post("/login", shouldNotBeLoggedIn, (req, res, next) => {
  const { username, password } = req.body;

  if (!password && !password) {
    return res.status(400).render("auth/login", {
      errorMessage: "Please provide your username and password.",
    });
  }

  if (!username) {
    return res
      .status(400)
      .render("auth/login", { errorMessage: "Please provide your username." });
  }

  if (!password) {
    return res
      .status(400)
      .render("auth/login", { errorMessage: "Please provide your password." });
  }

  // Here we use the same logic as above
  // - either length based parameters or we check the strength of a password
  if (password.length < 8) {
    return res.status(400).render("auth/login", {
      errorMessage: "Your password needs to be at least 8 characters long.",
    });
  }

  // Search the database for a user with the username submitted in the form
  User.findOne({ username })
    .then((user) => {
      // If the user isn't found, send the message that user provided wrong credentials
      if (!user) {
        return res
          .status(400)
          .render("auth/login", { errorMessage: "Wrong credentials." });
      }

      // If user is found based on the username, check if the in putted password matches the one saved in the database
      bcrypt.compare(password, user.password).then((isSamePassword) => {
        if (!isSamePassword) {
          return res
            .status(400)
            .render("auth/login", { errorMessage: "Wrong credentials." });
        }
        req.session.user = user;
        // req.session.user = user._id; // ! better and safer but in this case we saving the entire user object
        return res.redirect("/");
      });
    })

    .catch((err) => {
      // in this case we are sending the error handling to the error handling middleware that is defined in the error handling file
      // you can just as easily run the res.status that is commented out below
      next(err);
      // return res.status(500).render("login", { errorMessage: err.message });
    });
});

router.get("/logout", isLoggedIn, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res
        .status(500)
        .render("auth/logout", { errorMessage: err.message });
    }
    res.redirect("/");
  });
});

module.exports = router;
