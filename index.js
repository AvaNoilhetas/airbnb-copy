const express = require("express");
const formidableMiddleware = require("express-formidable");
const mongoose = require("mongoose");
const cors = require("cors");
const app = express();

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
