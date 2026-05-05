-- ============================================================
-- DRIP VIETNAMESE CAFE — SUPABASE SCHEMA
-- ============================================================
-- HOW TO USE:
--   1. Go to supabase.com and open your project.
--   2. Click "SQL Editor" in the left sidebar.
--   3. Paste this entire file and click "Run".
--   That's it — all tables will be created automatically.
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── ADMIN USERS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default admin: username=admin, password=DripViet2026
-- (bcrypt hash of 'DripViet2026')
INSERT INTO admin_users (username, password_hash, email)
VALUES (
  'admin',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'brezzythetrapper@gmail.com'
)
ON CONFLICT (username) DO NOTHING;

-- ── MENU ITEMS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,    -- drinks | food | cookies
  customization_type TEXT NOT NULL, -- drink | cookie | food
  price NUMERIC(10, 2) NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed menu items
INSERT INTO menu_items (slug, name, description, category, customization_type, price, display_order) VALUES
  ('the-drippy',         'The Drippy',          'Vietnamese iced coffee with house coffee jelly and salted cream foam.',                  'drinks',  'drink',  7.00, 1),
  ('strawberry-matcha',  'Strawberry Matcha',    'Premium matcha layered with fresh strawberry foam.',                                    'drinks',  'drink',  8.00, 2),
  ('pandan-latte',       'Pandan Latte',         'Pandan milk with black drip and silky coconut foam on top.',                            'drinks',  'drink',  8.00, 3),
  ('ube-coffee',         'Ube Coffee',           'Vietnamese coffee topped with creamy ube foam.',                                        'drinks',  'drink',  8.00, 4),
  ('banana-latte',       'Banana Latte',         'Rich espresso with real banana — one of our best sellers.',                             'drinks',  'drink',  7.50, 5),
  ('drips-mystery',      'Drips Mystery',        'Ask your barista what''s in it today. Warning: you will want all three.',               'drinks',  'drink',  7.00, 6),
  ('ube-biscoff-cookie', 'Ube Biscoff Cookie',   'NEW FLAVOR. Ube cookie with a Biscoff crown. Limited time only.',                      'cookies', 'cookie', 4.00, 7),
  ('cookie-trio',        'Cookie Trio',          'Ube Biscoff · Pandan Crinkle · Chocolate Chip. All banger items.',                     'cookies', 'cookie', 10.00, 8),
  ('chicken-banh-mi',    'Chicken Bánh Mì',      'Fresh baguette, grilled chicken, pickled daikon, jalapeño, cilantro.',                 'food',    'food',   9.00, 9)
ON CONFLICT (slug) DO NOTHING;

-- ── ORDERS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number SERIAL,          -- human-friendly order number
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  pickup_time TEXT NOT NULL,    -- e.g. "2:30 PM"
  status TEXT DEFAULT 'Pending', -- Pending | Ready | Completed | Cancelled
  total_amount NUMERIC(10, 2) NOT NULL,
  stripe_payment_intent_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── ORDER ITEMS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  item_slug TEXT,
  price NUMERIC(10, 2) NOT NULL,
  quantity INT DEFAULT 1,
  customizations JSONB DEFAULT '{}', -- { temperature, milk, sugarPackets, liquidSugarShots, preparation, specialInstructions }
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── INDEXES ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- ── AUTO-UPDATE updated_at ────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_menu_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ── ROW LEVEL SECURITY (optional, for extra safety) ──────────
-- Public can read menu items
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read menu_items" ON menu_items FOR SELECT USING (true);

-- Orders are inserted by anyone (customers), read by service role only
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Insert orders" ON orders FOR INSERT WITH CHECK (true);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Insert order_items" ON order_items FOR INSERT WITH CHECK (true);
