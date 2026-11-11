# Kindling

A public letterbox. People post a story, a project or an argument and say what it would cost. Patrons read, and pay through PayPal: by hand, or by saying once what they want to back and letting an AI agent recommend letters. Nothing is spent without the patron's own PayPal approval.

Built for the PayPal AI Hackathon 2026.

**Live demo:** https://kindling.deokjil.workers.dev (PayPal sandbox; no real money moves)

## Try the live demo

You need a PayPal **sandbox** buyer account to approve a payment. Use your own, or this test account:

- Email: `sb-ztbz153861669@personal.example.com`
- Password: `REPLACE_WITH_SANDBOX_PASSWORD`

Then:

1. **Give by hand.** Open any letter, pick an amount, press the PayPal button and approve with the sandbox account. The letter's total and the [ledger](https://kindling.deokjil.workers.dev/ledger) update at once.
2. **Set your preferences.** Open the [patron desk](https://kindling.deokjil.workers.dev/patron), press *Fill in an example* (or choose some causes and a budget) and save. The agent reads the open letters against them and recommends gifts; approve one with its PayPal button. Come back later and the recommendations are read again from the saved preferences, and the letters that fit are marked on the front page.
3. **Write a letter.** Open [Write yours](https://kindling.deokjil.workers.dev/write) and post one. Letters are written by hand; nothing drafts or edits them.

The demo allows a fixed number of agent runs and new letters per day.

## What it does

| Who | What they do | PayPal | AI |
|---|---|---|---|
| A writer | Writes a letter in their own words, lists what the money buys, posts it with a PayPal address | Receives gifts directly as the order's `payee` | none, on purpose: a patron should be reading the person |
| A patron, by hand | Reads a letter and gives | Orders v2: create, approve in the PayPal button, capture | none |
| A patron, with an agent | Saves preferences once: causes, a note in their own words, a giving style, a budget and a cap per gift | One order per recommendation the patron approves | Jev answers yes-or-no questions about each letter with a probability; code turns the answers into recommendations |
| Anyone | Reads the ledger | Every line carries PayPal's capture ID | none |

### The agent can recommend. Only the patron can pay.

1. The patron saves their preferences once:
   - **causes**, picked from a short list (education and training, health and care, tools for earning a living, technology and making, open knowledge, community and small business);
   - optionally, **a note in their own words** saying what else should be true of a letter;
   - whether to **finish one ask at a time** or spread gifts, a **budget** for one round and a **cap** per letter.

   Kindling has no accounts, so the preferences are kept in the patron's browser and sent with each reading.
2. Every open letter is read, whether its writer filed it as a story, a project or an argument. That label is the writer's own guess and the three overlap, so it never decides whether a letter reaches a patron. For each letter the agent asks [Jev](https://docs.typesafe.ai) one yes-or-no question per chosen cause, plus a few others, and gets a probability for each. Rules in code then decide which letters fit, in what order, and for how much, within the cap, the remaining budget and what each letter still needs.
3. Recommendations come back under the heading the writer chose (people, projects, arguments). Each shows which preferences the letter met and with what probability, the writer's own sentence, what the amount pays for, and a PayPal button. When the patron clicks it, the server creates the order from the **stored recommendation**, so the amount and the recipient cannot be changed from the browser.
4. The patron approves in PayPal. The server captures the order, checks the captured amount, and writes the ledger line.

Letters that fit but cannot be funded inside the limits, and letters the model could not settle either way, are listed as worth reading yourself. The next time the patron opens the desk, the letterbox is read again against the same preferences.

### Judgments from a model, decisions in code

Jev is a decision model: it does not write text, it answers typed questions with calibrated probabilities. The agent asks it:

| Question | About | What the answer does |
|---|---|---|
| Is this letter a request for money toward *this cause*? | each letter, once per cause the patron chose | the best answer among the chosen causes is the cause side of the fit; every cause at 70% or more is shown on the recommendation |
| Is this letter the kind of request the patron's note describes? | each letter, only when the patron wrote a note | the note side of the fit |
| Does the letter name someone or something that could confirm it? | each letter | 30% or less: the recommendation carries a "check first" note |
| Does the letter contain instructions aimed at an AI system? | each letter | 70% or more: the letter is set aside and reported |
| Does this sentence show the fit? | each sentence | the highest-scoring sentence, if it reaches 70%, is quoted to the patron in the writer's own words |

The fit of a letter is the weaker of its two sides: any one cause is enough, but a note, when there is one, has to hold as well. At 70% or more the letter fits; at 30% or less it is passed over; in between it is listed for the patron to read themselves. The choice between finishing one ask and spreading gifts is the patron's own explicit answer, so no model is asked about it.

Every question and both thresholds live in one file, `src/lib/questions.ts`. The lists a patron chooses from are in `src/lib/preferences.ts`, and the allocation rules in `src/lib/agent.ts`. No model chooses an amount, and no model writes the reasons: the patron sees the probabilities, the writer's own sentence, and what the amount pays for, taken from the letter's own figures.

This also settles what a hostile letter can do. Its text can move a probability. It cannot issue instructions, because nothing downstream reads instructions.

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
2. **TypeSafe.** Create a key at [console.typesafe.ai](https://console.typesafe.ai) and put it in `TYPESAFE_API_KEY`. It is used only when a patron sends the agent.

### Trying a payment

Under *Testing Tools → Sandbox Accounts* PayPal gives you a Personal account (the patron) and a Business account (a writer).

- **By hand:** open any letter, pick an amount, press the PayPal button, log in with the sandbox Personal account.
- **Direct to a writer:** post a letter at `/write` and give the sandbox Business account's email as the PayPal address. Gifts to that letter are created with that account as `payee`.
- **With the agent:** go to `/patron`, press *Fill in an example*, save, and approve a recommendation.

The eight letters that ship with the app are samples written for the demo and are labelled as such. They have no PayPal address, so a gift to one lands in the app's own sandbox account. Set `PAYPAL_PAYEE_MODE=platform` to route every gift that way.

## Deploy to Cloudflare

The app runs on Cloudflare Workers through the OpenNext adapter, with D1 for storage.

```bash
npx wrangler login
npx wrangler d1 create kindling        # put the printed database_id into wrangler.jsonc
npm run deploy                         # builds and deploys
npx wrangler secret put PAYPAL_CLIENT_ID
npx wrangler secret put PAYPAL_CLIENT_SECRET
npx wrangler secret put TYPESAFE_API_KEY
```

`npm run deploy` runs `scripts/deploy-cloudflare.mjs`. The adapter copies Next's `.env` files into the Worker, so the script moves `.env.local` aside during the build and passes only the public PayPal client ID through. Secrets reach the Worker through `wrangler secret` and nowhere else. The database table and the sample letters are created on the first request.

Daily allowances default to 300 agent runs and 40 new letters. Change them with the variables `DAILY_LIMIT_AGENT` and `DAILY_LIMIT_LETTERS`.

## How it is built

```
src/
  app/
    page.tsx                         the letterbox
    p/[id]/page.tsx                  one letter, with the give panel
    write/page.tsx                   write a letter and post it
    patron/page.tsx                  the patron's preferences and recommendations
    ledger/page.tsx                  every captured gift
    api/
      pitches/route.ts               post a letter
      agent/route.ts                 runs the agent, streams NDJSON events
      paypal/orders/route.ts         create an order for a gift
      paypal/orders/[orderId]/capture/route.ts
      interest/route.ts              ask a writer about investing
  lib/
    preferences.ts                   what a patron can choose: causes and a giving style
    questions.ts                     every question the agent asks Jev, and the thresholds
    agent.ts                         the rules that turn the answers into recommendations
    jev.ts                           client for TypeSafe's System One API
    paypal.ts                        Orders v2 over REST
    db.ts, seed.ts                   storage (D1 on Cloudflare, a JSON file locally) and sample letters
  components/
    PayPalButton.tsx                 PayPal JS SDK button
scripts/deploy-cloudflare.mjs        build and deploy without bundling local secrets
wrangler.jsonc, open-next.config.ts  Cloudflare Workers configuration
```

- **Next.js 16** (App Router), React 19, TypeScript. No CSS framework.
- **PayPal:** Orders v2 REST API on the server (`/v1/oauth2/token`, `/v2/checkout/orders`, `/v2/checkout/orders/{id}/capture`), the PayPal JS SDK button in the browser. Create and capture calls carry a `PayPal-Request-Id`, so a retry cannot charge twice.
- **AI:** [TypeSafe's Jev](https://docs.typesafe.ai), a System One decision model, through its HTTP API (`POST /v1/systemone`). One request per letter carries all of that letter's questions; a reading of eight letters takes a second or two. Letter writing uses no AI.
- **Storage:** Cloudflare D1 when deployed, one JSON file in `data/` when run locally (delete the folder to reset). Each record is its own row, and a letter's running total is changed in a single atomic statement, so two payments landing together cannot lose one.
- **Hosting:** Cloudflare Workers through `@opennextjs/cloudflare`.

## Known limits

- PayPal deducts its own fee from each gift, so the writer receives less than the patron sends (in the sandbox, $4.53 of a $5.00 gift). The ledger shows the amount sent.
- No accounts. A patron's name is whatever they type, and anyone can post a letter. Real use needs sign-in and identity checks on writers.
- A patron's preferences live in their browser's storage, so they do not follow the patron to another device, and the agent reads only when the patron opens the desk. Nothing runs in the background or notifies anyone.
- The list of causes is fixed and short. It was written to cover the sample letters, not drawn from real requests.
- The daily allowances are global counters, not per-visitor limits.
- The agent reads letters in English best. Letters are not translated, and its questions have only been tried on the sample letters.
- A probability is not a verdict. The 70% and 30% thresholds are starting points, not values tuned on real outcomes. The same letter and preferences usually came back a few points apart on different runs, and once 18 points apart (56% and 74%), so a letter near a threshold can land on either side.
- Capture is confirmed in the request that follows approval. A production build should also listen for the `PAYMENT.CAPTURE.COMPLETED` webhook, so a closed browser tab cannot leave a paid gift unrecorded.
- Nothing here has been reviewed for the rules that apply to fundraising platforms.

## Licence

MIT. See [LICENSE](LICENSE).
