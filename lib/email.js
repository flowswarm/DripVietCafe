const sgMail = require('@sendgrid/mail');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'brezzythetrapper@gmail.com';
const FROM_EMAIL  = process.env.FROM_EMAIL  || 'orders@dripvietcafe.com';
const FROM_NAME   = 'Drip Vietnamese Cafe';

function initMail() {
  const key = process.env.SENDGRID_API_KEY;
  if (!key) throw new Error('Missing SENDGRID_API_KEY environment variable');
  sgMail.setApiKey(key);
}


// ── HELPERS ─────────────────────────────────────────────────

function formatCustomizations(customizations) {
  const lines = [];
  if (customizations.temperature)        lines.push(`Temperature: ${customizations.temperature}`);
  if (customizations.milk)               lines.push(`Milk: ${customizations.milk}`);
  if (customizations.sugarPackets != null) lines.push(`Sugar Packets: ${customizations.sugarPackets}`);
  if (customizations.liquidSugarShots != null) lines.push(`Liquid Sugar Shots: ${customizations.liquidSugarShots}`);
  if (customizations.preparation)        lines.push(`Preparation: ${customizations.preparation}`);
  if (customizations.specialInstructions) lines.push(`Special Instructions: ${customizations.specialInstructions}`);
  return lines.length ? lines.join(' | ') : 'No customizations';
}

function buildOrderItemsHtml(items) {
  return items.map(item => `
    <tr>
      <td style="padding:8px 0; border-bottom:1px solid #eee;">
        <strong>${item.item_name}</strong><br>
        <span style="font-size:12px; color:#666;">${formatCustomizations(item.customizations)}</span>
      </td>
      <td style="padding:8px 0; border-bottom:1px solid #eee; text-align:right;">
        $${Number(item.price).toFixed(2)}
      </td>
    </tr>
  `).join('');
}

// ── EMAIL TEMPLATES ──────────────────────────────────────────

/**
 * Send order confirmation to the customer.
 */
async function sendCustomerConfirmation(order, items) {
  initMail();
  const msg = {
    to: order.customer_email,
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject: `Order Confirmed — Pickup at ${order.pickup_time} 🌿`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: 'Georgia', serif; background: #f9f6f0; margin:0; padding:0;">
        <div style="max-width:560px; margin:40px auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.08);">
          <div style="background:#2d6a4f; padding:32px; text-align:center;">
            <h1 style="color:#fff; margin:0; font-size:28px; letter-spacing:2px;">DRIP</h1>
            <p style="color:rgba(255,255,255,0.8); margin:8px 0 0; font-size:13px; letter-spacing:1px;">VIETNAMESE CAFE</p>
          </div>
          <div style="padding:32px;">
            <h2 style="margin:0 0 8px;">Order Confirmed! 🎉</h2>
            <p style="color:#555; margin:0 0 24px;">Hey ${order.customer_name}, your order is confirmed. We'll have it ready for you at <strong>${order.pickup_time}</strong> today.</p>
            
            <div style="background:#f9f6f0; border-radius:8px; padding:20px; margin-bottom:24px;">
              <p style="margin:0 0 8px; font-size:13px; text-transform:uppercase; letter-spacing:1px; color:#999;">Order #${order.order_number || order.id.slice(0,8).toUpperCase()}</p>
              <p style="margin:0; font-size:22px; font-weight:bold;">Pick up at ${order.pickup_time}</p>
              <p style="margin:4px 0 0; color:#555; font-size:14px;">225 N 11th St, Philadelphia, PA 19107 (Chinatown)</p>
            </div>

            <table style="width:100%; border-collapse:collapse;">
              ${buildOrderItemsHtml(items)}
            </table>

            <div style="border-top:2px solid #2d6a4f; margin-top:16px; padding-top:16px; display:flex; justify-content:space-between;">
              <strong style="font-size:18px;">Total</strong>
              <strong style="font-size:18px;">$${Number(order.total_amount).toFixed(2)}</strong>
            </div>

            <p style="margin:24px 0 0; color:#888; font-size:13px;">
              Questions? DM us <a href="https://instagram.com/dripvietcafe" style="color:#2d6a4f;">@dripvietcafe</a> on Instagram.<br>
              We're open Tue–Sun, 9am–5pm.
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  return sgMail.send(msg);
}

/**
 * Send new order alert to the admin.
 */
async function sendAdminOrderAlert(order, items) {
  initMail();
  const msg = {
    to: ADMIN_EMAIL,
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject: `🛎 New Order #${order.order_number || order.id.slice(0,8).toUpperCase()} — Pickup ${order.pickup_time}`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; background:#f4f4f4; margin:0; padding:20px;">
        <div style="max-width:560px; margin:0 auto; background:#fff; border-radius:8px; padding:24px; border-top: 4px solid #2d6a4f;">
          <h2 style="margin:0 0 16px; color:#2d6a4f;">New Order Received</h2>
          
          <table style="width:100%; border-collapse:collapse; margin-bottom:16px;">
            <tr><td style="padding:6px 0; color:#666; width:140px;">Order #</td><td style="padding:6px 0; font-weight:bold;">${order.order_number || order.id.slice(0,8).toUpperCase()}</td></tr>
            <tr><td style="padding:6px 0; color:#666;">Customer</td><td style="padding:6px 0; font-weight:bold;">${order.customer_name}</td></tr>
            <tr><td style="padding:6px 0; color:#666;">Email</td><td style="padding:6px 0;">${order.customer_email}</td></tr>
            <tr><td style="padding:6px 0; color:#666;">Pickup Time</td><td style="padding:6px 0; font-weight:bold; color:#2d6a4f; font-size:18px;">${order.pickup_time}</td></tr>
            <tr><td style="padding:6px 0; color:#666;">Total</td><td style="padding:6px 0; font-weight:bold; font-size:18px;">$${Number(order.total_amount).toFixed(2)}</td></tr>
          </table>

          <h3 style="margin:16px 0 8px; border-top:1px solid #eee; padding-top:16px;">Items Ordered</h3>
          <table style="width:100%; border-collapse:collapse;">
            ${buildOrderItemsHtml(items)}
          </table>

          <div style="margin-top:24px; padding:12px; background:#f9f6f0; border-radius:6px; text-align:center;">
            <a href="${process.env.VERCEL_URL || 'http://localhost:3000'}/admin.html" 
               style="color:#2d6a4f; font-weight:bold; text-decoration:none;">
              → View in Admin Dashboard
            </a>
          </div>
        </div>
      </body>
      </html>
    `
  };

  return sgMail.send(msg);
}

/**
 * Notify admin when a menu item is marked sold out.
 */
async function sendSoldOutAlert(itemName) {
  initMail();
  const msg = {
    to: ADMIN_EMAIL,
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject: `⚠️ Menu Update — "${itemName}" Marked as Sold Out`,
    html: `
      <div style="font-family:Arial,sans-serif; padding:24px; max-width:480px;">
        <h2 style="color:#c0392b;">Menu Item Sold Out</h2>
        <p><strong>${itemName}</strong> has been marked as sold out and is no longer visible to customers.</p>
        <p>To re-enable it, visit your <a href="${process.env.VERCEL_URL || 'http://localhost:3000'}/admin.html" style="color:#2d6a4f;">Admin Dashboard</a>.</p>
        <p style="color:#888; font-size:12px;">Drip Vietnamese Cafe — Menu Management</p>
      </div>
    `
  };
  return sgMail.send(msg);
}

/**
 * Notify admin when a menu price is updated.
 */
async function sendPriceUpdateAlert(itemName, oldPrice, newPrice) {
  initMail();
  const msg = {
    to: ADMIN_EMAIL,
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject: `📋 Menu Update — "${itemName}" Price Changed`,
    html: `
      <div style="font-family:Arial,sans-serif; padding:24px; max-width:480px;">
        <h2 style="color:#2d6a4f;">Price Updated</h2>
        <p>The price for <strong>${itemName}</strong> has been updated:</p>
        <p style="font-size:20px;"><del style="color:#999;">$${Number(oldPrice).toFixed(2)}</del> → <strong>$${Number(newPrice).toFixed(2)}</strong></p>
        <p style="color:#888; font-size:12px;">Drip Vietnamese Cafe — Menu Management</p>
      </div>
    `
  };
  return sgMail.send(msg);
}

module.exports = {
  sendCustomerConfirmation,
  sendAdminOrderAlert,
  sendSoldOutAlert,
  sendPriceUpdateAlert
};
