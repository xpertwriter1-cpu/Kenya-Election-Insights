# Publish and grow the site

## Deploy

Use a Node.js hosting service or build the included Dockerfile from this directory. The app reads the host's PORT variable. Configure secrets in the host's environment settings, not in Git or a Docker image. Enable HTTPS and attach your domain using the host's domain settings. Do not expose the development server directly to the internet.

Set MONGODB_URI in the host's secret environment and permit that host's outbound addresses in Atlas Network Access. Use a database user with only the permissions needed for the application. Rotate credentials that have been shared outside your secrets manager. Check /health after deployment; it must report database connected for survey storage.

## Public URLs and search

Set SITE_URL to the public HTTPS origin, for example https://your-domain.example, and restart. Do not enter localhost or a URL path. With no SITE_URL configured the site deliberately sends noindex, blocks crawling, and returns 503 for sitemap/feed endpoints to avoid publishing development URLs.

Canonical URLs, sharing previews, robots.txt, /sitemap.xml and /feed.xml use this origin. The sitemap includes public pages and individual articles, excludes technical endpoints and strips tracking queries. Article lastmod dates come from their explicit updated field, rather than the server clock.

Add your domain to Google Search Console. Use DNS verification or put the HTML verification token into GOOGLE_SITE_VERIFICATION. Deploy and complete verification in Search Console, then submit /sitemap.xml. Inclusion and rankings are controlled by Google. Inspect a published page and confirm its canonical URL and preview card; neither can be checked against your domain before deployment.

## Updates and distribution

Edit data/articles.json to publish original explainers. Each article needs a unique URL-safe slug, accurate published/updated dates, a title, summary, sections, and source links. Keep older URLs stable. Add two useful, sourced updates per week when there is something worth reporting; correct existing articles when evidence changes. Restart after editing content.

The /updates index, article pages, sitemap and RSS feed read this file. No scheduler invents news or republishes third-party articles. Add links to original reports and explain the method behind comparisons. Do not combine the voluntary website survey with published polls.

Use the page's WhatsApp, Facebook, X and copy-link buttons to share relevant explainers, with source and date. Respect community rules. Configure NEWSLETTER_URL with your hosted signup form and WHATSAPP_CHANNEL_URL with your channel URL to enable follow buttons. These use existing services; the site does not send messages or collect subscriber emails itself. RSS is available without an account.

## Measurement

Create a GA4 web property for your public domain and set GA_MEASUREMENT_ID to its G- ID. Analytics loads only after a visitor opts in using the footer controls. Advertising consent remains separate and must be configured through your AdSense consent solution. Test opt-in and decline on the public domain. Survey fields are not sent as analytics events; avoid collecting personal data through GA4 enhanced measurement.

Review Search Console search clicks and queries, then Analytics acquisition reports, useful landing pages and returning visitors weekly. Share URLs with non-personal UTM campaign tags to compare channels. Use the results to decide which explainers to expand. Growth and revenue are not guaranteed. Do not buy bot traffic or request ad clicks.

## Ads and prelaunch checks

Configure your public domain and Auto ads in AdSense, including applicable certified consent messaging. The existing ADSENSE settings and /ads.txt remain in use. Local tests cannot confirm account approval or ad delivery. Review the privacy notice when adding providers. Finish the remaining public-launch controls described in README.md before accepting public survey responses.

Run `node --test tests/growth.test.js` for the search, article, sharing and analytics integration checks. Start one app process only (`npm start`); a second process on the same port causes EADDRINUSE.

## Daily political briefing
`/daily-analysis` checks TIFA RSS, Kenya News Agency RSS and The Star news listing. The fixed source allowlist lives in daily-analysis.js. Only source links on their own HTTPS hostname, relevant political headlines and dates within seven days are included. No article bodies are stored. Date extraction on The Star uses its dated URL; feeds use pubDate. This is automated headline-based thematic context, not a full-text editorial assessment or verification of claims. It does not change stored poll percentages.

Checks run at startup and every 15 minutes to detect a new Nairobi calendar day, with at most one source check per day per process. The first request can wait up to the source timeout (10 seconds). Results are cached in .cache/daily-analysis.json, with memory fallback if the directory is read-only. Keep one app process or use shared storage/locking before scaling to multiple instances. The container cache is ephemeral; use persistent storage if it must survive deployments. Failed sources are shown explicitly, and no evidence means no substantive analysis. Set DAILY_ANALYSIS_ENABLED=false to disable network refresh. No check runs while hosting is asleep or stopped; the next startup/visit catches up.
