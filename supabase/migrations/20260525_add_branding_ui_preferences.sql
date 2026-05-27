-- Add branding and ui_preferences columns to app_settings
-- branding: stores app name, subtitle, logo, colors, sidebar visibility flags
-- ui_preferences: stores primary color, density, quick actions visibility

ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS branding       jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ui_preferences jsonb DEFAULT '{}'::jsonb;
