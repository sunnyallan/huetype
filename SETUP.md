# Hue Type — Day 1 Setup Guide

Follow these steps in order. Each section tells you exactly what to do and where to click.

---

## Step 1 — Create a GitHub Repository

1. Go to https://github.com/new
2. Repository name: `huetype`
3. Visibility: Private (you can make it public later)
4. Do NOT initialise with README
5. Click **Create repository**
6. Copy the remote URL (e.g. `https://github.com/yourusername/huetype.git`)

Then in Terminal, from this folder:
```bash
cd "/Users/apple/Documents/huetype"
git init
git add .
git commit -m "Day 1: backend foundation"
git branch -M main
git remote add origin https://github.com/yourusername/huetype.git
git push -u origin main
```

---

## Step 2 — Create a Supabase Project

1. Go to https://supabase.com and sign up (free)
2. Click **New project**
3. Name: `huetype`
4. Database password: generate a strong one and save it somewhere safe
5. Region: **Southeast Asia (Singapore)** — closest to India
6. Click **Create new project** — wait ~2 minutes for it to spin up

### 2a — Run the database schema

1. In your Supabase project, click **SQL Editor** in the left sidebar
2. Click **New query**
3. Open the file `supabase/schema.sql` from this folder
4. Copy the entire contents and paste it into the SQL editor
5. Click **Run** (or Cmd+Enter)
6. You should see "Success. No rows returned" — that's correct

### 2b — Create Storage buckets

1. Click **Storage** in the left sidebar
2. Click **New bucket**
   - Name: `svgs`
   - Public bucket: **OFF** (leave unchecked)
   - Click **Save**
3. Click **New bucket** again
   - Name: `fonts`
   - Public bucket: **OFF** (leave unchecked)
   - Click **Save**

### 2c — Add Storage policies

For the `svgs` bucket:
1. Click the `svgs` bucket → click **Policies** tab → **New policy** → **For full customization**
2. Policy name: `svgs_user_access`
3. Allowed operations: SELECT, INSERT, DELETE
4. Policy definition:
   ```sql
   (bucket_id = 'svgs') AND ((storage.foldername(name))[1] = auth.uid()::text)
   ```
5. Click **Review** → **Save policy**

For the `fonts` bucket:
1. Click the `fonts` bucket → **Policies** tab → **New policy** → **For full customization**
2. Policy name: `fonts_user_read`
3. Allowed operations: SELECT only
4. Policy definition:
   ```sql
   (bucket_id = 'fonts') AND ((storage.foldername(name))[1] = auth.uid()::text)
   ```
5. Click **Review** → **Save policy**

### 2d — Note your API keys

Go to **Project Settings** (gear icon) → **API**. You'll need these in Step 4:

| Key | Where to find it |
|-----|-----------------|
| Project URL | "Project URL" field |
| anon key | Under "Project API keys" → `anon` `public` |
| service_role key | Under "Project API keys" → `service_role` `secret` |
| JWT Secret | Under "JWT Settings" → "JWT Secret" |

---

## Step 3 — Set up Google OAuth

You need a Google Cloud project to get an OAuth client ID.

### 3a — Create Google OAuth credentials

1. Go to https://console.cloud.google.com
2. Create a new project or select an existing one
3. In the left menu: **APIs & Services** → **OAuth consent screen**
   - User type: **External**
   - App name: `Hue Type`
   - User support email: your email
   - Developer contact email: your email
   - Click **Save and Continue** through all steps
4. Go to **APIs & Services** → **Credentials** → **+ Create Credentials** → **OAuth client ID**
   - Application type: **Web application**
   - Name: `Hue Type`
   - Authorised JavaScript origins:
     - `http://localhost:3000`
     - `https://www.sunnyallan.design`
   - Authorised redirect URIs:
     - `https://your-project-id.supabase.co/auth/v1/callback`
       *(Replace `your-project-id` with your Supabase project ID — found in the Supabase URL)*
   - Click **Create**
5. Copy the **Client ID** and **Client Secret** — you'll need them in the next step

### 3b — Enable Google OAuth in Supabase

1. In Supabase: **Authentication** → **Providers** → **Google**
2. Toggle **Enable Google provider** ON
3. Paste your Google **Client ID** and **Client Secret**
4. Copy the **Callback URL** shown (it should match what you put in Google Cloud)
5. Click **Save**

---

## Step 4 — Deploy the Backend to Render.com

### 4a — Create a Render account

1. Go to https://render.com and sign up with GitHub
2. This automatically connects your GitHub account

### 4b — Create the Web Service

1. Click **New** → **Web Service**
2. Connect your `huetype` GitHub repository
3. Settings:
   - **Name**: `huetype-api`
   - **Region**: Singapore (closest to India)
   - **Branch**: `main`
   - **Root Directory**: `huetype-backend`
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: Free
4. Scroll down to **Environment Variables** and add these (values from Step 2d):

   | Key | Value |
   |-----|-------|
   | `SUPABASE_URL` | Your Supabase project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | Your service_role key |
   | `SUPABASE_ANON_KEY` | Your anon key |
   | `SUPABASE_JWT_SECRET` | Your JWT secret |
   | `ALLOWED_ORIGINS` | `https://www.sunnyallan.design,http://localhost:3000` |

5. Click **Create Web Service**
6. Wait for the build to complete (~3-5 minutes) — watch the logs

### 4c — Verify it's working

Once deployed, your API URL will be `https://huetype-api.onrender.com` (or similar).

Run this in Terminal:
```bash
curl https://huetype-api.onrender.com/health
```

Expected response:
```json
{"status": "ok", "version": "1.0.0"}
```

> Note: First request after inactivity takes 30-60 seconds (Render free tier cold start). This is normal.

---

## Step 5 — Test the API with curl

Once the health check passes, test creating a project:

```bash
# Replace YOUR_SUPABASE_JWT with a real JWT — get one by signing in via Supabase Auth
# (Day 3 adds the frontend login; for now you can test with the Supabase dashboard token)

TOKEN="YOUR_SUPABASE_JWT"
API="https://huetype-api.onrender.com"

# Create a project
curl -X POST "$API/projects" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Project", "description": "My first icon font"}'

# List projects
curl "$API/projects" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Day 1 Complete ✓

You now have:
- ✅ GitHub repo with all backend code
- ✅ Supabase database with full schema + RLS
- ✅ Google OAuth configured
- ✅ FastAPI backend live on Render

**Next session (Day 2):** Test the nanoemoji pipeline end-to-end. Upload SVGs via API, trigger a font build job, download the WOFF2.

---

## Quick Reference — Key URLs

| Service | URL |
|---------|-----|
| Supabase dashboard | https://app.supabase.com |
| Render dashboard | https://dashboard.render.com |
| API health check | https://huetype-api.onrender.com/health |
| API docs (auto-generated) | https://huetype-api.onrender.com/docs |
