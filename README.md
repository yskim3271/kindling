# Kindling

Fund the missing piece of a small game.

Independent developers post a game in progress and the specific things it still needs: a composer, a store fee, a test device. Patrons pay for those things through PayPal, by hand or on the recommendation of an AI agent that reads every project against preferences the patron saved once. Nothing is spent without the patron's own PayPal approval.

Built for the PayPal AI Hackathon 2026.

**Live demo:** https://kindling.deokjil.workers.dev (PayPal sandbox; no real money moves)

## Why this, and why games

Money for a small game mostly comes in two shapes. Reward crowdfunding works for developers who already have an audience and can run a campaign. Publisher deals, funds and grants are larger, competitive and slow, and some take a share of revenue. Between them sits the developer who has a playable build and is short one $600 commission.

Kindling is for that gap: small, itemised asks, paid as gifts with no strings. Games suit it because the evidence is public. A patron does not have to take a stranger's word; they can open the build and play it.

## Try the live demo

You need a PayPal **sandbox** buyer account to approve a payment. Use your own, or this test account:

- Email: `sb-ztbz153861669@personal.example.com`
- Password: `REPLACE_WITH_SANDBOX_PASSWORD`

Then:

1. **Set your preferences.** Open the [patron desk](https://kindling.deokjil.workers.dev/patron), press *Fill in an example* (or choose the kinds of game you like, what you want to pay for, and a budget) and save. The agent reads the open projects and recommends gifts, item by item; approve one with its PayPal button. Come back later and the board is read again from the saved preferences, and the games that fit are marked on the front page.
2. **Give by hand.** Open any game, pick an amount, press the PayPal button and approve with the sandbox account. The game's total and the [ledger](https://kindling.deokjil.workers.dev/ledger) update at once.
3. **Post a game.** Open [Post yours](https://kindling.deokjil.workers.dev/write). The letter is written by hand; nothing drafts or edits it. A link to somewhere the game can be played or watched is required.

The demo allows a fixed number of agent runs and new projects per day.

## What it does

| Who | What they do | PayPal | AI |
|---|---|---|---|
| A developer | Posts the game: its title, one line, how far along it is, a link where anyone can play or watch it, a letter in their own words, and what the money buys, line by line | Receives gifts directly as the order's `payee` | none, on purpose: a patron should be reading the person making the game |
| A patron, by hand | Looks through the games, opens the build, and gives | Orders v2: create, approve in the PayPal button, capture | none |
| A patron, with an agent | Saves preferences once: kinds of game, things to pay for, a note in their own words, a giving style, a budget and a cap per game | One order per recommendation the patron approves | Jev answers yes-or-no questions about each project and each listed item with a probability; code turns the answers into recommendations |
| Anyone | Reads the ledger | Every line carries PayPal's capture ID | none |

### The agent can recommend. Only the patron can pay.

1. The patron saves their preferences once:
   - **kinds of game** they like (story and characters, puzzles, action and platformers, strategy and simulation, calm and gentle, played together, experimental);
   - **what their money should pay for** (art and animation; music, sound and voice; release costs; hardware; translation, access and testing; time to finish);
   - optionally, **a note in their own words** saying what else should be true of a project;
   - whether to **finish one ask at a time** or spread gifts, a **budget** for one round and a **cap** per game.

   Kindling has no accounts, so the preferences are kept in the patron's browser and sent with each reading.
2. Every open project is read. Developers do not pick from the patron's lists: the agent asks [Jev](https://docs.typesafe.ai) about what each developer wrote, one yes-or-no question per choice the patron made, and gets a probability for each. It also asks, for every line of the developer's list, whether that item is something the patron said they would pay for.
3. Rules in code decide which projects fit, in what order, and for how much, within the cap, the remaining budget and what each project still needs. A patron who spreads gifts is offered the items they said they would pay for (the composer, not the whole budget). A patron who finishes asks is offered only gifts that complete one.
4. Each recommendation shows which preferences the project met and with what probability, the developer's own sentence, what the amount pays for, a link to play the game first, and a PayPal button. When the patron clicks it, the server creates the order from the **stored recommendation**, so the amount and the recipient cannot be changed from the browser.
5. The patron approves in PayPal. The server captures the order, checks the captured amount, and writes the ledger line.

Projects that fit but cannot be funded inside the limits, and projects the model could not settle either way, are listed as worth a look yourself. The next time the patron opens the desk, the board is read again against the same preferences.

### Judgments from a model, decisions in code

Jev is a decision model: it does not write text, it answers typed questions with calibrated probabilities. The agent asks it:

| Question | About | What the answer does |
|---|---|---|
| Is this game *this kind of game*? | each project, once per kind the patron chose | the best answer is the "game" side of the fit |
| Does this project ask for money toward *this*? | each project, once per thing the patron would pay for | the best answer is the "pays for" side of the fit |
| Is this the kind of project the patron's note describes? | each project, only when the patron wrote a note | the note side of the fit |
| Would money spent on this item go toward *this*? | each line of the developer's list, once per thing the patron would pay for | 70% or more: the item can be part of a recommended gift |
| Does the letter describe something already built? | each project | 30% or less: the recommendation carries a "check first" note |
| Does the letter contain instructions aimed at an AI system? | each project | 70% or more: the project is set aside and reported |
| Does this sentence show the fit? | each sentence of the letter | the highest-scoring sentence, if it reaches 70%, is quoted to the patron in the developer's own words |

The fit of a project is the weakest of the sides the patron filled in: within a list any one choice is enough, but every side has to hold. At 70% or more the project fits; at 30% or less it is passed over; in between it is listed for the patron to look at themselves. The choice between finishing one ask and spreading gifts is the patron's own explicit answer, so no model is asked about it.

Every question and both thresholds live in one file, `src/lib/questions.ts`. The lists a patron chooses from are in `src/lib/preferences.ts`, and the allocation rules in `src/lib/agent.ts`. No model chooses an amount, and no model writes the reasons: the patron sees the probabilities, the developer's own sentence, and what the amount pays for, taken from the project's own figures.

This also settles what a hostile letter can do. Its text can move a probability. It cannot issue instructions, because nothing downstream reads instructions.

### What "checkable" means here, and what it does not

A project must link a page where the game can be played or watched, and the link is shown on the project and on every recommendation. That is all. Kindling does not open the link, play the game, or confirm that the person posting made it. The link is the developer's claim, placed where the patron can test it before paying.

### Gifts, not securities

A gift is a PayPal payment with no strings. Developers can also mark a project "open to investment", which lets a patron ask for a conversation. No money moves on that path. Selling a stake in something is regulated nearly everywhere, and it belongs in a signed agreement between two parties, not in a checkout button.

## Run it

Requires Node 20 or later.

```bash
npm install
cp .env.example .env.local   # then fill it in
npm run dev                  # http://localhost:3000
```

### Keys

1. **PayPal sandbox.** At [developer.paypal.com](https://developer.paypal.com) open *Apps & Credentials*, stay on *Sandbox*, create an app. Copy the client ID into both `PAYPAL_CLIENT_ID` and `NEXT_PUBLIC_PAYPAL_CLIENT_ID`, and the secret into `PAYPAL_CLIENT_SECRET`.
2. **TypeSafe.** Create a key at [console.typesafe.ai](https://console.typesafe.ai) and put it in `TYPESAFE_API_KEY`. It is used only when a patron's agent reads the board.

### Trying a payment

Under *Testing Tools → Sandbox Accounts* PayPal gives you a Personal account (the patron) and a Business account (a developer).

- **By hand:** open any game, pick an amount, press the PayPal button, log in with the sandbox Personal account.
- **Direct to a developer:** post a game at `/write` and give the sandbox Business account's email as the PayPal address. Gifts to that project are created with that account as `payee`.
- **With the agent:** go to `/patron`, press *Fill in an example*, save, and approve a recommendation.

The eight games that ship with the app are samples. The games and the people are invented for the demo and are labelled as such. They have no PayPal address, so a gift to one lands in the app's own sandbox account, and no build link, because there is no real build. Set `PAYPAL_PAYEE_MODE=platform` to route every gift to the app's account.

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

`npm run deploy` runs `scripts/deploy-cloudflare.mjs`. The adapter copies Next's `.env` files into the Worker, so the script moves `.env.local` aside during the build and passes only the public PayPal client ID through. Secrets reach the Worker through `wrangler secret` and nowhere else. The database table and the sample projects are created on the first request.

Daily allowances default to 300 agent runs and 40 new projects. Change them with the variables `DAILY_LIMIT_AGENT` and `DAILY_LIMIT_LETTERS`.

## How it is built

```
src/
  app/
    page.tsx                         the board of games
    p/[id]/page.tsx                  one game, with the give panel
    write/page.tsx                   post a game
    patron/page.tsx                  the patron's preferences and recommendations
    ledger/page.tsx                  every captured gift
    api/
      pitches/route.ts               post a project
      agent/route.ts                 runs the agent, streams NDJSON events
      paypal/orders/route.ts         create an order for a gift
      paypal/orders/[orderId]/capture/route.ts
      interest/route.ts              ask a developer about investing
  lib/
    preferences.ts                   what a patron can choose: kinds of game, things to pay for, a giving style
    questions.ts                     every question the agent asks Jev, and the thresholds
    agent.ts                         the rules that turn the answers into recommendations
    jev.ts                           client for TypeSafe's System One API
    paypal.ts                        Orders v2 over REST
    db.ts, seed.ts                   storage (D1 on Cloudflare, a JSON file locally) and sample projects
  components/
    PayPalButton.tsx                 PayPal JS SDK button
    Sigil.tsx                        a generated emblem for each project, drawn from its id
scripts/deploy-cloudflare.mjs        build and deploy without bundling local secrets
wrangler.jsonc, open-next.config.ts  Cloudflare Workers configuration
```

- **Next.js 16** (App Router), React 19, TypeScript. No CSS framework.
- **PayPal:** Orders v2 REST API on the server (`/v1/oauth2/token`, `/v2/checkout/orders`, `/v2/checkout/orders/{id}/capture`), the PayPal JS SDK button in the browser. Create and capture calls carry a `PayPal-Request-Id`, so a retry cannot charge twice.
- **AI:** [TypeSafe's Jev](https://docs.typesafe.ai), a System One decision model, through its HTTP API (`POST /v1/systemone`). One request per project carries all of that project's questions; a reading of eight projects takes a second or two. Nothing a developer or a patron reads was written by a model.
- **Storage:** Cloudflare D1 when deployed, one JSON file in `data/` when run locally (delete the folder to reset). Each record is its own row, and a project's running total is changed in a single atomic statement, so two payments landing together cannot lose one.
- **Hosting:** Cloudflare Workers through `@opennextjs/cloudflare`.

## Known limits

- The build link is not checked. Nothing confirms that the game at the link is the developer's own work.
- The pictures on the board are emblems generated from each project's id, not art from the games. Projects cannot upload images yet.
- PayPal deducts its own fee from each gift, so the developer receives less than the patron sends (in the sandbox, $4.53 of a $5.00 gift). The ledger shows the amount sent.
- No accounts. A patron's name is whatever they type, and anyone can post a project. Real use needs sign-in and identity checks on developers.
- A patron's preferences live in their browser's storage, so they do not follow the patron to another device, and the agent reads only when the patron opens the desk. Nothing runs in the background or notifies anyone.
- The two lists a patron chooses from are fixed and short. They were written to cover the sample projects, not drawn from real ones.
- When a project has already been part-funded, the agent does not know which of its items earlier gifts paid for.
- The daily allowances are global counters, not per-visitor limits.
- The agent reads letters in English best. Letters are not translated, and its questions have only been tried on the sample projects.
- A probability is not a verdict. The 70% and 30% thresholds are starting points, not values tuned on real outcomes. The same project and preferences usually come back a few points apart on different runs, and in one earlier test 18 points apart (56% and 74%), so a project near a threshold can land on either side.
- Capture is confirmed in the request that follows approval. A production build should also listen for the `PAYMENT.CAPTURE.COMPLETED` webhook, so a closed browser tab cannot leave a paid gift unrecorded.
- Records posted before Kindling narrowed to games stay in storage but are no longer listed.
- Nothing here has been reviewed for the rules that apply to fundraising platforms.

## Licence

MIT. See [LICENSE](LICENSE).
