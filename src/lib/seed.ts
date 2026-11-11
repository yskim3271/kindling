import type { Pitch } from "./types";

/**
 * Sample letters so the feed and the patron agent have something to read.
 * Every one is flagged `sample: true` and labelled in the UI. They are
 * invented for the demo and carry no PayPal email, so a gift to one of them
 * lands in the app's own sandbox account.
 */
type Seed = Omit<Pitch, "raisedUsd" | "sample" | "createdAt"> & { daysAgo: number };

const seeds: Seed[] = [
  {
    id: "amara-nursing-final-year",
    kind: "story",
    author: "Amara Nwosu",
    location: "Enugu, Nigeria",
    headline: "One term of fees stands between me and a nursing licence",
    summary:
      "I am in the last term of a three-year nursing programme and I owe the school a balance I cannot cover. If it is not paid by the exam date, I sit out a full year.",
    body: "My mother sold fabric at Ogbete market for most of my life. She paid for my first two years of nursing school out of that stall, one bale at a time. Last March the stall burned with forty others, and since then I have been paying my own way by working night shifts as a ward attendant.\n\nI have paid everything except the final term. The school will not release an exam card with a balance outstanding, and the licensing exam is held once a year. Missing it means twelve more months as an attendant doing the same work a nurse does, for a third of the pay.\n\nI am not asking for a new life. I am asking for the last stretch of the one I have already built. The ward sister who supervises me has offered to write to anyone who wants to check that I am who I say I am.",
    askUsd: 640,
    useOfFunds: [
      { item: "Final-term tuition balance", amountUsd: 480 },
      { item: "Licensing exam registration", amountUsd: 110 },
      { item: "Transport to the exam centre in Abuja", amountUsd: 50 },
    ],
    tags: ["education", "healthcare", "west-africa"],
    openToInvestment: false,
    daysAgo: 2,
  },
  {
    id: "chau-braille-label-printer",
    kind: "project",
    author: "Trần Minh Châu",
    location: "Da Nang, Vietnam",
    headline: "A braille label printer that costs less than a pair of shoes",
    summary:
      "I built a hand-fed braille embosser from printer scrap and a microcontroller. Three blind neighbours use the prototype daily. I want to build ten more and publish the plans.",
    body: "My aunt lost her sight at fifty-one and stopped cooking, because she could no longer tell the fish sauce from the vinegar. Commercial braille labellers sold here cost more than a month of her pension.\n\nI teach electronics at a vocational college. Over two semesters my students and I built an embosser from a scrapped inkjet carriage, six solenoids and a small controller board. You type on a phone, feed in a strip of plastic tape, and it punches the label. Parts for one unit come to about ninety dollars.\n\nThree people on my street use the prototype now. They label medicine, spice jars, and the remote control. I want to build ten more units for the blind association in Da Nang, fix the tape jam that happens in humid weather, and publish every file under an open licence so that anyone with a soldering iron can make one.\n\nIf someone wants to help this become a small business rather than a hobby, I would like that conversation too.",
    askUsd: 1800,
    useOfFunds: [
      { item: "Parts for ten units", amountUsd: 900 },
      { item: "Redesigned tape feed, three prototype rounds", amountUsd: 450 },
      { item: "Student stipends for assembly", amountUsd: 300 },
      { item: "Braille proofreading by association members", amountUsd: 150 },
    ],
    tags: ["hardware", "accessibility", "open-source", "southeast-asia"],
    openToInvestment: true,
    daysAgo: 4,
  },
  {
    id: "lucia-bus-data",
    kind: "opinion",
    author: "Lucía Fernández",
    location: "Rosario, Argentina",
    headline: "Cities should publish bus arrivals the way they publish the weather",
    summary:
      "Public transport data is collected with public money and then locked inside a contractor's app. I want to file the records requests and build the open feed my city refuses to.",
    body: "Every bus in Rosario carries a GPS unit paid for by the municipality. The positions go to a private contractor, who shows them in one app, with adverts, and to nobody else. A blind rider cannot use that app. A researcher cannot study it. A competing app cannot exist.\n\nThe argument I want to make, in print and in front of the city council, is simple: location data from publicly funded vehicles is a public record, and it should be published in an open format the day it is collected. Weather services have worked this way for decades and nobody thinks it is radical.\n\nI am a transport reporter. I have the records law on my side and no budget to use it. The money pays for filing fees, a lawyer's review of the appeal I expect to need, and a small server to republish whatever I get.",
    askUsd: 400,
    useOfFunds: [
      { item: "Records request and appeal filing fees", amountUsd: 90 },
      { item: "Two hours of legal review", amountUsd: 220 },
      { item: "One year of hosting for the open feed", amountUsd: 90 },
    ],
    tags: ["journalism", "open-data", "cities", "latin-america"],
    openToInvestment: false,
    daysAgo: 5,
  },
  {
    id: "jiwoo-welding-certificate",
    kind: "story",
    author: "Park Jiwoo",
    location: "Daegu, South Korea",
    headline: "I left a welding course to care for my grandmother. I want to finish it.",
    summary:
      "I was four months into a six-month welding certification when my grandmother had a stroke. She is stable now, and the course will take me back if I can pay for the remaining module and the test.",
    body: "I am twenty-six, and my grandmother raised me. Last autumn I was four months into a welding certification course when she collapsed. I left the course and became her carer.\n\nShe has recovered enough to attend a day-care centre now. The school says I can receive the certificate if I complete the remaining two months and pass the practical test. The trouble is that the tuition refund I received when I left has already gone on her care.\n\nWith the certificate I can earn nearly twice what I make on night shifts at a convenience store, and keep looking after her. I need the fee for the remaining module, the exam fee, and the cost of safety boots and protective gear.",
    askUsd: 900,
    useOfFunds: [
      { item: "Remaining two-month course module", amountUsd: 620 },
      { item: "Practical exam fee", amountUsd: 90 },
      { item: "Safety boots, gloves and helmet", amountUsd: 190 },
    ],
    tags: ["trades", "caregiving", "east-asia"],
    openToInvestment: false,
    daysAgo: 6,
  },
  {
    id: "kwame-solar-cold-box",
    kind: "project",
    author: "Kwame Mensah",
    location: "Kumasi, Ghana",
    headline: "A solar cold box so fish sellers stop throwing away the afternoon catch",
    summary:
      "Women who sell fish at Kejetia lose roughly a third of their stock to heat. I have a working insulated box with a solar-run compressor and want to put six on the market floor for a season.",
    body: "By two in the afternoon, a fish seller at Kejetia has a choice: cut the price in half or carry the fish home to smoke it. Ice is sold by the block and melts before lunch.\n\nI repair refrigerators. Last year I built an insulated box around a small DC compressor, a panel and a used lithium pack. It holds four degrees for nine hours on a clear day and six on a cloudy one. My sister has sold from it since January and has not discounted fish once.\n\nI want to build six boxes and rent them by the day to sellers on the market floor for one season, so I can find out what people will pay and what breaks. If the numbers work, this is a rental business. If they do not, the sellers keep the boxes.",
    askUsd: 2400,
    useOfFunds: [
      { item: "Compressors, panels and battery packs for six boxes", amountUsd: 1620 },
      { item: "Insulated shells, welded locally", amountUsd: 480 },
      { item: "Temperature loggers to measure real performance", amountUsd: 120 },
      { item: "Market floor permits for one season", amountUsd: 180 },
    ],
    tags: ["hardware", "food", "small-business", "west-africa", "energy"],
    openToInvestment: true,
    daysAgo: 8,
  },
  {
    id: "ines-arabic-math-videos",
    kind: "project",
    author: "Ines Haddad",
    location: "Tunis, Tunisia",
    headline: "Secondary-school maths, explained in Tunisian Arabic, free",
    summary:
      "I record maths lessons on my phone in the dialect students actually speak. I have posted 140 videos. A proper microphone and a drawing tablet would let me cover the full baccalaureate syllabus.",
    body: "The baccalaureate maths syllabus here is taught in French. Many of my students think in Tunisian Arabic and translate twice before they reach the mathematics. Private tutoring fixes this for families who can pay for it.\n\nI am a secondary-school teacher. For two years I have recorded short lessons on my phone, propped against a stack of textbooks, in the language my students use at home. There are 140 of them online and they are free.\n\nThe sound is poor and I write on paper under a desk lamp. A microphone and a drawing tablet would let me record the remaining third of the syllabus this summer, before the next exam year begins.",
    askUsd: 350,
    useOfFunds: [
      { item: "USB condenser microphone", amountUsd: 110 },
      { item: "Drawing tablet", amountUsd: 190 },
      { item: "External drive for the lesson archive", amountUsd: 50 },
    ],
    tags: ["education", "language", "north-africa"],
    openToInvestment: false,
    daysAgo: 9,
  },
  {
    id: "daniyar-laptop",
    kind: "story",
    author: "Daniyar Sadykov",
    location: "Almaty, Kazakhstan",
    headline: "My laptop died two weeks into my first paid programming contract",
    summary:
      "I taught myself to program on a nine-year-old laptop. It failed in the middle of my first freelance contract, and I am finishing the work from an internet café.",
    body: "I drove a delivery van for five years and learned to program at night. In September I got my first contract, building an inventory tool for a furniture workshop. Two weeks in, the laptop's board failed. The repair shop says it is not worth fixing.\n\nI am finishing the job from an internet café near the bazaar, paying by the hour, on a machine that erases itself every night. The client has been patient, but the contract ends in a month and the second half of my fee depends on delivery.\n\nA refurbished laptop is all I need. With it I finish this contract, and the workshop owner has already said his brother needs the same tool.",
    askUsd: 520,
    useOfFunds: [
      { item: "Refurbished laptop, 16 GB memory", amountUsd: 460 },
      { item: "Café hours until it arrives", amountUsd: 60 },
    ],
    tags: ["software", "career-change", "central-asia"],
    openToInvestment: false,
    daysAgo: 11,
  },
  {
    id: "maya-teen-tutors",
    kind: "opinion",
    author: "Maya Okafor-Reyes",
    location: "Oakland, United States",
    headline: "Pay sixteen-year-olds to tutor eight-year-olds, and both get better at reading",
    summary:
      "Schools pay adult tutors who are hard to hire and harder to keep. I want to run one semester that pays high-school students instead, and publish what happens to both groups' reading scores.",
    body: "Every district I have worked in has money set aside for tutoring and cannot spend it, because there are not enough adults willing to do the job for what it pays. Meanwhile there is a high school four blocks from nearly every elementary school.\n\nMy argument is that teenagers are the tutoring workforce we already have. They are close by, they are free at three o'clock, and an hourly wage means more to them than to a graduate student. There is older research suggesting the tutor learns as much as the child. Almost nobody has tested it with paid teenagers and a control group.\n\nI coordinate literacy programmes for a district. I can get the classrooms and the permission. What I cannot get from a public budget is wages for minors in a pilot nobody has approved yet. Twelve tutors, two afternoons a week, one semester, and I will publish the scores whether or not they flatter the idea.",
    askUsd: 1200,
    useOfFunds: [
      { item: "Wages for twelve student tutors, one semester", amountUsd: 960 },
      { item: "Reading assessments, before and after", amountUsd: 150 },
      { item: "Books for the sessions", amountUsd: 90 },
    ],
    tags: ["education", "research", "youth", "north-america"],
    openToInvestment: false,
    daysAgo: 13,
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
