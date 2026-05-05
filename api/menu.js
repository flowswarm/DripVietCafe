const { supabase } = require('../lib/supabase');
const { verifyAdmin } = require('../lib/auth');
const { sendSoldOutAlert, sendPriceUpdateAlert } = require('../lib/email');

const hasSupabase = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── GET /api/menu ── public, returns all menu items
  if (req.method === 'GET') {
    // Demo mode: Supabase not configured, return empty array
    // (menu.html uses hardcoded cards, so this is fine)
    if (!hasSupabase) {
      return res.status(200).json([]);
    }

    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  // ── PUT /api/menu ── admin only, update price or availability
  if (req.method === 'PUT') {
    const admin = verifyAdmin(req);
    if (!admin) return res.status(401).json({ error: 'Unauthorized' });

    const { id, price, is_available } = req.body;
    if (!id) return res.status(400).json({ error: 'Item ID required' });

    // Fetch current item for comparison (to trigger email alerts)
    const { data: current } = await supabase
      .from('menu_items')
      .select('*')
      .eq('id', id)
      .single();

    if (!current) return res.status(404).json({ error: 'Item not found' });

    const updates = {};
    if (price !== undefined) updates.price = price;
    if (is_available !== undefined) updates.is_available = is_available;

    const { error } = await supabase
      .from('menu_items')
      .update(updates)
      .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });

    // Send email alerts based on what changed
    const emailPromises = [];

    if (is_available === false && current.is_available !== false) {
      emailPromises.push(sendSoldOutAlert(current.name));
    }
    if (price !== undefined && Number(price) !== Number(current.price)) {
      emailPromises.push(sendPriceUpdateAlert(current.name, current.price, price));
    }

    if (emailPromises.length) {
      Promise.all(emailPromises).catch(err => console.error('Email alert error:', err));
    }

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
