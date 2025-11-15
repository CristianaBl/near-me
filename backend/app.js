require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const userRoutes = require("./users/user.routes");
const authRoutes = require("./auth/auth.routes");
const followRequestRoutes = require("./followRequests/followrequest.routes");
const subscriptionRoutes = require("./subscriptions/subscription.routes");

const app = express();

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

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://172.20.10.2:${PORT}`);
});
