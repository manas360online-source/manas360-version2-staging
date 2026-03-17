CREATE TABLE IF NOT EXISTS user_pets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  selected_pet TEXT NOT NULL DEFAULT 'koi',
  vitality INTEGER NOT NULL DEFAULT 24,
  unlocked_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_premium BOOLEAN NOT NULL DEFAULT FALSE,
  companion_mood TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_pets_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS user_pets_selected_pet_idx
  ON user_pets(selected_pet);

CREATE OR REPLACE FUNCTION set_user_pets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_pets_updated_at_trigger ON user_pets;
CREATE TRIGGER user_pets_updated_at_trigger
BEFORE UPDATE ON user_pets
FOR EACH ROW
EXECUTE FUNCTION set_user_pets_updated_at();
