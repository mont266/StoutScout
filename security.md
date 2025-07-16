
# Stoutly Security Policy & Best Practices

Security is a top priority for Stoutly. This document outlines the security model of the application and provides essential configuration guidance for the platform administrator.

## 1. Google Cloud Platform Security

### **Action Required: Restrict Google Maps API Key**

Your Google Maps API key (`VITE_GOOGLE_MAPS_API_KEY`) is visible on the client-side, which is necessary for it to function. If left unrestricted, this key could be stolen and used by others, leading to unexpected charges on your Google Cloud bill.

**To secure your key:**

1.  Navigate to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Go to **APIs & Services > Credentials**.
3.  Select the API key used for this project.
4.  Under **Application restrictions**, select **HTTP referrers (web sites)**. Add your application's domain(s) to the list (e.g., `your-app-domain.com/*`). For development, you can add `localhost:*`.
5.  Under **API restrictions**, select **Restrict key**. In the dropdown, select the specific APIs this app needs:
    *   **Maps JavaScript API**
    *   **Places API**
    *   **Geocoding API**
6.  Click **Save**.

## 2. Supabase Backend Security

### **Row-Level Security (RLS) is Mandatory**

Row-Level Security (RLS) is a feature of PostgreSQL (used by Supabase) that controls which rows a user can access or modify in a table. Without RLS, your Supabase API keys might allow unintended access to data. **You must enable RLS on all tables containing sensitive user data.**

#### Recommended RLS Policies:

Here are example policies you should apply in the Supabase SQL Editor.

**For the `profiles` table:**

```sql
-- 1. Enable RLS on the table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Allow public read access to non-sensitive profile info
CREATE POLICY "Allow public read-only access to profiles"
ON public.profiles FOR SELECT
USING (true);

-- 3. Allow users to update their own profile
CREATE POLICY "Allow users to update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- (Implicitly, no one can INSERT or DELETE profiles directly)
```

**For the `ratings` table:**

```sql
-- 1. Enable RLS on the table
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- 2. Allow public read-only access
CREATE POLICY "Allow public read-only access to ratings"
ON public.ratings FOR SELECT
USING (true);

-- 3. Allow authenticated users to insert their own ratings
CREATE POLICY "Allow authenticated users to insert ratings"
ON public.ratings FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 4. Allow users to update or delete their own ratings
CREATE POLICY "Allow users to update/delete their own ratings"
ON public.ratings FOR (UPDATE, DELETE)
USING (auth.uid() = user_id);
```

### **Best Practice: Automate Profile Creation**

To make profile creation more robust and secure, create a trigger in Supabase that automatically adds a new profile whenever a user signs up.

```sql
-- Function to create a profile for a new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, level, reviews)
  VALUES (new.id, new.raw_user_meta_data->>'username', 1, 0);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run the function after a new user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

### **Best Practice: Secure Moderation Actions**

Actions like banning a user should never be done via a direct database update from the client. Instead, use a Supabase Edge Function. The frontend calls the function, which then securely performs the action using its elevated privileges. The client-side code has been updated to call a function named `ban-user`. You must create this function in your Supabase project.

## 3. Application & Dependency Security

### **Dependency Scanning**

Node.js package vulnerabilities can pose a risk. Regularly run `npm audit` and `npm audit fix` to identify and patch known vulnerabilities in your project's dependencies.

## 4. Responsible Disclosure

If you discover a security vulnerability in Stoutly, please report it privately. We appreciate your efforts to responsibly disclose your findings and will make every effort to acknowledge your contributions. Contact details for reporting will be made available upon official launch.
