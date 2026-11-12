import type { Pitch } from "./types";

/**
 * Sample projects so the board and the patron's agent have something to read.
 * Every one is flagged `sample: true` and labelled in the UI. The games and the
 * people are invented for the demo. They carry no PayPal email, so a gift to
 * one of them lands in the app's own sandbox account, and no build link,
 * because there is no real build to link to.
 */
type Seed = Omit<Pitch, "raisedUsd" | "sample" | "createdAt"> & { daysAgo: number };

const seeds: Seed[] = [
  {
    id: "tidewrit",
    title: "Tidewrit",
    headline: "A hand-inked diving game where you read the sea floor like a letter",
    author: "Seo Haneul",
    location: "Busan, South Korea",
    summary:
      "You dive, sketch what you find, and piece together who lived in a drowned town. Four of seven dives are playable. It needs a composer and the store fee.",
    body: "I worked on harbour survey boats for six years, and Tidewrit is the game I kept imagining on the long shifts. You go down with a lamp and a notebook. Everything you look at for long enough gets inked into the notebook, and the pages are how you solve the town: who owned the cannery, why the bell was moved, what the last winter was like.\n\nI am making it alone. Four of the seven dives are finished and playable from start to end, about ninety minutes together, and forty people played that build at a local festival in September. All the drawing is mine, done with a brush pen and scanned.\n\nWhat I cannot do is music. The dives are silent right now except for breathing and water, and players told me the quiet works for ten minutes and then starts to feel unfinished. A composer I trust has quoted me for twenty minutes of music. The rest is the fee to put the game on Steam and a second-hand hydrophone so the water sounds are recorded and not downloaded.",
    stage: "demo",
    genres: ["exploration", "puzzle", "narrative"],
    askUsd: 1150,
    useOfFunds: [
      { item: "Composer, twenty minutes of original music", amountUsd: 800 },
      { item: "Steam Direct fee", amountUsd: 100 },
      { item: "Second-hand hydrophone and recorder", amountUsd: 250 },
    ],
    openToInvestment: false,
    daysAgo: 1,
  },
  {
    id: "foldline",
    title: "Foldline",
    headline: "Lay railway track across a paper map, then fold the map to make it shorter",
    author: "Estúdio Dobra",
    location: "Porto, Portugal",
    summary:
      "A calm route-building puzzle with sixty finished levels. We are two people. It needs translating into three languages and one round of paid playtesting before release.",
    body: "Foldline is a puzzle game about trains and origami. Each level is a sheet of paper with towns printed on it. You draw track between them, and when the track is too long for your budget you crease the paper and fold two towns next to each other. There is no timer and nothing can go wrong; you can unfold and try again as often as you like.\n\nWe are two people, Inês on design and code and Rui on art. Sixty levels are done and the game has been playable end to end since the summer. We release in the spring.\n\nTwo things stand between the build we have and the one we want to sell. A third of the people who wishlisted the game read Japanese, Korean or Brazilian Portuguese, and the game has about four thousand words of text that only exist in English. And nobody outside our friends has played the last twenty levels, which is where puzzle games usually go wrong. We want to pay twelve strangers for an afternoon each and watch where they get stuck.",
    stage: "polish",
    genres: ["puzzle", "relaxing", "trains"],
    askUsd: 1260,
    useOfFunds: [
      { item: "Translation into Japanese, Korean and Brazilian Portuguese", amountUsd: 780 },
      { item: "Twelve paid playtesters, one afternoon each", amountUsd: 360 },
      { item: "Proofreading of the translated text in the build", amountUsd: 120 },
    ],
    openToInvestment: false,
    daysAgo: 2,
  },
  {
    id: "kestrel-station",
    title: "Kestrel Station Is Not Answering",
    headline: "You are the night operator at a radio relay, and one of the voices is lying",
    author: "Marguerite Okoye",
    location: "Winnipeg, Canada",
    summary:
      "A horror story told entirely through radio calls. The script is written and the first chapter runs in a prototype. It needs voice actors before it can be judged at all.",
    body: "Kestrel Station is a story game played on one screen: a relay desk with six channels. Ships, a weather post and a lighthouse call in through the night, and you decide who to patch through to whom. Somewhere in the second hour you work out that one caller has been dead since before your shift began.\n\nI write for radio drama, and this is my first game. The whole script exists, about thirty thousand words, and the first of five chapters runs in a prototype I built myself. Right now every voice in it is me doing accents badly into a laptop microphone.\n\nThat is the problem. A game made of voices cannot be tested with placeholder voices; nobody can tell me whether it is frightening. I plan to cast five actors from the radio drama company I work with, record chapter one properly, and then put that chapter out as a free demo. After that I will know whether to finish it.",
    stage: "prototype",
    genres: ["horror", "narrative", "audio"],
    askUsd: 900,
    useOfFunds: [
      { item: "Five voice actors, one recording day for chapter one", amountUsd: 650 },
      { item: "Studio hire for the recording day", amountUsd: 180 },
      { item: "Audio editing licence, one year", amountUsd: 70 },
    ],
    openToInvestment: false,
    daysAgo: 3,
  },
  {
    id: "gutter-kings",
    title: "Gutter Kings",
    headline: "Four-player street football where the pitch is whatever road you are standing on",
    author: "Chidi Balogun",
    location: "Lagos, Nigeria",
    summary:
      "A loud local-multiplayer football brawler. Three pitches and eight players are in and it has been shown at two events. It needs controllers and a booth to keep testing with crowds.",
    body: "We grew up playing football between parked buses with two stones for a goal. Gutter Kings is that game: two against two, the ball bounces off market stalls, a danfo drives through the pitch every forty seconds and whoever is in the way loses the ball. A match lasts three minutes and people shout the whole time.\n\nThree of us make it after work. Three pitches and eight characters are playable, and we have run it at two game nights in Yaba where the queue did not stop for four hours. We learn more from one night of strangers playing than from a month at our desks.\n\nThe trouble is that the game needs four controllers and we own two, both borrowed, one with a dead stick. The next public event that will have us charges for the table. Everything on this list is so that we can keep putting the game in front of crowds until it is good.",
    stage: "demo",
    genres: ["sports", "local multiplayer", "party"],
    askUsd: 540,
    useOfFunds: [
      { item: "Four wired controllers", amountUsd: 180 },
      { item: "Booth fee at the Lagos games weekend", amountUsd: 240 },
      { item: "Powered USB hub, cables and a spare monitor stand", amountUsd: 120 },
    ],
    openToInvestment: true,
    daysAgo: 5,
  },
  {
    id: "small-hours-bakery",
    title: "Small Hours Bakery",
    headline: "Run a bakery between midnight and dawn, one batch at a time",
    author: "Lê Thu Trang",
    location: "Hanoi, Vietnam",
    summary:
      "A gentle management game for phones. The bakery loop works and twenty recipes are in. It needs a pixel artist for the pastries and the two store developer accounts.",
    body: "My parents had a bakery and I did my homework at the flour table. Small Hours Bakery is a phone game about those hours: you proof, you bake, the night bus driver comes in at two and the nurses at five, and you learn what each of them wants before they ask. Nobody fails. A bad batch just becomes tomorrow's breadcrumbs.\n\nI am a programmer, and the game underneath is finished enough to play for a week: ordering, proofing times, regulars who remember what you sold them, twenty recipes. I have been playing it on my own phone every night for two months.\n\nWhat it does not have is anything nice to look at. Every pastry is a brown square I drew myself. I have found a pixel artist whose food sprites make me hungry, and she has quoted me for forty pastries and the shop interior. The other two lines are the developer accounts I need before either store will let me upload a test build.",
    stage: "production",
    genres: ["management", "cozy", "mobile"],
    askUsd: 724,
    useOfFunds: [
      { item: "Pixel artist: forty pastry sprites and the shop interior", amountUsd: 600 },
      { item: "Apple Developer Program, one year", amountUsd: 99 },
      { item: "Google Play developer registration", amountUsd: 25 },
    ],
    openToInvestment: false,
    daysAgo: 6,
  },
  {
    id: "slingshot-year",
    title: "Slingshot Year",
    headline: "Plan one probe's trip past four planets, and watch the orbits prove you wrong",
    author: "Wanjiru Kamau",
    location: "Nairobi, Kenya",
    summary:
      "A strategy game about real orbital mechanics, meant for classrooms as much as for players. So far it is a design and a small physics test. It needs a computer that can run it.",
    body: "I teach physics to sixteen-year-olds, and every year the gravity-assist lesson is the one where I lose the room. Slingshot Year is my attempt to fix that. You get one probe, a launch window and a fuel budget, and you plan a tour of the outer planets by choosing when to burn. Then the year plays out and you see where you actually went.\n\nI have to be plain about where this is. There is a forty-page design, and a physics test I wrote that moves a dot around a sun correctly. There is no game to play yet. I intend to build the first playable mission over the long school break, and my students have agreed to be the testers.\n\nThe obstacle is that my laptop is ten years old and cannot run the engine I am learning. I am not asking for anything but the machine and the one textbook I keep borrowing from the university library.",
    stage: "prototype",
    genres: ["strategy", "simulation", "educational"],
    askUsd: 610,
    useOfFunds: [
      { item: "Refurbished laptop with a dedicated graphics card", amountUsd: 540 },
      { item: "Textbook on orbital mechanics", amountUsd: 70 },
    ],
    openToInvestment: false,
    daysAgo: 8,
  },
  {
    id: "dustjacket",
    title: "Dustjacket",
    headline: "Repair damaged books by touch and sound, with the screen off if you like",
    author: "Tomasz Wieczorek",
    location: "Kraków, Poland",
    summary:
      "An experimental game about book restoration that can be played without sight. Two books are playable. It needs an accessibility consultant and blind playtesters who are paid for their time.",
    body: "Dustjacket came out of a question a friend asked me. She is blind, she loves games about patient work, and almost none of them can be played without seeing. So I am making one that starts from sound and touch and adds pictures second. You restore old books: you find the torn page by the noise it makes, you feel for the grain of the paper through the controller, you mend the spine by rhythm.\n\nTwo books are playable now, about twenty minutes each, and my friend has finished both with the screen turned off. I think no other game has tried to work this way, and that is exactly why I do not trust my own judgment of it.\n\nI need people who know more than I do. An accessibility consultant who works with screen-reader users has offered two review sessions. And I want to pay eight blind and low-vision players properly to test the next three books, because asking disabled people to do unpaid testing is how inaccessible games get made.",
    stage: "demo",
    genres: ["experimental", "audio", "accessibility"],
    askUsd: 880,
    useOfFunds: [
      { item: "Accessibility consultant, two review sessions", amountUsd: 400 },
      { item: "Eight blind and low-vision playtesters, paid", amountUsd: 400 },
      { item: "Controller with advanced haptics for development", amountUsd: 80 },
    ],
    openToInvestment: false,
    daysAgo: 10,
  },
  {
    id: "brine-and-thistle",
    title: "Brine & Thistle",
    headline: "A fast, hand-animated platformer about a lighthouse keeper outrunning the tide",
    author: "Coletivo Maré",
    location: "Recife, Brazil",
    summary:
      "Twelve of fifteen levels are done and every frame is drawn by hand. Release is three months out. It needs a trailer, a handheld to test on, and wages for the animator's last month.",
    body: "Brine & Thistle is a platformer you play at a sprint. The tide comes in from the left of the screen and never stops, and you run, climb and swing ahead of it through a drowned coast. Every frame of the keeper is drawn on paper by Bia, our animator: the run cycle alone is twenty-four drawings.\n\nThere are four of us, and we have been at this for two years of evenings. Twelve of the fifteen levels are finished and a demo with the first three has been downloaded eleven thousand times. We have a release date three months from now.\n\nThe last stretch needs money we do not have. Bia has to stop taking other work for a month to animate the final boss, and we want to pay her for it. Nobody has seen the game move unless they played it, so we need an editor to cut a trailer. And a lot of players will be on a handheld we do not own and have never tested on.",
    stage: "polish",
    genres: ["platformer", "action", "hand-drawn"],
    askUsd: 2350,
    useOfFunds: [
      { item: "Animator's wages for the final month", amountUsd: 1500 },
      { item: "Trailer editor", amountUsd: 450 },
      { item: "Handheld PC for compatibility testing", amountUsd: 400 },
    ],
    openToInvestment: true,
    daysAgo: 12,
  },
];

export function seedPitches(now = Date.now()): Pitch[] {
  return seeds.map(({ daysAgo, ...seed }) => {
    const pitch: Pitch = {
      ...seed,
      raisedUsd: 0,
      sample: true,
      createdAt: new Date(now - daysAgo * 86_400_000).toISOString(),
    };
    return pitch;
  });
}
