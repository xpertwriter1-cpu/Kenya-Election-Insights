const articles = require('./data/articles.json');
const pages = {
 '/daily-analysis':['Daily Kenya political analysis','Read a daily source-linked political briefing with recent headlines, evidence checks and methodological context.'],
 '/':['Kenya polls, economy and development insights','Compare published Kenyan polls, explore economic indicators and track development evidence with dated sources.'],
 '/polls':['Kenya presidential opinion polls','Compare Kenyan presidential poll percentages, fieldwork dates, sample sizes and survey methods by source.'],
 '/economy':['Kenya economy indicators','Explore Kenya economic indicators with reporting periods, context and links to the original sources.'],
 '/developments':['Kenya development tracker','Review Kenyan development announcements, infrastructure photos and evidence needed to assess delivery.'],
 '/have-your-say':['Have your say: Kenya community survey','Share your priorities and optional presidential preference in a voluntary community survey.'],
 '/survey-results':['Kenya community survey results and published polls','See percentages from saved website responses alongside separate, dated presidential opinion polls.'],
 '/methodology':['Sources and methodology','Understand this site’s sources, survey limitations and approach to assessing evidence.'],
 '/privacy':['Privacy and advertising','Read how survey responses, optional analytics and advertising are handled.'],
 '/updates':['Kenya insights and explainers','Read practical explainers on opinion polls, public spending and evidence behind Kenyan civic issues.']
};
const xml = value => String(value).replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
function safeUrl(value) {
 try { const url = new URL(value); return url.protocol === 'https:' ? url.href : ''; } catch { return ''; }
}
module.exports = function setupGrowth(app) {
 let origin = '';
 try {
  const url = new URL(process.env.SITE_URL);
  if (url.protocol === 'https:' && !url.username && !url.password) origin = url.origin;
 } catch {}
 const newsletter = safeUrl(process.env.NEWSLETTER_URL);
 const whatsapp = safeUrl(process.env.WHATSAPP_CHANNEL_URL);
 const ga = /^G-[A-Z0-9]+$/.test(process.env.GA_MEASUREMENT_ID || '') ? process.env.GA_MEASUREMENT_ID : '';
 const verification = /^[a-zA-Z0-9_-]+$/.test(process.env.GOOGLE_SITE_VERIFICATION || '') ? process.env.GOOGLE_SITE_VERIFICATION : '';
 const urls = [...Object.keys(pages), ...articles.map(a => '/updates/' + a.slug)];
 app.use((req,res,next) => {
  const article = articles.find(a => req.path === '/updates/' + a.slug);
  const page = article ? [article.title,article.summary] : pages[req.path];
  const canonical = origin && page ? origin + req.path : '';
  res.locals.growth = {origin,newsletter,whatsapp,ga,verification,canonical,
   title: page?.[0] || 'Kenya Election Insights', description: page?.[1] || 'Independent Kenyan civic information and sources.',
   image: origin ? origin + '/images/share-card.png' : '', article,
   indexable: Boolean(origin && page && req.method === 'GET'), shareable: Boolean(canonical && req.method === 'GET')};
  if (!origin || !page || req.method !== 'GET') res.set('X-Robots-Tag','noindex');
  next();
 });
 app.get('/robots.txt',(req,res) => res.type('text/plain').send(origin
  ? `User-agent: *\nAllow: /\nDisallow: /health\nSitemap: ${origin}/sitemap.xml\n`
  : 'User-agent: *\nDisallow: /\n'));
 app.get('/sitemap.xml',(req,res) => {
  if (!origin) return res.status(503).type('text/plain').send('Set SITE_URL to the public HTTPS domain to enable the sitemap.');
  const entries=urls.map(url=>{
   const article=articles.find(a=>url==='/updates/'+a.slug);
   return `<url><loc>${xml(origin+url)}</loc>${article?`<lastmod>${xml(article.updated)}</lastmod>`:''}</url>`;
  }).join('');
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</urlset>`);
 });
 app.get('/feed.xml',(req,res)=>{
  if(!origin) return res.status(503).type('text/plain').send('Set SITE_URL to enable the feed.');
  const items=articles.map(a=>`<item><title>${xml(a.title)}</title><link>${xml(origin+'/updates/'+a.slug)}</link><guid>${xml(origin+'/updates/'+a.slug)}</guid><description>${xml(a.summary)}</description><pubDate>${new Date(a.published+'T09:00:00+03:00').toUTCString()}</pubDate></item>`).join('');
  res.type('application/rss+xml').send(`<?xml version="1.0"?><rss version="2.0"><channel><title>Kenya Election Insights</title><link>${xml(origin)}</link><description>Civic explainers and updates</description>${items}</channel></rss>`);
 });
 app.get('/updates',(req,res)=>res.render('updates',{articles}));
 app.get('/updates/:slug',(req,res,next)=>{
  const article=articles.find(a=>a.slug===req.params.slug);
  if(!article)return next();
  res.render('article',{article});
 });
};

