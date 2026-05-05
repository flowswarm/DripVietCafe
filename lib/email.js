const { Resend } = require('resend');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'brezzythetrapper@gmail.com';
const FROM_EMAIL  = process.env.FROM_EMAIL  || 'Drip Vietnamese Cafe <onboarding@resend.dev>';
const FROM_NAME   = 'Drip Vietnamese Cafe';

let _resend = null;
function getResend() {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) return null; // Demo mode — emails skipped silently
    _resend = new Resend(key);
  }
  return _resend;
}

// Helper: send or skip in demo mode
async function trySend(payload) {
  const client = getResend();
  if (!client) {
    console.log('[Demo Mode] Email skipped (no RESEND_API_KEY):', payload.subject);
    return; // Silently skip — no crash
  }
  const { error } = await client.emails.send(payload);
  if (error) throw error;
}

// ── HELPERS ─────────────────────────────────────────────────

function formatCustomizations(c) {
  const lines = [];
  if (c.temperature)          lines.push(`Temperature: ${c.temperature}`);
  if (c.milk)                  lines.push(`Milk: ${c.milk}`);
  if (c.sugarPackets != null)  lines.push(`Sugar Packets: ${c.sugarPackets}`);
  if (c.liquidSugarShots != null) lines.push(`Liquid Sugar Shots: ${c.liquidSugarShots}`);
  if (c.preparation)           lines.push(`Preparation: ${c.preparation}`);
  if (c.specialInstructions)   lines.push(`Note: ${c.specialInstructions}`);
  return lines.length ? lines.join(' · ') : 'Standard';
}

function buildItemRows(items) {
  return items.map(item => `
    <tr>
      <td style="padding:10px 0; border-bottom:1px solid #eee;">
        <strong style="font-size:14px;">${item.item_name}</strong>
        ${item.quantity > 1 ? ` <span style="color:#888;">x${item.quantity}</span>` : ''}
        <br>
        <span style="font-size:12px; color:#777;">${formatCustomizations(item.customizations || {})}</span>
      </td>
      <td style="padding:10px 0; border-bottom:1px solid #eee; text-align:right; font-weight:600;">
        $${(Number(item.price) * Number(item.quantity)).toFixed(2)}
      </td>
    </tr>
  `).join('');
}

// ── EMAIL TEMPLATES ──────────────────────────────────────────

/**
 * Customer order confirmation email.
 */
async function sendCustomerConfirmation(order, items) {
  const orderNum = order.order_number || order.id.slice(0, 8).toUpperCase();

  await trySend({
    from: FROM_EMAIL,
    to:   order.customer_email,
    subject: `Order Confirmed — Pick up at ${order.pickup_time} 🌿`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="margin:0; padding:0; background:#f5f0ea; font-family:'Georgia',serif;">
        <div style="max-width:560px; margin:40px auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header -->
          <div style="background:#2d6a4f; padding:32px; text-align:center;">
            <h1 style="color:#fff; margin:0; font-size:30px; letter-spacing:3px;">DRIP</h1>
            <p style="color:rgba(255,255,255,0.75); margin:6px 0 0; font-size:11px; letter-spacing:2px; text-transform:uppercase;">Vietnamese Cafe · Philadelphia</p>
          </div>
          <!-- Body -->
          <div style="padding:36px 40px;">
            <h2 style="margin:0 0 6px; font-size:22px;">Order Confirmed! 🎉</h2>
            <p style="color:#666; margin:0 0 28px; font-size:14px; line-height:1.6;">
              Hey <strong>${order.customer_name}</strong>, your order is in. We'll have everything ready for you at <strong>${order.pickup_time}</strong> today.
            </p>
            <!-- Pickup box -->
            <div style="background:#f5f0ea; border-radius:8px; padding:20px 24px; margin-bottom:28px; border-left:4px solid #2d6a4f;">
              <div style="font-size:11px; text-transform:uppercase; letter-spacing:1.5px; color:#888; margin-bottom:4px;">Order #${orderNum}</div>
              <div style="font-size:22px; font-weight:bold; color:#2d6a4f;">${order.pickup_time}</div>
              <div style="font-size:13px; color:#666; margin-top:4px;">225 N 11th St, Philadelphia, PA 19107</div>
            </div>
            <!-- Items -->
            <table style="width:100%; border-collapse:collapse;">
              ${buildItemRows(items)}
            </table>
            <!-- Total -->
            <div style="border-top:2px solid #2d6a4f; margin-top:16px; padding-top:14px; display:flex; justify-content:space-between; align-items:center;">
              <strong style="font-size:16px;">Total</strong>
              <strong style="font-size:20px; color:#2d6a4f;">$${Number(order.total_amount).toFixed(2)}</strong>
            </div>
            <!-- Footer note -->
            <p style="margin:28px 0 0; color:#aaa; font-size:12px; line-height:1.7;">
              Questions? DM us <a href="https://instagram.com/dripvietcafe" style="color:#2d6a4f;">@dripvietcafe</a> on Instagram.<br>
              Open Tue–Sun, 9am–5pm. See you soon! 🌿
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  });
}

/**
 * Admin new order alert email.
 */
async function sendAdminOrderAlert(order, items) {
  const orderNum = order.order_number || order.id.slice(0, 8).toUpperCase();
  const adminUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}/admin.html`
    : 'http://localhost:3000/admin.html';

  await trySend({
    from: FROM_EMAIL,
    to:   ADMIN_EMAIL,
    subject: `🛎 New Order #${orderNum} — Pickup ${order.pickup_time}`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="margin:0; padding:20px; background:#f4f4f4; font-family:Arial,sans-serif;">
        <div style="max-width:560px; margin:0 auto; background:#fff; border-radius:8px; padding:28px; border-top:4px solid #2d6a4f;">
          <h2 style="margin:0 0 20px; color:#2d6a4f; font-size:20px;">🛎 New Order Received</h2>
          <table style="width:100%; border-collapse:collapse; margin-bottom:20px;">
            <tr><td style="padding:7px 0; color:#888; width:140px; font-size:13px;">Order #</td><td style="padding:7px 0; font-weight:bold;">${orderNum}</td></tr>
            <tr><td style="padding:7px 0; color:#888; font-size:13px;">Customer</td><td style="padding:7px 0; font-weight:bold;">${order.customer_name}</td></tr>
            <tr><td style="padding:7px 0; color:#888; font-size:13px;">Email</td><td style="padding:7px 0;">${order.customer_email}</td></tr>
            <tr><td style="padding:7px 0; color:#888; font-size:13px;">Pickup Time</td><td style="padding:7px 0; font-weight:bold; color:#2d6a4f; font-size:20px;">${order.pickup_time}</td></tr>
            <tr><td style="padding:7px 0; color:#888; font-size:13px;">Total</td><td style="padding:7px 0; font-weight:bold; font-size:20px;">$${Number(order.total_amount).toFixed(2)}</td></tr>
          </table>
          <h3 style="margin:0 0 10px; padding-top:16px; border-top:1px solid #eee; font-size:15px;">Items Ordered</h3>
          <table style="width:100%; border-collapse:collapse;">
            ${buildItemRows(items)}
          </table>
          <div style="margin-top:24px; text-align:center;">
            <a href="${adminUrl}" style="display:inline-block; background:#2d6a4f; color:#fff; padding:12px 28px; border-radius:6px; text-decoration:none; font-weight:bold; font-size:14px;">
              View in Admin Dashboard →
            </a>
          </div>
        </div>
      </body>
      </html>
    `
  });
}

/**
 * Admin alert: item marked sold out.
 */
async function sendSoldOutAlert(itemName) {
  await trySend({
    from: FROM_EMAIL,
    to:   ADMIN_EMAIL,
    subject: `⚠️ "${itemName}" Marked as Sold Out`,
    html: `
      <div style="font-family:Arial,sans-serif; padding:28px; max-width:480px; border-top:4px solid #e53e3e;">
        <h2 style="color:#c0392b; margin:0 0 12px;">Menu Item Sold Out</h2>
        <p style="font-size:14px; color:#444;"><strong>${itemName}</strong> has been marked as sold out and is hidden from customers.</p>
        <p style="font-size:13px; color:#888;">Re-enable it any time from your Admin Dashboard.</p>
      </div>
    `
  });
}

/**
 * Admin alert: price updated.
 */
async function sendPriceUpdateAlert(itemName, oldPrice, newPrice) {
  await trySend({
    from: FROM_EMAIL,
    to:   ADMIN_EMAIL,
    subject: `📋 Price Updated — "${itemName}"`,
    html: `
      <div style="font-family:Arial,sans-serif; padding:28px; max-width:480px; border-top:4px solid #2d6a4f;">
        <h2 style="color:#2d6a4f; margin:0 0 12px;">Price Updated</h2>
        <p style="font-size:14px; color:#444;">The price for <strong>${itemName}</strong> has been changed:</p>
        <p style="font-size:22px; margin:12px 0;">
          <del style="color:#bbb;">$${Number(oldPrice).toFixed(2)}</del>
          &nbsp;→&nbsp;
          <strong style="color:#2d6a4f;">$${Number(newPrice).toFixed(2)}</strong>
        </p>
        <p style="font-size:12px; color:#aaa;">Drip Vietnamese Cafe — Menu Management</p>
      </div>
    `
  });
}

module.exports = {
  sendCustomerConfirmation,
  sendAdminOrderAlert,
  sendSoldOutAlert,
  sendPriceUpdateAlert
};
