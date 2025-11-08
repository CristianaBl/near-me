const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const userService = require("../users/user.service");
require("dotenv").config();

const SECRET = process.env.JWT_SECRET; 

async function register(email, password, type = "user") {
  const existing = await userService.getUserByEmail(email);
  if (existing) throw new Error("Email already exists");

  const hashed = await bcrypt.hash(password, 10);
  const user = await userService.createUser({ email, password: hashed, type });
  return user;
}

async function login(email, password) {
  const user = await userService.getUserByEmail(email);
  if (!user) throw new Error("Invalid credentials");

  const match = await bcrypt.compare(password, user.password);
  if (!match) throw new Error("Invalid credentials");

  const token = jwt.sign({ id: user._id, email: user.email }, SECRET, {
    expiresIn: "1h",
  });

  return { token, user };
}

module.exports = { register, login };
