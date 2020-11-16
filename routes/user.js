const express = require("express");
const router = express.Router();
const User = require("./../models/user");
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const uid2 = require("uid2");

router.post("/user/sign_up", async (req, res) => {
  const { email, password, username, name, description, rooms } = req.fields;

  try {
    const userFoundByEmail = await User.findOne({ email: email });
    const userFoundByUserName = await User.findOne({ username: username });

    if (userFoundByEmail || userFoundByUserName) {
      res.status(409).json("You already exist! 🙅‍");
    } else if (!username || !email || !password || !name || !description) {
      res.status(400).json("You have not entered all the data! 🙅‍");
    } else {
      const salt = uid2(16);
      const hash = SHA256(password + salt).toString(encBase64);
      const token = uid2(62);

      const newUser = new User({
        email: email,
        account: {
          username: username,
          name: name,
          description: description
        },
        rooms: rooms,
        token: token,
        hash: hash,
        salt: salt
      });

      await newUser.save();

      res.status(200).json("Your account was successfully created! 🎉");
    }
  } catch (error) {
    res.status(400).json({ message: error });
  }
});

router.post("/user/sign_in", async (req, res) => {
  const { email, password } = req.fields;

  try {
    const user = await User.findOne({ email: email });

    if (
      user &&
      SHA256(password + user.salt).toString(encBase64) === user.hash
    ) {
      const userData = {
        _id: user._id,
        token: user.token,
        username: user.account.username,
        name: user.account.name,
        description: user.account.description,
        email: user.email
      };
      res.status(200).json(userData);
    } else {
      res.status(401).json(`Unauthorized 🙅‍`);
    }
  } catch (error) {
    res.status(400).json({ message: error });
  }
});

module.exports = router;
