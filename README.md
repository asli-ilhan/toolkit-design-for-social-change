This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

1. Push your code to GitHub and import the repo in [Vercel](https://vercel.com/new).
2. **Environment variables** (Vercel → Project → Settings → Environment Variables):
   - `NEXT_PUBLIC_SUPABASE_URL` — your Supabase project URL (e.g. `https://xxxx.supabase.co`)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — your Supabase anon/public key
3. Deploy. The build uses `next build`.

**Supabase:** Run `supabase/schema.sql` in the Supabase Dashboard → SQL Editor (including the `workshop_state` table and RLS policies) so the app and phase control work in production. Create a storage bucket named `wizard` if you use photo uploads.
