const {test} = require('node:test');
const assert = require('node:assert/strict');
const {spawn} = require('node:child_process');
const {once} = require('node:events');
const path = require('node:path');
const net = require('node:net');

async function withServer(settings, check) {
 const socket=net.createServer();
 socket.listen(0,'127.0.0.1'); await once(socket,'listening');
 const port=socket.address().port; await new Promise(resolve=>socket.close(resolve));
 const child=spawn(process.execPath,['server.js'],{cwd:path.join(__dirname,'..'),env:{...process.env,
  DAILY_ANALYSIS_ENABLED:'false',PORT:String(port),MONGODB_URI:'',ADSENSE_ENABLED:'true',ADSENSE_CLIENT_ID:'ca-pub-1234567890123456',
  SITE_URL:'',GA_MEASUREMENT_ID:'',GOOGLE_SITE_VERIFICATION:'',NEWSLETTER_URL:'',WHATSAPP_CHANNEL_URL:'',...settings},stdio:['ignore','pipe','pipe']});
 try {
  await new Promise((resolve,reject)=>{
   const timeout=setTimeout(()=>reject(Error('Server startup timed out')),8000);
   child.stdout.on('data',data=>{if(data.toString().includes('running at')){clearTimeout(timeout);resolve();}});
   child.on('error',reject);
   child.stderr.on('data',data=>reject(Error(data.toString())));
  });
  await check(url=>fetch(`http://127.0.0.1:${port}${url}`));
 } finally { const stopped=once(child,'exit');child.kill();await stopped; }
}

test('public pages have canonical metadata, share links, article discovery and optional analytics',async()=>{
 await withServer({SITE_URL:'https://kenya.example',GA_MEASUREMENT_ID:'G-TEST123',GOOGLE_SITE_VERIFICATION:'verification_test',NEWSLETTER_URL:'https://newsletter.example/signup',WHATSAPP_CHANNEL_URL:'https://whatsapp.com/channel/example'},async get=>{
  for(const route of ['/','/polls','/economy','/developments','/methodology','/privacy','/have-your-say','/survey-results','/updates','/daily-analysis','/updates/how-to-read-kenya-presidential-polls']){
   const response=await get(route+'?utm_source=test');assert.equal(response.status,200,route);
   const html=await response.text();
   assert(html.includes(`rel="canonical" href="https://kenya.example${route}"`));
   assert(html.includes('property="og:description"'));assert(html.includes('share-card.png'));
   assert(html.includes('verification_test'));assert(html.includes('data-copy-url='));
   assert(html.includes('data-analytics-id="G-TEST123"'));assert(!html.includes('googletagmanager.com/gtag'));
   assert(html.includes('https://newsletter.example/signup'));assert(html.includes('https://whatsapp.com/channel/example'));
   assert.equal((html.match(/adsbygoogle.js/g)||[]).length,1);
  }
  const sitemap=await(await get('/sitemap.xml')).text();assert(sitemap.includes('https://kenya.example/updates/how-to-read-kenya-presidential-polls'));
  assert(!sitemap.includes('/health'));assert(!sitemap.includes('utm_'));assert(sitemap.includes('<lastmod>2026-10-17</lastmod>'));
  const robots=await(await get('/robots.txt')).text();assert(robots.includes('Sitemap: https://kenya.example/sitemap.xml'));
  const feed=await(await get('/feed.xml')).text();assert(feed.includes('<rss'));assert(feed.includes('how-to-check-development-project-claims'));
  const unknown=await get('/updates/not-real');assert.equal(unknown.status,404);const html=await unknown.text();assert(!html.includes('adsbygoogle.js'));assert(html.includes('noindex'));
  const image=await get('/images/share-card.png');assert.equal(image.status,200);assert(image.headers.get('content-type').includes('image/png'));
 });
});

test('unconfigured deployment does not publish development URLs or unconfigured follow links',async()=>{
 await withServer({},async get=>{
  const response=await get('/updates');assert.equal(response.headers.get('x-robots-tag'),'noindex');
  const html=await response.text();assert(!html.includes('rel="canonical"'));assert(!html.includes('data-analytics-id'));assert(!html.includes('Subscribe to updates'));
  assert.equal((await get('/sitemap.xml')).status,503);assert.equal((await get('/feed.xml')).status,503);
  assert((await(await get('/robots.txt')).text()).includes('Disallow: /'));
 });
});

test('unsafe configuration links and origins are ignored',async()=>{
 await withServer({SITE_URL:'javascript:bad',NEWSLETTER_URL:'javascript:alert(1)',WHATSAPP_CHANNEL_URL:'http://unsafe.example',GA_MEASUREMENT_ID:'bad-id'},async get=>{
  const html=await(await get('/updates')).text();assert(!html.includes('javascript:'));assert(!html.includes('unsafe.example'));assert(!html.includes('data-analytics-id'));assert(!html.includes('rel="canonical"'));
 });
});

test('analytics waits for opt-in and allows decline',()=>{
 const vm=require('node:vm');
 const fs=require('node:fs');
 const handlers={};const scripts=[];const stored={};const status={};
 const panel={dataset:{analyticsId:'G-TEST123'},querySelector:()=>status,querySelectorAll:()=>['yes','no'].map(choice=>({dataset:{analyticsChoice:choice},addEventListener:(_,fn)=>{handlers[choice]=fn;}}))};
 let reloaded=false;
 const context={document:{querySelector:()=>panel,createElement:()=>({}),head:{append:tag=>scripts.push(tag)}},window:{location:{origin:'https://kenya.example',pathname:'/survey-results',reload:()=>{reloaded=true;}}},localStorage:{getItem:key=>stored[key],setItem:(key,value)=>{stored[key]=value;}},Date,encodeURIComponent};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../public/js/audience.js'),'utf8'),context);
 assert.equal(scripts.length,0);handlers.no();assert.equal(scripts.length,0);
 handlers.yes();assert.equal(scripts.length,1);assert(scripts[0].src.includes('G-TEST123'));
 const config=context.window.dataLayer.find(args=>args[0]==='config')[2];
 assert.equal(config.page_location,'https://kenya.example/survey-results');assert.equal(config.allow_google_signals,false);
 handlers.no();assert.equal(context.window['ga-disable-G-TEST123'],true);assert(reloaded);
});
