const userService = require("./user.service");

exports.getAll = async (req, res) => {
  const users = await userService.getUsers();
  res.json(users);
};

exports.getOne = async (req, res) => {
  const user = await userService.getUserById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user);
};

exports.update = async (req, res) => {
  const user = await userService.updateUser(req.params.id, req.body);
  res.json(user);
};

exports.remove = async (req, res) => {
  await userService.deleteUser(req.params.id);
  res.json({ message: "User deleted" });
};
