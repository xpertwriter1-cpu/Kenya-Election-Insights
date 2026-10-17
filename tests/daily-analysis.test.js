const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const {parseItems,dayKey,analyze,createBriefing,SOURCES}=require('../daily-analysis');
const now=new Date('2026-10-17T09:00:00Z');
const rss=`<rss><channel><item><title>Election polling &amp; party questions</title><link>https://www.tifaresearch.com/new-poll/</link><pubDate>Sat, 17 Oct 2026 08:00:00 GMT</pubDate></item><item><title>Election unsafe</title><link>https://attacker.example/fake</link><pubDate>Sat, 17 Oct 2026 08:00:00 GMT</pubDate></item><item><title>Old poll</title><link>https://www.tifaresearch.com/old-poll/</link><pubDate>Sat, 01 Aug 2026 08:00:00 GMT</pubDate></item></channel></rss>`;
test('parsing keeps recent relevant same-host sources only',()=>{
 const items=parseItems(rss,SOURCES[0],now);assert.equal(items.length,1);assert.equal(items[0].title,'Election polling & party questions');
 const html='<a href="/news/2026-10-17-election-poll">New presidential election polling debate</a><a href="/news/2026-10-17-sport">Football match and goals</a>';
 assert.equal(parseItems(html,SOURCES[1],now).length,1);
 assert.equal(dayKey(new Date('2026-10-16T21:01:00Z')),'2026-10-17');
});
test('analysis distinguishes unavailable and empty evidence',()=>{
 const empty=analyze([{status:'unavailable',items:[]}]);assert.equal(empty.count,0);assert(empty.summary.includes('not enough fresh evidence'));
 const result=analyze([{status:'ok',items:[{title:'Presidential election poll'}]}]);assert.equal(result.count,1);assert(result.themes.length);assert(result.summary.includes('not a full-text assessment'));
});
test('refresh deduplicates, persists, catches up on Nairobi date change and reports failures',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'kei-daily-'));const file=path.join(dir,'cache.json');let calls=0;let clock=now;
 const fetcher=async url=>{calls++;if(url.includes('kenyanews'))return new Response('Unavailable',{status:503});return new Response(url.includes('tifaresearch')?rss:'<html>No qualifying links</html>');};
 try{
  const service=createBriefing({fetcher,cacheFile:file,now:()=>clock});
  const [first,second]=await Promise.all([service.refresh(),service.refresh()]);assert.equal(first.day,second.day);assert.equal(calls,3);assert.equal(first.analysis.count,1);assert.equal(first.sources[2].status,'unavailable');
  await service.refresh();assert.equal(calls,3);
  const reloaded=createBriefing({fetcher,cacheFile:file,now:()=>clock});await reloaded.refresh();assert.equal(calls,3);
  clock=new Date('2026-10-17T21:01:00Z');await reloaded.refresh();assert.equal(calls,6);assert.equal((await reloaded.get()).day,'2026-10-18');
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
