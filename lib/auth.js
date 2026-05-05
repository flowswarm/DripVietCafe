const jwt = require('jsonwebtoken');

/**
 * Vercel serverless middleware: verifies JWT from Authorization header.
 * Usage: const admin = verifyAdmin(req); if (!admin) return res.status(401).json({ error: 'Unauthorized' });
 */
function verifyAdmin(req) {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.split(' ')[1];
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

module.exports = { verifyAdmin };
