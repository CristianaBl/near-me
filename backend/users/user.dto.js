// users/user.dto.js

function toUserDTO(user) {
  if (!user) return null;
  return {
    id: user._id.toString(),
    email: user.email,
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    type: user.type,
  };
}

function toUserListDTO(users) {
  return users.map(toUserDTO);
}

module.exports = { toUserDTO, toUserListDTO };
