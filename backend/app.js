const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("Hello from Express!");
});


const PORT = 3000;
app.listen(3000, "0.0.0.0", () => {
  console.log("API running on http://172.20.10.2:3000");
});