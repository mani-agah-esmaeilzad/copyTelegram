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

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result. The `dev` script now launches both the Next.js server and the Telegram relay watcher so real-time forwarding also runs while you develop.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Telegram copier

The project ships with an MTProto relay (no Bot API required). It connects with your personal API ID/hash and copies every message from one channel to another, including historical posts.

1. Duplicate `.env.example` to `.env.local` and set:
   - `TELEGRAM_API_ID` / `TELEGRAM_API_HASH`: create them in [my.telegram.org/apps](https://my.telegram.org/apps).
   - `TELEGRAM_SOURCE_CHAT_ID`: numeric ID or username of the channel to read (e.g. `-100123...` or `@sourcechannel`).
   - `TELEGRAM_TARGET_CHAT_ID`: numeric ID or username of the channel to publish.
   - Leave `TELEGRAM_SESSION` empty for now; it will be filled after the next step.
   - Optional `TELEGRAM_HISTORY_LIMIT`: number of historical messages to forward on startup (`0` skips backlog, omit to copy everything).
2. Generate and store a user session:

```bash
npm run telegram:login
# paste the string into TELEGRAM_SESSION inside .env.local
```

3. Join both channels with the same account you used above and grant it permission to read in the source channel and post in the target channel (make it an admin if necessary).
4. Start the relay:

```bash
npm run telegram:relay
```

The process copies historical messages (unless limited) and then keeps streaming new posts. Progress is stored in `.telegram-relay-state.json` so restarts resume from the last forwarded message instead of duplicating content.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
