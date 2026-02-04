PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  phone TEXT UNIQUE,
  country TEXT,
  status TEXT DEFAULT 'ACTIVE',
  verified_email_at TEXT,
  verified_phone_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_roles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, role),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS brands (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  website TEXT,
  description TEXT,
  payout_sla_days INTEGER DEFAULT 14,
  status TEXT DEFAULT 'ACTIVE',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS partners (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  niche_tags TEXT DEFAULT '[]',
  languages TEXT DEFAULT '[]',
  countries TEXT DEFAULT '[]',
  channels_json TEXT,
  methods TEXT DEFAULT '[]',
  portfolio_links TEXT DEFAULT '[]',
  verification_level INTEGER DEFAULT 0,
  strikes INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS offers (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'ACTIVE',
  conversion_type TEXT NOT NULL,
  payout_type TEXT NOT NULL,
  payout_amount TEXT NOT NULL,
  currency TEXT DEFAULT 'USD',
  join_mode TEXT DEFAULT 'AUTO',
  attribution_window_days INTEGER DEFAULT 7,
  validation_rules TEXT NOT NULL,
  terms TEXT NOT NULL,
  landing_url TEXT,
  assets_json TEXT,
  allowed_channels TEXT DEFAULT '[]',
  geo TEXT DEFAULT '[]',
  outbound_webhook_url TEXT,
  outbound_webhook_secret TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(brand_id) REFERENCES brands(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS offer_members (
  id TEXT PRIMARY KEY,
  offer_id TEXT NOT NULL,
  partner_id TEXT NOT NULL,
  status TEXT DEFAULT 'ACTIVE',
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(offer_id, partner_id),
  FOREIGN KEY(offer_id) REFERENCES offers(id) ON DELETE CASCADE,
  FOREIGN KEY(partner_id) REFERENCES partners(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tracking_links (
  id TEXT PRIMARY KEY,
  offer_id TEXT NOT NULL,
  partner_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(offer_id) REFERENCES offers(id) ON DELETE CASCADE,
  FOREIGN KEY(partner_id) REFERENCES partners(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  idempotency_key TEXT UNIQUE NOT NULL,
  attribution_key TEXT,
  offer_id TEXT,
  partner_id TEXT,
  brand_id TEXT,
  source TEXT,
  user_agent TEXT,
  ip_hash TEXT,
  payload TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  offer_id TEXT NOT NULL,
  partner_id TEXT NOT NULL,
  attribution_key TEXT,
  email TEXT,
  phone TEXT,
  geo TEXT,
  status TEXT DEFAULT 'PENDING',
  reason TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  validated_at TEXT,
  dispute_status TEXT,
  dispute_note TEXT,
  FOREIGN KEY(offer_id) REFERENCES offers(id) ON DELETE CASCADE,
  FOREIGN KEY(partner_id) REFERENCES partners(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS wallets (
  id TEXT PRIMARY KEY,
  partner_id TEXT UNIQUE NOT NULL,
  balance TEXT DEFAULT '0',
  currency TEXT DEFAULT 'USD',
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(partner_id) REFERENCES partners(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payouts (
  id TEXT PRIMARY KEY,
  wallet_id TEXT NOT NULL,
  amount TEXT NOT NULL,
  currency TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING',
  note TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  paid_at TEXT,
  FOREIGN KEY(wallet_id) REFERENCES wallets(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  before_json TEXT,
  after_json TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);
CREATE INDEX IF NOT EXISTS idx_offers_brand ON offers(brand_id, status);
CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at);
CREATE INDEX IF NOT EXISTS idx_events_attr ON events(attribution_key);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_offer_partner ON leads(offer_id, partner_id, created_at);
