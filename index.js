const express = require("express");
const formidableMiddleware = require("express-formidable");
const mongoose = require("mongoose");
const cors = require("cors");
const app = express();
require("dotenv").config();
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

app.use(formidableMiddleware());

const userRoute = require("./routes/user");
const roomRoute = require("./routes/room");
app.use(userRoute, roomRoute, cors());

mongoose.connect("mongodb://localhost/airbnb", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
  useFindAndModify: false
});

app.all("*", (req, res) => {
  res.status(400).json({ message: "not found" });
});

app.listen(3000, () => {
  console.log("Server has started");
});
