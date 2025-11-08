// users/user.dto.js

function toUserDTO(user) {
  if (!user) return null;
  return {
    id: user._id.toString(),
    email: user.email,
    type: user.type,
  };
}

function toUserListDTO(users) {
  return users.map(toUserDTO);
}

module.exports = { toUserDTO, toUserListDTO };
