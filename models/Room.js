const mongoose = require("mongoose");

const Room = mongoose.model("Room", {
  title: {
    required: true,
    type: String
  },
  description: {
    required: true,
    type: String
  },
  price: {
    required: true,
    type: Number
  },
  location: [Number],
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  pictures: Array
});

module.exports = Room;
