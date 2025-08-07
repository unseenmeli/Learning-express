require('dotenv').config();

const { init } = require('@instantdb/admin');

const db = init({
  appId: '737da44f-e060-46c5-a28b-c1e2803a4590',
  adminToken: process.env.INSTANT_ADMIN_TOKEN,
});

async function requireAuth(req, res, next) {
  try {
    const userId = req.headers['x-user-id'];
    const userEmail = req.headers['x-user-email'];
    
    if (!userId || !userEmail) {
      return res.status(401).json({ error: 'No user credentials provided' });
    }

    const { data } = await db.query({
      $users: {
        $: {
          where: {
            id: userId,
            email: userEmail
          }
        }
      }
    });
    
    if (!data.$users || data.$users.length === 0) {
      return res.status(401).json({ error: 'Invalid user credentials' });
    }

    req.user = data.$users[0];
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
}

module.exports = { requireAuth, db };