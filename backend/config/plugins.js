module.exports = {
  'users-permissions': {
    config: {
      jwtSecret: process.env.JWT_SECRET || 'your-random-jwt-secret',  
      jwtExpiresIn: '7d',
    },
  },
};
