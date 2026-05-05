const { supabase } = require('../lib/supabase');
const { verifyAdmin } = require('../lib/auth');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const admin = verifyAdmin(req);
  if (!admin) return res.status(401).json({ error: 'Unauthorized' });

  // Optional date range query params: ?from=2024-01-01&to=2024-12-31
  const { from, to } = req.query;

  let query = supabase
    .from('orders')
    .select(`*, order_items (*)`)
    .order('created_at', { ascending: false });

  if (from) query = query.gte('created_at', from);
  if (to)   query = query.lte('created_at', to);

  const { data: orders, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  // Build CSV
  const rows = [];
  const headers = ['Order #', 'Date', 'Customer Name', 'Customer Email', 'Pickup Time', 'Status', 'Total', 'Items'];
  rows.push(headers.join(','));

  orders.forEach(order => {
    const itemsSummary = (order.order_items || [])
      .map(i => `${i.item_name} x${i.quantity}`)
      .join('; ');

    const row = [
      order.order_number || order.id.slice(0, 8),
      new Date(order.created_at).toLocaleDateString(),
      `"${order.customer_name}"`,
      order.customer_email,
      order.pickup_time,
      order.status,
      `$${Number(order.total_amount).toFixed(2)}`,
      `"${itemsSummary}"`
    ];
    rows.push(row.join(','));
  });

  const csv = rows.join('\n');
  const filename = `drip-orders-${new Date().toISOString().split('T')[0]}.csv`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.status(200).send(csv);
};
