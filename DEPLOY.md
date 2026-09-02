# Deploying to Vercel

This repository is ready to deploy to Vercel. The GitHub Actions workflow `.github/workflows/deploy-vercel.yml` will trigger a production deploy on pushes to `main` when Vercel secrets are configured.

Required secrets (GitHub repository secrets / Vercel project environment variables):

- `VERCEL_TOKEN` (GitHub secret) — Personal token from your Vercel account (for the Action)
- `VERCEL_ORG_ID` (GitHub secret) — Your Vercel organization ID
- `VERCEL_PROJECT_ID` (GitHub secret) — Your Vercel project ID

Application environment variables (set these in Vercel Project > Variables):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_URL` (optional fallback for admin client)
- `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` (server-side secret)
- `TOEFL_SESSION_SECRET` (HMAC signing secret, minimum 32 chars)
- `TOEFL_SESSION_COOKIE` (optional, name of session cookie)

Quick setup steps:

1. In Vercel, import the repository (or use the GitHub integration).
2. In Vercel Project Settings > Environment Variables, add the application env vars above.
3. In your GitHub repository, add `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` as repository secrets.
4. Push to `main` — the workflow will build and deploy to production.

If you prefer Vercel's native Git integration (recommended), you can skip the GitHub Action and use Vercel's Automatic Deployments; the same environment variables must be configured in Vercel.

Removing the GitHub Action (optional):

1. Delete the workflow file from the repository to stop Action-driven deploys:

```bash
git rm .github/workflows/deploy-vercel.yml
git commit -m "chore(ci): remove Vercel GitHub Action in favor of native Vercel integration"
git push
```

2. In Vercel, import the repository and enable Automatic Deployments (link your Git provider). Vercel will run builds on every push and manage previews automatically.

Notes:
- Keeping the GitHub Action is harmless — it provides an alternative deploy path (useful for tokens or CI customizations).
- `.vercelignore` has been added to exclude dev and CI files from deployments.
