const express = require("express");
const router = express.Router();
const isAuthenticated = require("./../middlewares/isAuthenticated");
const Room = require("./../models/room");
const User = require("./../models/user");
const cloudinary = require("cloudinary").v2;

router.post("/room/publish", isAuthenticated, async (req, res) => {
  try {
    const { title, description, price, location } = req.fields;

    if (title && description && price && location) {
      const newRoom = new Room({
        title: title,
        description: description,
        price: price,
        location: [location.lat, location.lng],
        user: req.user
      });

      await newRoom.save();

      const user = await User.findById(req.user._id);

      user.rooms.push(newRoom._id);

      await User.findByIdAndUpdate(req.user._id, {
        rooms: user.rooms
      });

      res.status(200).json(newRoom);
    }
  } catch (error) {
    res.status(400).json({ message: error });
  }
});

router.get("/rooms", isAuthenticated, async (req, res) => {
  try {
    const rooms = await Room.find()
      .populate({
        path: "user",
        select: "account"
      })
      .select("title, description, price, location");

    res.json(rooms);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/room/:id", isAuthenticated, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id)
      .populate({
        path: "user",
        select: "account"
      })
      .select("title, description, price, location");

    res.json(room);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put("/room/update/:id", isAuthenticated, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    const { title, description, price, location } = req.fields;

    if (String(req.user._id) === String(room.user._id)) {
      if (title) {
        room.title = title;
      }
      if (description) {
        room.description = description;
      }
      if (price) {
        room.description = price;
      }
      if (location && location.lat) {
        room.location = [location.lat, room.location[1]];
      }
      if (location && location.lng) {
        room.location = [room.location[0], location.lng];
      }

      await room.save();

      res.status(200).json({ room });
    } else {
      res.json({ error: "Unauthorized 🙅" });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/room/delete/:id", isAuthenticated, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    const { title, description, price, location } = req.fields;

    if (String(req.user._id) === String(room.user._id)) {
      await Room.findByIdAndRemove(req.params.id);

      const user = await User.findById(req.user._id);

      let roomUpdatedArr = [];

      for (let i = 0; i < user.rooms.length; i++) {
        if (String(user.rooms[i]) !== String(req.params.id)) {
          roomUpdatedArr.push(user.rooms[i]);
        }
      }

      await User.findByIdAndUpdate(req.user._id, {
        rooms: roomUpdatedArr
      });

      res.json({
        message: "Room deleted"
      });
    } else {
      res.json({ error: "Unauthorized 🙅" });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
