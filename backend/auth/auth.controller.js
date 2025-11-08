const { toUserDTO } = require("../users/user.dto");
const authService = require("./auth.service");

exports.register = async (req, res) => {
  try {
    const user = await authService.register(req.body.email, req.body.password);
    res.json({user: toUserDTO(user)});
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { token, user } = await authService.login(
      req.body.email,
      req.body.password
    );
    res.json({ token, user: toUserDTO(user) });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
