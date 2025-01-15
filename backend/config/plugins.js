module.exports = {
  'users-permissions': {
    config: {
      jwt: {
        secret: process.env.JWT_SECRET || 'your-random-jwt-secret',
        expiresIn: '7d',
      },
    },
  },
};
