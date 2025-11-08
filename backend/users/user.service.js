const User = require("./user.model");

async function createUser(data) {
  const user = new User(data);
  return await user.save();
}

async function getUsers() {
  return await User.find();
}

async function getUserById(id) {
  return await User.findById(id);
}

async function updateUser(id, data) {
  return await User.findByIdAndUpdate(id, data, { new: true });
}

async function deleteUser(id) {
  return await User.findByIdAndDelete(id);
}

async function getUserByEmail(email) {
  return await User.findOne({ email });
}

module.exports = {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUserByEmail,
};
