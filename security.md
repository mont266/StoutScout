# Stoutly Security Policy & Best Practices

Security is a top priority for Stoutly. This document outlines the security model of the application and provides essential configuration guidance for the platform administrator.

---
## ❗️ Critical Update: Definitive Fix for Duplicate Notifications

If you are experiencing duplicate or triplicate notifications when users leave comments, please run the following SQL script in your Supabase SQL Editor. This is a definitive fix that programmatically finds and removes **all** old, conflicting database triggers on the `comments` table before installing a single, correct version. This guarantees a permanent solution.

```sql
-- Stoutly Definitive Notification Fix v7 - Handle all FKs
-- This version handles an additional foreign key (comments_user_id_fkey) that was
-- preventing the trigger cleanup script from running successfully.

-- Step 1: Drop ALL Foreign Key constraints that create system triggers on 'comments'.
-- This is necessary to allow the full trigger cleanup. We will re-create them at the end.

-- Constraint from `reported_comments` table referencing `comments`
ALTER TABLE public.reported_comments DROP CONSTRAINT IF EXISTS reported_comments_comment_id_fkey;

-- Constraint from `comments` table referencing `ratings`
ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_rating_id_fkey;

-- NEW: Constraint from `comments` table referencing `profiles` (for user_id)
ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_user_id_fkey;


-- Step 2: Aggressively remove ALL triggers from the 'comments' table.
-- This is the core cleanup step. It will now succeed.
DO $$
DECLARE
    trigger_name TEXT;
BEGIN
    FOR trigger_name IN
        SELECT tgname
        FROM pg_trigger
        JOIN pg_class ON tgrelid = pg_class.oid
        WHERE relname = 'comments'
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(trigger_name) || ' ON public.comments CASCADE;';
        RAISE NOTICE 'Dropped trigger: %', trigger_name;
    END LOOP;
END $$;

-- Step 3: Drop the handler function to be safe (it might have been orphaned).
DROP FUNCTION IF EXISTS public.handle_new_comment_notification() CASCADE;

-- Step 4: Create the new, simplified notification handler function (mentions removed).
CREATE OR REPLACE FUNCTION public.handle_new_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
    rating_info RECORD;
BEGIN
    SELECT id, user_id INTO rating_info
    FROM public.ratings
    WHERE id = NEW.rating_id;

    IF NOT FOUND THEN
        RETURN NEW;
    END IF;

    -- ONLY NOTIFY THE RATING'S OWNER
    IF rating_info.user_id IS NOT NULL AND rating_info.user_id <> NEW.user_id THEN
        INSERT INTO public.notifications (recipient_id, actor_id, type, entity_id, metadata)
        VALUES (
            rating_info.user_id,
            NEW.user_id,
            'new_comment',
            rating_info.id,
            jsonb_build_object('rating_id', rating_info.id)
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.handle_new_comment_notification() IS 'Handles creating notifications for new comments, notifying only the rating owner. (v7)';

-- Step 5: Create the single, authoritative trigger.
CREATE TRIGGER on_new_comment_v7
AFTER INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.handle_new_comment_notification();

COMMENT ON TRIGGER on_new_comment_v7 ON public.comments IS 'The single, definitive trigger for handling comment notifications (v7).';

-- Step 6: Re-create ALL the Foreign Key constraints to restore data integrity.

-- Re-create constraint for `reported_comments`
ALTER TABLE public.reported_comments
ADD CONSTRAINT reported_comments_comment_id_fkey
FOREIGN KEY (comment_id)
REFERENCES public.comments(id)
ON DELETE CASCADE;

COMMENT ON CONSTRAINT reported_comments_comment_id_fkey ON public.reported_comments IS 'Ensures reported comments exist in the comments table. Deletes reports if the comment is deleted.';

-- Re-create constraint for `comments` referencing ratings
ALTER TABLE public.comments
ADD CONSTRAINT comments_rating_id_fkey
FOREIGN KEY (rating_id)
REFERENCES public.ratings(id)
ON DELETE CASCADE;

COMMENT ON CONSTRAINT comments_rating_id_fkey ON public.comments IS 'Ensures comments are linked to a valid rating. Deletes comments if the parent rating is deleted.';

-- NEW: Re-create constraint for `comments` referencing profiles
ALTER TABLE public.comments
ADD CONSTRAINT comments_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.profiles(id)
ON DELETE CASCADE;

COMMENT ON CONSTRAINT comments_user_id_fkey ON public.comments IS 'Ensures comments are linked to a valid user. Deletes comments if the user is deleted.';

```
---

## 1. OpenStreetMap (Nominatim) Usage Policy

Stoutly uses the public [OpenStreetMap Nominatim API](https://nominatim.openstreetmap.org/) for geocoding (searching for addresses and pubs). Unlike other providers, Nominatim does not require an API key, but it has a strict usage policy to prevent abuse.

**Requirement: Valid HTTP User-Agent**

The most critical requirement is to provide a valid and descriptive `User-Agent` header with every API request. This allows OSM administrators to identify the application's traffic. Stoutly is already configured to send a correct User-Agent (e.g., `Stoutly/1.0 (https://stoutly-app.com)`).

-   **No action is required if you are deploying the app as-is.**
-   If you fork or modify the application, ensure that you update the User-Agent in the code to reflect your project's identity and contact information.
-   Failing to provide a valid User-Agent can result in your application being blocked from the API without warning.

Refer to the full [Nominatim Usage Policy](https://operations.osmfoundation.org/policies/nominatim/) for more details.

## 2. Supabase Backend Security

### **UTM Source Tracking Setup (Optional)**

To track which marketing campaigns (like QR coasters) are driving user signups, apply the following SQL scripts. This will enable the "UTM Stats" page in the app's Analytics Dashboard.

```sql
-- Step 1: Add a new column to the 'profiles' table to store the source.
-- This is safe because it's a new, optional (nullable) column. Existing data is not affected.
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS signup_utm_source TEXT;

COMMENT ON COLUMN public.profiles.signup_utm_source IS 'The utm_source parameter captured at user signup.';


-- Step 2: Safely update the user creation function.
-- We use CREATE OR REPLACE FUNCTION directly. This updates the function's logic
-- without dropping it, which avoids the error caused by the trigger dependency.
-- The existing trigger on auth.users will automatically start using this new version.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, accepts_marketing, signup_utm_source)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'username',
    (NEW.raw_user_meta_data ->> 'accepts_marketing')::boolean,
    NEW.raw_user_meta_data ->> 'signup_utm_source' -- This is the only new line
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Step 3: Create the new, self-contained RPC function for the frontend to fetch stats.
-- This is a read-only function and does not affect any other part of the system.
CREATE OR REPLACE FUNCTION get_utm_stats()
RETURNS TABLE (
  source TEXT,
  signup_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
    SELECT
      COALESCE(p.signup_utm_source, 'direct') as source,
      COUNT(p.id) as signup_count
    FROM
      public.profiles p
    GROUP BY
      COALESCE(p.signup_utm_source, 'direct')
    ORDER BY
      signup_count DESC,
      source ASC;
END;
$$ LANGUAGE plpgsql;

```

### **Essential RLS Policies (Ratings & Storage)**

**This is a critical step.** For core features like rating, uploading images, and deleting ratings to work, you must apply these Row Level Security (RLS) policies to your Supabase database. Run the following SQL in the Supabase SQL Editor.

```sql
-- === RLS Policies for the 'ratings' table ===

-- 1. Enable RLS on the table
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- 2. Allow public, read-only access to non-private ratings from non-banned users
CREATE POLICY "Allow public read access to ratings"
ON public.ratings FOR SELECT
USING (
  is_private = false AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = ratings.user_id AND profiles.is_banned = false
  )
);

-- 3. Allow users to see their own private ratings
CREATE POLICY "Allow users to view their own private ratings"
ON public.ratings FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 4. Allow users to insert their own ratings
CREATE POLICY "Allow authenticated users to insert ratings"
ON public.ratings FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 5. Allow users to update their own ratings
CREATE POLICY "Allow users to update their own ratings"
ON public.ratings FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- 6. Allow users to delete their own ratings
CREATE POLICY "Allow users to delete their own ratings"
ON public.ratings FOR DELETE
TO authenticated
USING (auth.uid() = user_id);


-- === RLS Policies for the 'pint-images' Storage Bucket ===
-- These policies assume a public bucket named 'pint-images'.

-- 1. Allow users to upload pint images.
-- The client-side code creates a unique file path per user.
CREATE POLICY "Users can upload pint images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'pint-images' );

-- 2. Allow users to delete their own pint images.
-- Supabase automatically sets the 'owner' of an uploaded file to the user's UID.
CREATE POLICY "Users can delete their own pint images"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'pint-images' AND owner = auth.uid() );
```

### **"Suggest an Edit" Feature Setup (Complete)**

To enable the "Suggest an Edit" feature and its moderation workflow, run the following SQL scripts in your Supabase SQL Editor.

#### **A. Create the Suggestions Table & Submission Function**
```sql
-- Create the table to hold all edit suggestions
CREATE TABLE IF NOT EXISTS public.pub_edit_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pub_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    current_name TEXT, -- The name of the pub at the time of suggestion
    current_address TEXT, -- The address of the pub at the time of suggestion
    suggested_data JSONB NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    moderator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    resolved_at TIMESTPTZ,
    created_at TIMESTPTZ NOT NULL DEFAULT now()
);

-- Add location data to suggestions table.
ALTER TABLE public.pub_edit_suggestions
ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;

-- Add comments for clarity
COMMENT ON TABLE public.pub_edit_suggestions IS 'Stores user-submitted suggestions for pub data corrections.';
COMMENT ON COLUMN public.pub_edit_suggestions.pub_id IS 'The ID of the pub being edited (can be osm- or stoutly-).';
COMMENT ON COLUMN public.pub_edit_suggestions.current_name IS 'The name of the pub at the time of suggestion for moderator context.';
COMMENT ON COLUMN public.pub_edit_suggestions.current_address IS 'The address of the pub at the time of suggestion for moderator context.';
COMMENT ON COLUMN public.pub_edit_suggestions.suggested_data IS 'A JSON object with the proposed changes, e.g., {"name": "New Name", "is_closed": true}.';
COMMENT ON COLUMN public.pub_edit_suggestions.status IS 'The current state of the suggestion in the moderation queue.';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS pub_edit_suggestions_user_id_idx ON public.pub_edit_suggestions (user_id);
CREATE INDEX IF NOT EXISTS pub_edit_suggestions_status_idx ON public.pub_edit_suggestions (status);

-- Enable Row Level Security on the new table
ALTER TABLE public.pub_edit_suggestions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to INSERT their own suggestions
CREATE POLICY "Allow authenticated users to insert suggestions"
ON public.pub_edit_suggestions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to SELECT their own suggestions
CREATE POLICY "Allow users to view their own suggestions"
ON public.pub_edit_suggestions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow developers (moderators) to SELECT all suggestions
CREATE POLICY "Allow developers to view all suggestions"
ON public.pub_edit_suggestions FOR SELECT
USING (
  (SELECT is_developer FROM public.profiles WHERE id = auth.uid()) = true
);

-- Allow developers to UPDATE suggestions (e.g., to change status)
CREATE POLICY "Allow developers to update suggestions"
ON public.pub_edit_suggestions FOR UPDATE
USING (
  (SELECT is_developer FROM public.profiles WHERE id = auth.uid()) = true
);

-- Create the RPC function for submitting suggestions from the frontend
CREATE OR REPLACE FUNCTION public.submit_pub_edit(
    p_pub_id TEXT,
    p_current_name TEXT,
    p_current_address TEXT,
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION,
    p_suggested_data JSONB,
    p_notes TEXT
)
RETURNS void AS $$
BEGIN
  -- This function runs as the user who called it (SECURITY INVOKER).
  -- The RLS policy for INSERT will ensure that the user_id matches auth.uid().
  INSERT INTO public.pub_edit_suggestions (pub_id, user_id, current_name, current_address, lat, lng, suggested_data, notes)
  VALUES (p_pub_id, auth.uid(), p_current_name, p_current_address, p_lat, p_lng, p_suggested_data, p_notes);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
```

#### **B. Add `is_closed` flag and create Moderation RPC Functions**
```sql
-- Add a public read policy to the profiles table. This is ESSENTIAL for moderation tools to work,
-- as the app needs to join suggestions with user profiles.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY; -- Ensure RLS is on

CREATE POLICY "Allow authenticated users to read all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- Add an 'is_closed' column to the pubs table.
ALTER TABLE public.pubs
ADD COLUMN IF NOT EXISTS is_closed BOOLEAN DEFAULT false NOT NULL;

-- Function to approve a suggestion. SECURITY DEFINER is required to bypass RLS on the 'pubs' table.
CREATE OR REPLACE FUNCTION public.approve_suggestion(p_suggestion_id UUID)
RETURNS void AS $$
DECLARE
  suggestion record;
BEGIN
  -- Security Check: Ensure the caller is a developer/moderator.
  IF NOT (SELECT is_developer FROM public.profiles WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'Permission denied: Moderator role required.';
  END IF;

  -- Find the suggestion to approve.
  SELECT * INTO suggestion