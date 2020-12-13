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
        user: req.user,
        pictures: []
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

    if (String(req.user._id) === String(room.user._id)) {
      const picturesArr = room.pictures;

      for (let i = 0; i < picturesArr.length; i++) {
        let picture_id = picturesArr[i].picture_id;
        await cloudinary.uploader.destroy(picture_id);
      }
      await cloudinary.api.delete_folder("AirBnB/rooms/" + req.params.id);

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

router.post("/room/upload_picture/:id", isAuthenticated, async (req, res) => {
  if (req.params.id) {
    if (req.files.picture) {
      try {
        const room = await Room.findById(req.params.id);
        if (room) {
          if (String(req.user._id) === String(room.user._id)) {
            let arr = room.pictures;
            if (arr.length < 5) {
              await cloudinary.uploader.upload(
                req.files.picture.path,
                {
                  folder: "airbnb/rooms/" + req.params.id
                },

                async function(error, result) {
                  const pictureObj = {
                    url: result.secure_url,
                    picture_id: result.public_id
                  };
                  arr.push(pictureObj);
                }
              );

              await Room.findByIdAndUpdate(req.params.id, { pictures: arr });

              const roomUpdated = await Room.findById(req.params.id);

              res.status(200).json(roomUpdated);
            } else {
              res
                .status(200)
                .json({ error: "Can't add more than 5 pictures 🙅" });
            }
            res.status(200).json({});
          } else {
            res.json({ error: "Unauthorized 🙅" });
          }
        } else {
          res.status(400).json({ error: "Room not found 🙅" });
        }
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    } else {
      res.status(400).json({ error: "Missing parameters 🙅" });
    }
  } else {
    res.status(400).json({ error: "Missing room id 🙅" });
  }
});

router.put("/room/delete_picture/:id", isAuthenticated, async (req, res) => {
  if (req.params.id) {
    if (req.fields.picture_id) {
      try {
        const room = await Room.findById(req.params.id);

        if (room) {
          if (String(req.user._id) === String(room.user._id)) {
            let picture_id = req.fields.picture_id;
            let arr = room.pictures;
            let isPicture = false;

            for (let i = 0; i < arr.length; i++) {
              if (
                arr[i].picture_id ===
                `airbnb/rooms/${req.params.id}/${picture_id}`
              ) {
                let num = arr.indexOf(arr[i]);
                arr.splice(num, 1);
                await cloudinary.uploader.destroy(arr[i].picture_id);
                await Room.findByIdAndUpdate(req.params.id, {
                  pictures: arr
                });
                isPicture = true;
                res.status(200).json({ message: "Picture deleted" });
              }
            }
            if (isPicture === false) {
              res.status(400).json({ error: "Picture not found" });
            }
          } else {
            res.json({ error: "Unauthorized 🙅" });
          }
        } else {
          res.status(400).json({ error: "Room not found 🙅" });
        }
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    } else {
      res.status(400).json({ error: "Missing parameters 🙅" });
    }
  } else {
    res.status(400).json({ error: "Missing room id 🙅" });
  }
});

router.get("/rooms", async (req, res) => {
  try {
    let filters = {};

    if (req.query.title) {
      filters.title = new RegExp(req.query.title, "i");
    }

    if (req.query.priceMin) {
      filters.price = {
        $gte: req.query.priceMin
      };
    }

    if (req.query.priceMax) {
      if (filters.price) {
        filters.price.$lte = req.query.priceMax;
      } else {
        filters.price = {
          $lte: req.query.priceMax
        };
      }
    }

    let sort = {};

    if (req.query.sort === "price-asc") {
      sort = { price: 1 };
    } else if (req.query.sort === "price-desc") {
      sort = { price: -1 };
    }

    let page;

    if (Number(req.query.page) < 1) {
      page = 1;
    } else {
      page = Number(req.query.page);
    }

    let limit = Number(req.query.limit);

    const rooms = await Room.find(filters)
      .sort(sort)
      .limit(limit)
      .populate({
        path: "user",
        select: "account"
      })
      .skip((page - 1) * limit);

    const count = await Room.countDocuments();

    res.status(200).json({
      result: rooms.length,
      total: count,
      rooms: rooms
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
