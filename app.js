require("dotenv").config();
const { GraphQLClient, gql } = require("graphql-request");
const bodyParser = require("body-parser");
const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const app = express();
const port = 9000;

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      httpOnly: false,
      maxAge: parseInt(process.env.SESSION_MAX_AGE),
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/idolUserDB", {
  useUnifiedTopology: true,
  useNewUrlParser: true,
});
mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema({
  password: String,
  email: String,
  username: String,
  role: { type: String, default: "member" },
});

userSchema.plugin(passportLocalMongoose);

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

// Passport Login method
passport.serializeUser(function (user, done) {
  done(null, user.id);
});

// Passport logout method
passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

app.get("/", (req, res) => {
  res.send("hello");
});

app.get("/login/user", (req, res) => {
  console.log(req.session);
  return res.json({ userID: req.session });
});

const requireAuth = (req, res, next) => {
  const { user } = req.session;
  if (user.role !== "admin" || "raider") {
    return res.status(401).json({ message: "Unauthorized" });
  }
};

const requireAdmin = (req, res, next) => {
  const { user } = req.session;
  if (user.role !== "admin") {
    return res.status(401).json({ message: "Insufficient role" });
  }
};

app.post("/signup", (req, res) => {
  User.findOne({ username: req.body.username }, async (err, doc) => {
    if (err) throw err;
    if (doc) return res.send("User already exists");
    else {
      User.register(
        { email: req.body.email, username: req.body.username },
        req.body.password,
        (err, user) => {
          if (err) {
            console.log(err);
            res.redirect("/");
          } else {
            passport.authenticate("local")(req, res, function () {
              res.redirect("/");
            });
          }
        }
      );
    }
  });
});

app.post("/login", function (req, res) {
  // Define new user with inputs for username, password, email
  const user = new User({
    username: req.body.username,
    password: req.body.password,
    email: req.body.email,
  });

  // Login users if credentials match database credentials, redirect to homepage
  req.login(user, function (err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function () {
        console.log(req.user);
        res.redirect("/");
      });
    }
  });
});
// app.post("/logout", (req, res) => {
//   // Logout current user and redirect home
//   req.session.destroy((err) => {
//     if (err) {
//       console.log(err);
//     } else {
//       res.redirect("/");
//     }
//   });
// });

// const url = `https://classic.warcraftlogs.com/api/v2/client`;
// const headers = {
//   authorization: "Bearer " + process.env.ACCESS_TOKEN,
//   "Content-Type": "application/json",
// };

// const graphQLClient = new GraphQLClient(url, {
//   headers,
// });

// const query = gql`
//   {
//     characterData {
//       character(name: "robdog", serverSlug: "fairbanks", serverRegion: "us") {
//         name
//         level
//         id
//         canonicalID
//         server {
//           id
//           name
//         }
//         classID
//         gameData
//         guildRank
//         guilds {
//           name
//           members {
//             total
//           }
//         }
//       }
//     }
//   }
// `;

// const client = graphQLClient.request(query).then((data) => {
//   console.log(JSON.stringify(data, undefined, 2));
// });

app.listen(port, () => {
  console.log(`idol-api listening on port ${port}`);
});
