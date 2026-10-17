const fs = require('node:fs/promises');
const path = require('node:path');
const SOURCES = [
 {name:'TIFA Research',url:'https://www.tifaresearch.com/feed/',home:'https://www.tifaresearch.com/',type:'rss'},
 {name:'The Star',url:'https://www.the-star.co.ke/news',home:'https://www.the-star.co.ke/',type:'html'},
 {name:'Kenya News Agency',url:'https://www.kenyanews.go.ke/feed/',home:'https://www.kenyanews.go.ke/',type:'rss'}
];
const political = /\b(politic|poll|election|presiden|parliament|senat|coalition|ruto|sifuna|matiang|kalonzo|gachagua|devol|constitution|governan|cabinet|voter|iebc|odm|uda|wiper|tax|budget)/i;
function text(value='') {
 return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]*>/g,' ').replace(/&#(x[0-9a-f]+|\d+);/gi,(_,n)=>{const code=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return code<=0x10ffff?String.fromCodePoint(code):'';}).replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&apos;|&#039;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim();
}
function allowedLink(raw, source) {
 try {const u=new URL(text(raw),source.home);return u.protocol==='https:'&&u.hostname===new URL(source.home).hostname&&!u.username&&!u.password?u.href:'';}catch{return '';}
}
function parseItems(body,source,now=new Date()) {
 const items=[];
 if(source.type==='rss'){
  for(const match of body.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)){
   const get=tag=>match[1].match(new RegExp('<'+tag+'[^>]*>([\\s\\S]*?)</'+tag+'>','i'))?.[1]||'';
   const title=text(get('title')).slice(0,240),url=allowedLink(get('link'),source);
   const date=new Date(text(get('pubDate')));
   if(url&&title&&political.test(title)&&Number.isFinite(date.getTime())&&date<=now&&now-date<=7*86400000)items.push({title,url,published:date.toISOString()});
  }
 }else{
  for(const match of body.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){
   const url=allowedLink(match[1],source),title=text(match[2]).slice(0,240);
   const dateString=url.match(/\/(\d{4}-\d{2}-\d{2})-/)?.[1];
   const date=new Date(dateString+'T00:00:00+03:00');
   if(url&&title.length>20&&political.test(title)&&Number.isFinite(date.getTime())&&date<=now&&now-date<=7*86400000)items.push({title,url,published:date.toISOString()});
  }
 }
 return [...new Map(items.map(item=>[item.url,item])).values()].sort((a,b)=>b.published.localeCompare(a.published)).slice(0,5);
}
function dayKey(now=new Date()){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Nairobi',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 return ['year','month','day'].map(type=>parts.find(p=>p.type===type).value).join('-');
}
function analyze(sources){
 const available=sources.filter(s=>s.status==='ok');
 const headlines=available.flatMap(s=>s.items);
 const themes=[
  {title:'Elections and polling',pattern:/poll|election|voter|iebc/i,meaning:'Check the fieldwork dates, question wording and sampling before interpreting candidate percentages. News coverage alone does not establish a shift in voter support.'},
  {title:'Parties and coalitions',pattern:/coalition|party|parties|odm|uda|wiper|kalonzo|gachagua|sifuna/i,meaning:'Distinguish statements by political actors from formal party decisions. Look for official records before treating a reported alliance as settled.'},
  {title:'Government and accountability',pattern:/ruto|presiden|parliament|cabinet|tax|budget|governan|devol|constitution/i,meaning:'Separate political claims from enacted decisions and measurable outcomes. Seek budgets, legislation or dated official records to assess implementation.'}
 ].map(theme=>({...theme,count:headlines.filter(h=>theme.pattern.test(h.title)).length})).filter(theme=>theme.count);
 return {count:headlines.length,available:available.length,themes:themes.map(({pattern,...theme})=>theme),summary:headlines.length
  ? `The accessible sources contain ${headlines.length} relevant headlines dated within the last seven days. The themes below are identified from headlines, not a full-text assessment or independent verification of the reported claims.`
  : 'No recent political headlines could be extracted from the accessible sources. There is not enough fresh evidence to produce a substantive daily assessment. Check the source links or return after the next refresh.'};
}
async function fetchSource(source,fetcher,now){
 try{
  const response=await fetcher(source.url,{signal:AbortSignal.timeout(10000),redirect:'error',headers:{'User-Agent':'KenyaElectionInsights/1.0 (daily source briefing)'}});
  if(!response.ok)throw Error('HTTP '+response.status);
  const chunks=[];let size=0;
  for await(const chunk of response.body){size+=chunk.length;if(size>2*1024*1024)throw Error('Response too large');chunks.push(Buffer.from(chunk));}
  const body=Buffer.concat(chunks).toString('utf8');
  const items=parseItems(body,source,now);
  return {...source,status:'ok',checkedAt:now.toISOString(),items};
 }catch(error){return {...source,status:'unavailable',checkedAt:now.toISOString(),items:[],error:error.message.startsWith('HTTP ')?error.message:'Source could not be read; it may be blocked, unavailable or require a different feed.'};}
}
function createBriefing({fetcher=fetch,cacheFile=path.join(__dirname,'.cache','daily-analysis.json'),now=()=>new Date()}={}){
 let edition=null,inflight=null,loadPromise=null;
 function load(){
  if(!loadPromise)loadPromise=(async()=>{try{const stored=JSON.parse(await fs.readFile(cacheFile,'utf8'));if(stored.version===1&&Array.isArray(stored.sources))edition=stored;}catch{}})();
  return loadPromise;
 }
 async function refresh(){
  await load();if(inflight)return inflight;
  const current=now();
  if(edition?.day===dayKey(current))return edition;
  inflight=(async()=>{
   const sources=await Promise.all(SOURCES.map(source=>fetchSource(source,fetcher,current)));
   edition={version:1,day:dayKey(current),checkedAt:current.toISOString(),sources,analysis:analyze(sources)};
   try{await fs.mkdir(path.dirname(cacheFile),{recursive:true});await fs.writeFile(cacheFile+'.tmp',JSON.stringify(edition));await fs.rename(cacheFile+'.tmp',cacheFile);}catch{console.error('Daily briefing cache could not be saved; using memory cache.');}
   return edition;
  })().finally(()=>{inflight=null;});return inflight;
 }
 return {refresh,async get(){await load();return edition;}};
}
function setupDailyAnalysis(app){
 const service=createBriefing();
 const enabled=process.env.DAILY_ANALYSIS_ENABLED!=='false';
 if(enabled){service.refresh().catch(()=>{});const timer=setInterval(()=>service.refresh().catch(()=>{}),15*60*1000);timer.unref();}
 app.get('/daily-analysis',async(req,res,next)=>{
  try{const edition=enabled?await service.refresh():await service.get();res.render('daily-analysis',{edition,today:dayKey(),enabled});}catch(error){next(error);}
 });
 return service;
}
module.exports={setupDailyAnalysis,createBriefing,parseItems,analyze,dayKey,SOURCES};
