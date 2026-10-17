# Kenya Election Insights — Node.js website

A nonpartisan website for reviewing Kenya's published opinion polls, economic indicators, development announcements, and voluntary citizen feedback. It supports civic understanding and does not calculate candidate electability, rank politicians, or predict a winner.

## Included
- Responsive overview/dashboard
- Published polls with dates, sample/method details and caveats
- Economy indicators and development tracker
- Source/methodology page
- Voluntary citizen survey form
- Optional MongoDB Atlas storage for survey responses
- Express, EJS, Bootstrap, Helmet and rate limiting
- Sample data with source links (reviewed 13 October 2026)

## Run on Windows + Visual Studio Code
1. Extract this ZIP.
2. Open the `Kenya-Election-Insights` folder in VS Code.
3. Terminal → New Terminal.
4. Run `npm install`.
5. Copy `.env.example` to `.env`.
6. Leave `MONGODB_URI` blank to explore sample pages. Survey responses will not be stored in this mode.
7. Run `npm run dev` (or `npm start`).
8. Open `http://localhost:3000`.

## Optional MongoDB Atlas setup
1. In Atlas, create a database user and allow your development IP in Network Access.
2. Choose Connect → Drivers → Node.js and copy the URI.
3. Put it in `.env` as `MONGODB_URI=...`, replacing the password placeholder. Keep `.env private and never commit it.
4. Restart the server and open `http://localhost:3000/health`. It should say database connected.
5. Survey form only reports a successful save when MongoDB confirms it.
The `/survey-results` page shows live aggregate counts and percentages for saved answers.
After a response is saved, the form redirects there so participants can see the updated
results immediately. The page is also linked in the main navigation. Responses are
voluntary and self-selected, not representative estimates of Kenyan opinion.

## Google AdSense website ads
AdSense support is included for the website. AdMob requires a separate mobile app.
In `.env`, set `ADSENSE_CLIENT_ID` to your publisher ID (`pub-` plus 16 digits, or
`ca-pub-` plus 16 digits). Set `ADSENSE_ENABLED=true` to load AdSense on content pages,
then restart the server. For Auto ads, enable Auto ads for your site in your AdSense
account and leave `ADSENSE_SLOT_ID` blank. For a manually placed responsive ad unit,
set `ADSENSE_SLOT_ID` to that unit's numeric ID.
With a valid publisher ID, `/ads.txt` automatically publishes your Google seller entry.
With ads enabled, the Google script and publisher verification metadata load on all public content pages; a configured slot adds
one labeled responsive placement above the footer. All eight public content pages load the shared AdSense code, including the survey, results and privacy pages. Error pages and technical endpoints do not load ads.
Without a slot, you can use Auto ads configured in your AdSense account instead.
Ads are disabled by default. Local rendering checks do not verify ad delivery or approval.
Before enabling ads publicly, publish the site on your domain, complete AdSense site
review, add an accurate privacy notice, and configure Google's consent management
for visitors where required. Google controls approval and ad delivery.
Setup: https://support.google.com/adsense/answer/7584263
Ads.txt: https://support.google.com/adsense/answer/12171612

## Routes
`/` overview · `/polls` polls · `/economy` economy · `/developments` tracker · `/have-your-say` survey · `/survey-results` live community results · `/methodology` sources · `/privacy` privacy and advertising · `/health` status

## Development photos
The overview and development tracker include a small infrastructure photo gallery.
Each image links to its Wikimedia Commons file page and displays its author, license,
and photo date. Some photos are historical or show an existing asset; they provide
visual context only and do not verify current construction, government responsibility,
funding, or completion. Keep captions, dates, and license attribution accurate when
updating or replacing the images.
The tracker includes a Boma Yangu photo for its Mukuru Estate project listing, which
identifies the project as ongoing in South B, Nairobi (checked 17 October 2026). The
site operator confirmed permission to display the official photo. The photo date is
not stated and the image does not verify completion, handover, or occupancy. Older
Mukuru Kwa Njenga sanitation/drainage photos from 2010 and 2024 are not a matched
before/after comparison with that project site. Check dated, project-specific records
for completion, occupancy, allocation, affordability, resident rehousing, and audits.

## Important before public launch
- This sample data is not live or automatically updated. Verify all numbers against original sources and record the check date.
- Poll results are dated snapshots and are not directly comparable when fieldwork, wording, sampling or mode differ.
- A voluntary web survey is not a nationally representative poll. Disclose recruitment method, sample size, fieldwork dates and limitations when summarizing results.
- A government announcement is not proof of a completed project or impact. Track budgets, spending, delivery, outcomes and audits separately.
- Protect respondents' privacy and comply with applicable Kenyan data-protection requirements.
- Review `/privacy` whenever data collection, retention, database hosting, or advertising changes. Configure and publish Google's certified consent message in AdSense Privacy & messaging for visitors in regions where it is required; the page-ad script must be enabled on the pages where the consent message should appear.
- This is a starter, not production-ready. Before deploying, add CSRF protection, privacy notice/consent, retention and deletion controls, admin authentication for content edits, audit logs, database backups, tests, accessibility checks, HTTPS and secure deployment configuration.

## Structure
`server.js`, `package.json`, `.env.example`, `data/sample-data.json`, `views/`, `public/css/style.css`, `public/js/main.js`.

## Presidential preference percentages
The survey includes presidential preference choices configured in `data/presidential-candidates.json`. Initial names come from the existing sample poll data and are not a verified candidate register. Edit the list and restart the app to change choices. Other, Undecided, and Prefer not to say are always available. `/survey-results` and the overview show counts and percentages to one decimal place. The denominator includes answers to this question only, including the three non-candidate choices; older records without the field are excluded. Results are voluntary website preferences, not official election results or forecasts. No historical preferences are inferred.

The survey results page also displays all three existing external poll sources separately: TIFA, Politrack (The Star coverage), and Infotrak (Kenya News Agency coverage). Each shows source-check status and dates. External data are manually maintained snapshots, not an automatic feed or a combined final result.

## Search, sharing and audience growth
See [LAUNCH.md](LAUNCH.md) for deployment and domain setup, Search Console verification, optional analytics, newsletter/WhatsApp links and publishing articles. Configure the new variables in `.env.example`. No external account is created automatically. Run `npm test` for integration checks.
