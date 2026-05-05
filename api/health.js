/**
 * GET /api/health
 * Zero-dependency health check — confirms the Node runtime and env vars.
 */
module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const checks = {
    runtime: 'ok',
    node: process.version,
    timestamp: new Date().toISOString(),
    env: {
      SUPABASE_URL:              !!process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      SENDGRID_API_KEY:          !!process.env.SENDGRID_API_KEY,
      STRIPE_SECRET_KEY:         !!process.env.STRIPE_SECRET_KEY,
      JWT_SECRET:                !!process.env.JWT_SECRET,
      ADMIN_EMAIL:               !!process.env.ADMIN_EMAIL,
    }
  };

  const allSet = Object.values(checks.env).every(Boolean);
  return res.status(allSet ? 200 : 206).json({
    ...checks,
    status: allSet ? 'all_env_vars_set' : 'missing_env_vars'
  });
};
