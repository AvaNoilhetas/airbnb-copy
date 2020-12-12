const mongoose = require("mongoose");

const User = mongoose.model("User", {
  email: {
    required: true,
    unique: true,
    type: String
  },
  account: {
    username: {
      required: true,
      unique: true,
      type: String
    },
    name: {
      required: true,
      type: String
    },
    description: {
      required: true,
      type: String
    },
    photo: Object
  },
  rooms: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room"
    }
  ],
  token: {
    required: true,
    unique: true,
    type: String
  },
  hash: {
    required: true,
    type: String
  },
  salt: {
    required: true,
    type: String
  }
});

module.exports = User;
