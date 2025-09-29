-- Add preferred_language field to profiles table
ALTER TABLE profiles
ADD COLUMN preferred_language VARCHAR(5) DEFAULT 'pt';

-- Create index for performance
CREATE INDEX idx_profiles_language ON profiles(preferred_language);

-- Update existing users to have 'pt' as default
UPDATE profiles SET preferred_language = 'pt' WHERE preferred_language IS NULL;