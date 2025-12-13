const pushTokenService = require("./pushToken.service");

async function register(req, res) {
  try {
    const { userId, token } = req.body;
    if (!userId || !token) return res.status(400).json({ message: "userId and token are required" });
    const saved = await pushTokenService.upsertToken(userId, token);
    res.json({ token: saved });
  } catch (err) {
    res.status(400).json({ message: err.message || "Failed to save push token" });
  }
}

async function remove(req, res) {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: "token is required" });
    await pushTokenService.removeToken(token);
    res.json({ message: "Removed" });
  } catch (err) {
    res.status(400).json({ message: err.message || "Failed to remove push token" });
  }
}

module.exports = { register, remove };
