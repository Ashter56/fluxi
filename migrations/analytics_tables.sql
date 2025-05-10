-- Analytics tables for investor reporting

-- Table for storing all user events
CREATE TABLE IF NOT EXISTS user_events (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  metadata JSONB, -- Store additional event-specific data
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index on common query patterns
CREATE INDEX IF NOT EXISTS idx_user_events_user_id ON user_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_events_event_type ON user_events(event_type);
CREATE INDEX IF NOT EXISTS idx_user_events_created_at ON user_events(created_at);
CREATE INDEX IF NOT EXISTS idx_user_events_user_event_type ON user_events(user_id, event_type);

-- Table for cohort retention analysis
CREATE TABLE IF NOT EXISTS retention_cohorts (
  id SERIAL PRIMARY KEY,
  cohort_week DATE NOT NULL, -- The week when users signed up
  user_id INTEGER NOT NULL,
  active BOOLEAN NOT NULL DEFAULT FALSE, -- Whether user was active in the current period
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Unique constraint to avoid duplicate entries
  CONSTRAINT unique_user_cohort UNIQUE (cohort_week, user_id)
);

-- Add index on common query patterns
CREATE INDEX IF NOT EXISTS idx_retention_cohorts_cohort_week ON retention_cohorts(cohort_week);
CREATE INDEX IF NOT EXISTS idx_retention_cohorts_user_id ON retention_cohorts(user_id);
CREATE INDEX IF NOT EXISTS idx_retention_cohorts_active ON retention_cohorts(active);

-- Table for storing aggregated analytics metrics
CREATE TABLE IF NOT EXISTS analytics_metrics (
  id SERIAL PRIMARY KEY,
  metric_date TIMESTAMPTZ NOT NULL,
  metric_type VARCHAR(50) NOT NULL, -- e.g. 'dau', 'wau', 'mau', 'k_factor', etc.
  metric_value NUMERIC NOT NULL,
  additional_data JSONB, -- For storing component metrics or additional context
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index on common query patterns
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_type ON analytics_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_date ON analytics_metrics(metric_date);