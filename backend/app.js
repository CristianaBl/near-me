require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
const userRoutes = require("./users/user.routes");
const authRoutes = require("./auth/auth.routes");
const followRequestRoutes = require("./followRequests/followrequest.routes");
const subscriptionRoutes = require("./subscriptions/subscription.routes");
const locationRoutes = require("./locations/location.routes");
const pinRoutes = require("./pins/pin.routes");
const arrivalWatchRoutes = require("./arrivalWatches/arrivalWatch.routes");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// Expose io for routes/controllers
app.set("io", io);

io.on("connection", (socket) => {
  socket.on("register", (userId) => {
    if (userId) {
      socket.join(userId);
    }
  });
});

// Connect to MongoDB
connectDB();

app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
    res.json({message: 'API works!'});
})
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/follow-requests", followRequestRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/pins", pinRoutes);
app.use("/api/arrival-watches", arrivalWatchRoutes);

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://172.20.10.2:${PORT}`);
});
