const { supabase } = require('../lib/supabase');
const { verifyAdmin } = require('../lib/auth');
const { sendCustomerConfirmation, sendAdminOrderAlert } = require('../lib/email');

// Check if Supabase is configured
const hasSupabase = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── GET /api/orders ── admin only, returns all orders
  if (req.method === 'GET') {
    if (!hasSupabase) {
      return res.status(200).json([]); // Demo: empty order list
    }
    const admin = verifyAdmin(req);
    if (!admin) return res.status(401).json({ error: 'Unauthorized' });

    const { data: orders, error } = await supabase
      .from('orders')
      .select(`*, order_items (*)`)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(orders);
  }

  // ── POST /api/orders ── public, creates a new order
  if (req.method === 'POST') {
    const { customer_name, customer_email, pickup_time, items, total_amount, stripe_payment_intent_id } = req.body;

    if (!customer_name || !customer_email || !pickup_time || !items?.length)
      return res.status(400).json({ error: 'Missing required fields' });

    // ── Demo mode: no Supabase configured ────────────────────────
    if (!hasSupabase) {
      console.log('[Demo Mode] Order skipped (no Supabase) — returning mock confirmation');
      return res.status(201).json({
        success: true,
        orderId: 'demo-' + Date.now(),
        orderNumber: 'DEMO-' + Math.floor(1000 + Math.random() * 9000),
        demo: true
      });
    }

    try {
      // Insert order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_name,
          customer_email,
          pickup_time,
          total_amount,
          stripe_payment_intent_id: stripe_payment_intent_id || null,
          status: 'Pending'
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Insert order items
      const orderItems = items.map(item => ({
        order_id: order.id,
        item_name: item.name,
        item_slug: item.slug || null,
        price: item.price,
        quantity: item.quantity || 1,
        customizations: item.customizations || {}
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Fetch items back for emails
      const { data: savedItems } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order.id);

      // Send emails (don't block response if they fail)
      Promise.all([
        sendCustomerConfirmation(order, savedItems),
        sendAdminOrderAlert(order, savedItems)
      ]).catch(err => console.error('Email error:', err));

      return res.status(201).json({ success: true, orderId: order.id, orderNumber: order.order_number });
    } catch (err) {
      console.error('Order creation error:', err);
      return res.status(500).json({ error: err.message || 'Failed to create order' });
    }
  }

  // ── PUT /api/orders ── admin only, update order status
  if (req.method === 'PUT') {
    const admin = verifyAdmin(req);
    if (!admin) return res.status(401).json({ error: 'Unauthorized' });

    const { id, status } = req.body;
    const allowedStatuses = ['Pending', 'Ready', 'Completed', 'Cancelled'];
    if (!allowedStatuses.includes(status))
      return res.status(400).json({ error: 'Invalid status' });

    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
