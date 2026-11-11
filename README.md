# Kindling

A public letterbox. People post a story, a project or an argument and say what it would cost. Patrons read, and pay through PayPal: by hand, or by sending an AI agent that reads on their behalf and never spends without a signature.

Built for the PayPal AI Hackathon 2026.

**Live demo:** https://kindling.deokjil.workers.dev (PayPal sandbox; no real money moves)

## Try the live demo

You need a PayPal **sandbox** buyer account to approve a payment. Use your own, or this test account:

- Email: `sb-ztbz153861669@personal.example.com`
- Password: `REPLACE_WITH_SANDBOX_PASSWORD`

Then:

1. **Give by hand.** Open any letter, pick an amount, press the PayPal button and approve with the sandbox account. The letter's total and the [ledger](https://kindling.deokjil.workers.dev/ledger) update at once.
2. **Send the agent.** Open the [patron desk](https://kindling.deokjil.workers.dev/patron), press *Use the example*, set a budget and send the agent. It reads the letters and proposes gifts; approve one with its PayPal button.
3. **Write a letter.** Open [Write yours](https://kindling.deokjil.workers.dev/write), paste a few rough sentences in any language and hand them to the editor.

The demo allows a fixed number of agent runs and edits per day so that a public page cannot run up an unbounded model bill.

## What it does

| Who | What they do | PayPal | AI |
|---|---|---|---|
| A writer | Drafts a letter in any language, gets it edited, posts it with a PayPal address | Receives gifts directly as the order's `payee` | Claude edits and translates the draft without adding facts, and lists what a patron will ask |
| A patron, by hand | Reads a letter and gives | Orders v2: create, approve in the PayPal button, capture | none |
| A patron, with an agent | States a mandate, a budget and a cap per gift | One order per proposal the patron approves | Claude reads every open letter with tools and proposes gifts with reasons |
| Anyone | Reads the ledger | Every line carries PayPal's capture ID | none |

### The agent can propose. Only the patron can pay.

1. The patron writes what they want to back, a total budget and a cap per gift.
2. The agent calls `list_letters`, `read_letter` and `propose_gift`. Each proposal is checked on the server against the cap, the remaining budget and what the letter still needs. A proposal that breaks a limit is refused and the agent is told why.
3. Each accepted proposal appears with a PayPal button. When the patron clicks it, the server creates the order from the **stored proposal**, so the amount and the recipient cannot be changed from the browser.
4. The patron approves in PayPal. The server captures the order, checks the captured amount, and writes the ledger line.

Letters are written by strangers, so the agent is told to treat their text as claims to weigh, and to report any letter that tries to instruct it. The spending limits do not depend on the model obeying: they are enforced in code.

### Gifts, not securities

A gift is a PayPal payment with no strings. Writers can also mark a letter "open to investment", which lets a patron ask for a conversation. No money moves on that path. Selling a stake in something is regulated nearly everywhere, and it belongs in a signed agreement between two people, not in a checkout button.

## Run it

Requires Node 20 or later.

```bash
npm install
cp .env.example .env.local   # then fill it in
npm run dev                  # http://localhost:3000
```

### Keys

1. **PayPal sandbox.** At [developer.paypal.com](https://developer.paypal.com) open *Apps & Credentials*, stay on *Sandbox*, create an app. Copy the client ID into both `PAYPAL_CLIENT_ID` and `NEXT_PUBLIC_PAYPAL_CLIENT_ID`, and the secret into `PAYPAL_CLIENT_SECRET`.
2. **Claude.** Put an Anthropic API key in `ANTHROPIC_API_KEY`.

### Trying a payment

Under *Testing Tools → Sandbox Accounts* PayPal gives you a Personal account (the patron) and a Business account (a writer).

- **By hand:** open any letter, pick an amount, press the PayPal button, log in with the sandbox Personal account.
- **Direct to a writer:** post a letter at `/write` and give the sandbox Business account's email as the PayPal address. Gifts to that letter are created with that account as `payee`.
- **With the agent:** go to `/patron`, press *Use the example*, send the agent, and sign a proposal.

The eight letters that ship with the app are samples written for the demo and are labelled as such. They have no PayPal address, so a gift to one lands in the app's own sandbox account. Set `PAYPAL_PAYEE_MODE=platform` to route every gift that way.

## Deploy to Cloudflare

The app runs on Cloudflare Workers through the OpenNext adapter, with D1 for storage.

```bash
npx wrangler login
npx wrangler d1 create kindling        # put the printed database_id into wrangler.jsonc
npm run deploy                         # builds and deploys
npx wrangler secret put PAYPAL_CLIENT_ID
npx wrangler secret put PAYPAL_CLIENT_SECRET
npx wrangler secret put ANTHROPIC_API_KEY
```

`npm run deploy` runs `scripts/deploy-cloudflare.mjs`. The adapter copies Next's `.env` files into the Worker, so the script moves `.env.local` aside during the build and passes only the public PayPal client ID through. Secrets reach the Worker through `wrangler secret` and nowhere else. The database table and the sample letters are created on the first request.

Daily allowances default to 30 agent runs, 40 edits and 40 new letters. Change them with the variables `DAILY_LIMIT_AGENT`, `DAILY_LIMIT_EDITOR` and `DAILY_LIMIT_LETTERS`.

## How it is built

```
src/
  app/
    page.tsx                         the letterbox
    p/[id]/page.tsx                  one letter, with the give panel
    write/page.tsx                   draft, edit, post
    patron/page.tsx                  the patron's agent
    ledger/page.tsx                  every captured gift
    api/
      pitches/shape/route.ts         Claude edits a draft (structured output)
      pitches/route.ts               post a letter
      agent/route.ts                 runs the agent, streams NDJSON events
      paypal/orders/route.ts         create an order for a gift
      paypal/orders/[orderId]/capture/route.ts
      interest/route.ts              ask a writer about investing
  lib/
    ai.ts                            the editor and the agent (Anthropic SDK)
    paypal.ts                        Orders v2 over REST
    db.ts, seed.ts                   storage (D1 on Cloudflare, a JSON file locally) and sample letters
  components/
    PayPalButton.tsx                 PayPal JS SDK button
scripts/deploy-cloudflare.mjs        build and deploy without bundling local secrets
wrangler.jsonc, open-next.config.ts  Cloudflare Workers configuration
```

- **Next.js 16** (App Router), React 19, TypeScript. No CSS framework.
- **PayPal:** Orders v2 REST API on the server (`/v1/oauth2/token`, `/v2/checkout/orders`, `/v2/checkout/orders/{id}/capture`), the PayPal JS SDK button in the browser. Create and capture calls carry a `PayPal-Request-Id`, so a retry cannot charge twice.
- **AI:** Claude Opus 5.5 through the official `@anthropic-ai/sdk`. The editor uses structured output with a Zod schema. The agent uses the SDK tool runner with three Zod-typed tools.
- **Storage:** Cloudflare D1 when deployed, one JSON file in `data/` when run locally (delete the folder to reset). Each record is its own row, and a letter's running total is changed in a single atomic statement, so two payments landing together cannot lose one.
- **Hosting:** Cloudflare Workers through `@opennextjs/cloudflare`.

## Known limits

- PayPal deducts its own fee from each gift, so the writer receives less than the patron sends (in the sandbox, $4.53 of a $5.00 gift). The ledger shows the amount sent.
- No accounts. A patron's name is whatever they type, and anyone can post a letter. Real use needs sign-in and identity checks on writers.
- The daily allowances are global counters, not per-visitor limits. One busy visitor can use up the day's agent runs for everyone.
- Capture is confirmed in the request that follows approval. A production build should also listen for the `PAYMENT.CAPTURE.COMPLETED` webhook, so a closed browser tab cannot leave a paid gift unrecorded.
- Nothing here has been reviewed for the rules that apply to fundraising platforms.

## Licence

MIT. See [LICENSE](LICENSE).
