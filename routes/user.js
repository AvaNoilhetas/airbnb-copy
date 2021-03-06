const express = require("express");
const router = express.Router();
const User = require("./../models/user");
const Room = require("./../models/room");
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const uid2 = require("uid2");
const isAuthenticated = require("./../middlewares/isAuthenticated");
const cloudinary = require("cloudinary").v2;

router.post("/users/sign_up", async (req, res) => {
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
          description: description,
          photo: null
        },
        rooms: rooms,
        token: token,
        hash: hash,
        salt: salt
      });

      await newUser.save();

      res
        .status(200)
        .json({ message: "Your account was successfully created! 🎉" });
    }
  } catch (error) {
    res.status(400).json({ message: error });
  }
});

router.post("/users/sign_in", async (req, res) => {
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

router.patch("/users/update", isAuthenticated, async (req, res) => {
  try {
    if (
      req.fields.email ||
      req.fields.description ||
      req.fields.username ||
      req.fields.name
    ) {
      if (req.fields.email) {
        const email = await User.findOne({ email: req.fields.email });
        if (email) {
          return res
            .status(400)
            .json({ message: "This email is already used. 🙅" });
        } else {
          req.user.email = req.fields.email;
        }
      }

      if (req.fields.username) {
        const username = await User.findOne({
          "account.username": req.fields.username
        });
        if (username) {
          return res
            .status(400)
            .json({ message: "This username is already used. 🙅" });
        } else {
          req.user.account.username = req.fields.username;
        }
      }

      if (req.fields.description) {
        req.user.account.description = req.fields.description;
      }

      if (req.fields.name) {
        req.user.account.name = req.fields.name;
      }

      await req.user.save();

      res.status(200).json({
        _id: req.user._id,
        email: req.user.email,
        account: req.user.account,
        rooms: req.user.rooms
      });
    } else {
      res.status(400).json({ error: "Missing parameter 🙅" });
    }
  } catch (error) {
    res.status(400).json({ message: error });
  }
});

router.patch("/users/update_password", isAuthenticated, async (req, res) => {
  try {
    if (
      SHA256(req.fields.previousPassword + req.user.salt).toString(
        encBase64
      ) === req.user.hash
    ) {
      if (
        SHA256(req.fields.previousPassword + req.user.salt).toString(
          encBase64
        ) !== SHA256(req.fields.newPassword + req.user.salt).toString(encBase64)
      ) {
        const salt = uid2(64);
        const hash = SHA256(req.fields.newPassword + salt).toString(encBase64);
        const token = uid2(64);

        req.user.salt = salt;
        req.user.hash = hash;
        req.user.token = token;

        await req.user.save();

        res.status(200).json({
          _id: req.user._id,
          token: req.user.token,
          email: req.user.email,
          account: req.user.account,
          rooms: req.user.rooms
        });
      } else {
        res.status(400).json({
          error: "Previous password and new password must be different"
        });
      }
    } else {
      res.status(400).json({ error: "Wrong previous password" });
    }
  } catch (error) {
    res.status(400).json({ message: error });
  }
});

router.post("/users/:id/upload_picture", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (user) {
      if (String(user._id) === String(req.user._id)) {
        if (!user.account.photo) {
          await cloudinary.uploader.upload(
            req.files.picture.path,
            {
              folder: "AirBnB/users/" + req.user._id
            },
            async function(error, result) {
              const avatarObj = {
                url: result.secure_url,
                picture_id: result.public_id
              };

              await User.findByIdAndUpdate(req.user._id, {
                "account.photo": avatarObj
              });
            }
          );
        } else {
          await cloudinary.uploader.upload(
            req.files.picture.path,

            { public_id: user.account.photo.picture_id },

            async function(error, result) {
              const avatarObj = {
                url: result.secure_url,
                picture_id: result.public_id
              };

              await User.findByIdAndUpdate(req.params.id, {
                "account.photo": avatarObj
              });
            }
          );
        }
        const userUpdated = await User.findById(req.user._id);

        res.status(200).json({
          account: userUpdated.account,
          _id: userUpdated._id,
          email: userUpdated.email,
          rooms: userUpdated.rooms
        });
      } else {
        res.status(401).json({ error: "Unauthorized 🙅" });
      }
    } else {
      res.status(400).json({ error: "User not found 🙅" });
    }
  } catch (error) {
    res.status(400).json({ message: error });
  }
});

router.delete(
  "/users/:id/delete_picture",
  isAuthenticated,
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id);

      if (user) {
        if (String(user._id) === String(req.user._id)) {
          if (user.account.photo) {
            await cloudinary.uploader.destroy(user.account.photo.picture_id);
            await cloudinary.api.delete_folder("AirBnB/users/" + req.user._id);

            await User.findByIdAndUpdate(req.user._id, {
              "account.photo": null
            });

            const userUpdated = await User.findById(req.user._id);

            res.status(200).json({
              account: userUpdated.account,
              _id: userUpdated._id,
              email: userUpdated.email,
              rooms: userUpdated.rooms
            });
          } else {
            res.status(400).json({ message: "you don't have a picture" });
          }
        } else {
          res.status(401).json({ error: "Unauthorized 🙅" });
        }
      } else {
        res.status(400).json({ error: "User not found 🙅" });
      }
    } catch (error) {
      res.status(400).json({ message: error });
    }
  }
);

router.get("/users/:id", async (req, res) => {
  if (req.params.id) {
    try {
      const user = await User.findById(req.params.id);
      if (user) {
        res.json({
          _id: user._id,
          account: user.account,
          rooms: user.rooms
        });
      } else {
        res.json({ message: "User not found 🙅" });
      }
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  } else {
    res.status(400).json({ error: "Missing id 🙅" });
  }
});

router.get("/users/:id/rooms", async (req, res) => {
  if (req.params.id) {
    try {
      const user = await User.findById(req.params.id);
      if (user) {
        if (user.rooms.length > 0) {
          let rooms = [];
          for (let i = 0; i < user.rooms.length; i++) {
            rooms.push(await Room.findById(user.rooms[i]._id));
          }
          res.json({ rooms });
        } else {
          res.status(200).json({ message: "This user has no room 🤷‍" });
        }
      } else {
        res.json({ message: "User not found 🙅" });
      }
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  } else {
    res.status(400).json({ error: "Missing id 🙅" });
  }
});

module.exports = router;
