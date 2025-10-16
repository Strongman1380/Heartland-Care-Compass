-- Add restriction and subsystem tracking fields to youth table

ALTER TABLE public.youth
ADD COLUMN IF NOT EXISTS "restrictionLevel" INTEGER DEFAULT NULL CHECK ("restrictionLevel" IN (1, 2)),
ADD COLUMN IF NOT EXISTS "restrictionPointsRequired" INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS "restrictionStartDate" TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS "restrictionPointsEarned" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "restrictionReason" TEXT DEFAULT NULL,

ADD COLUMN IF NOT EXISTS "subsystemActive" BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS "subsystemPointsRequired" INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS "subsystemStartDate" TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS "subsystemPointsEarned" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "subsystemReason" TEXT DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.youth."restrictionLevel" IS 'Restriction level: 1 or 2. NULL means no restriction';
COMMENT ON COLUMN public.youth."restrictionPointsRequired" IS 'Total points youth must earn to get off restriction';
COMMENT ON COLUMN public.youth."restrictionStartDate" IS 'When restriction was placed';
COMMENT ON COLUMN public.youth."restrictionPointsEarned" IS 'Points earned toward getting off restriction';
COMMENT ON COLUMN public.youth."restrictionReason" IS 'Reason for restriction placement';

COMMENT ON COLUMN public.youth."subsystemActive" IS 'Whether youth is currently on subsystem';
COMMENT ON COLUMN public.youth."subsystemPointsRequired" IS 'Total points youth must earn to get off subsystem';
COMMENT ON COLUMN public.youth."subsystemStartDate" IS 'When subsystem was started';
COMMENT ON COLUMN public.youth."subsystemPointsEarned" IS 'Points earned toward getting off subsystem';
COMMENT ON COLUMN public.youth."subsystemReason" IS 'Reason for subsystem placement';
