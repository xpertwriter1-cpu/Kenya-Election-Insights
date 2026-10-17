require('dotenv').config({path:require('path').join(__dirname,'.env')});
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;
const seed = JSON.parse(fs.readFileSync(path.join(__dirname,'data','sample-data.json'),'utf8'));
app.set('view engine','ejs'); app.set('views',path.join(__dirname,'views'));
app.use(helmet({contentSecurityPolicy:false})); app.use(express.urlencoded({extended:false,limit:'20kb'})); app.use(express.static(path.join(__dirname,'public'),{maxAge:'1h'}));
app.use(rateLimit({windowMs:15*60*1000,limit:200,standardHeaders:true,legacyHeaders:false}));
app.locals.siteName='Kenya Election Insights';
const adsensePublisherId = (process.env.ADSENSE_CLIENT_ID || '').trim();
const adsenseSlot = (process.env.ADSENSE_SLOT_ID || '').trim();
const adsensePublisherMatch = /^(?:ca-)?pub-(\d{16})$/.exec(adsensePublisherId);
const adsenseClient = adsensePublisherMatch ? `ca-pub-${adsensePublisherMatch[1]}` : '';
const validAdsenseClient = Boolean(adsensePublisherMatch);
const adsEnabled = process.env.ADSENSE_ENABLED === 'true' && validAdsenseClient;
app.use((req, res, next) => {
 const contentPage = ['/', '/polls', '/economy', '/developments', '/methodology', '/have-your-say', '/survey-results', '/privacy', '/daily-analysis'].includes(req.path);
 res.locals.adsense = {
  enabled: adsEnabled && (contentPage || req.path==='/updates' || /^\/updates\/[a-z0-9-]+$/.test(req.path)),
  client: validAdsenseClient ? adsenseClient : '',
  slot: /^\d+$/.test(adsenseSlot) ? adsenseSlot : ''
 };
 next();
});
require('./growth')(app);
require('./daily-analysis').setupDailyAnalysis(app);
app.get('/ads.txt', (req, res) => {
 if (!validAdsenseClient) return res.status(404).type('text/plain').send('AdSense publisher not configured.\n');
 res.type('text/plain').send(`google.com, ${adsenseClient.slice(3)}, DIRECT, f08c47fec0942fa0\n`);
});
const presidentialCandidates = JSON.parse(fs.readFileSync(path.join(__dirname,'data','presidential-candidates.json'),'utf8'));
const presidentialChoices = [...presidentialCandidates, 'Other', 'Undecided', 'Prefer not to say'];
app.locals.presidentialChoices = presidentialChoices;
let dbReady=false; let OpinionResponse;
const schema=new mongoose.Schema({presidentialPreference:{type:String,enum:presidentialChoices},county:{type:String,required:true},ageBand:{type:String,enum:['18-24','25-34','35-44','45-54','55+'],required:true},topIssue:{type:String,required:true},direction:{type:String,enum:['Right direction','Wrong direction','Unsure'],required:true},policyView:{type:String,enum:['Improved','No major change','Worsened','Unsure'],required:true},createdAt:{type:Date,default:Date.now}},{versionKey:false});
OpinionResponse=mongoose.model('OpinionResponse',schema);
if(process.env.MONGODB_URI) mongoose.connect(process.env.MONGODB_URI).then(()=>{dbReady=true;console.log('MongoDB connected')}).catch(e=>console.error('MongoDB unavailable; sample mode remains active:',e.message));
const asyncRoute=handler=>(req,res,next)=>Promise.resolve(handler(req,res,next)).catch(next);
const getOpinionStats=async()=>{
 if(!dbReady) return null;
 const [result]=await OpinionResponse.aggregate([{$facet:{
  total:[{$count:'count'}],
  presidentialPreference:[{$match:{presidentialPreference:{$in:presidentialChoices}}},{$group:{_id:'$presidentialPreference',count:{$sum:1}}},{$sort:{_id:1}}],
  county:[{$group:{_id:'$county',count:{$sum:1}}},{$sort:{count:-1,_id:1}}],
  ageBand:[{$group:{_id:'$ageBand',count:{$sum:1}}},{$sort:{count:-1,_id:1}}],
  topIssue:[{$group:{_id:'$topIssue',count:{$sum:1}}},{$sort:{count:-1,_id:1}}],
  direction:[{$group:{_id:'$direction',count:{$sum:1}}},{$sort:{count:-1,_id:1}}],
  policyView:[{$group:{_id:'$policyView',count:{$sum:1}}},{$sort:{count:-1,_id:1}}]
 }}]);
 const total=result.total[0]?.count||0;
 const questions=[
  {key:'county',title:'Responses by county'},
  {key:'ageBand',title:'Responses by age group'},
  {key:'topIssue',title:'Most important issues'},
  {key:'direction',title:'Direction of the country'},
  {key:'policyView',title:'Perceived policy impact'}
 ].map(question=>({...question,values:result[question.key].map(item=>({
  label:item._id,
  count:item.count,
  percentage:total?Math.round(item.count/total*100):0
 }))}));
 const presidentialTotal=result.presidentialPreference.reduce((sum,item)=>sum+item.count,0);
 questions.unshift({key:'presidentialPreference',title:'Presidential preference',answered:presidentialTotal,values:presidentialChoices.map(label=>{
  const count=result.presidentialPreference.find(item=>item._id===label)?.count||0;
  return {label,count,percentage:presidentialTotal?Math.round(count/presidentialTotal*1000)/10:0};
 })});
 return {total,questions};
};
app.get('/',asyncRoute(async(req,res)=>res.render('index',{
 polls:seed.polls,
 economy:seed.economy,
 developments:seed.developments,
 developmentGallery:seed.developmentGallery,
 survey:seed.publicOpinion,
 opinionStats:await getOpinionStats()
})));
app.get('/polls',(req,res)=>res.render('polls',{polls:seed.polls}));
app.get('/economy',(req,res)=>res.render('economy',{economy:seed.economy,developments:seed.developments}));
app.get('/developments',(req,res)=>res.render('developments',{developments:seed.developments,developmentGallery:seed.developmentGallery}));
app.get('/methodology',(req,res)=>res.render('methodology',{sources:seed.sources}));
app.get('/privacy',(req,res)=>res.render('privacy'));
app.get('/survey-results',asyncRoute(async(req,res)=>res.render('survey-results',{
 polls:seed.polls,
 submitted:req.query.submitted==='1',
 opinionStats:await getOpinionStats()
})));
app.get('/have-your-say',asyncRoute(async(req,res)=>res.render('survey',{
 saved:false,
 error:null,
 counties:seed.counties,
 opinionStats:await getOpinionStats()
})));
app.post('/have-your-say',rateLimit({windowMs:60*60*1000,limit:5}),asyncRoute(async(req,res)=>{
 const {county,ageBand,topIssue,direction,policyView,presidentialPreference}=req.body;
 const issues=['Cost of living','Jobs','Healthcare','Education','Debt and taxes','Corruption and accountability','Security','Infrastructure','Agriculture','Other'];
 if((presidentialPreference!==undefined&&!presidentialChoices.includes(presidentialPreference))||!seed.counties.includes(county)||!['18-24','25-34','35-44','45-54','55+'].includes(ageBand)||!issues.includes(topIssue)||!['Right direction','Wrong direction','Unsure'].includes(direction)||!['Improved','No major change','Worsened','Unsure'].includes(policyView)) return res.status(400).render('survey',{saved:false,error:'Please check every field and submit again.',counties:seed.counties,opinionStats:await getOpinionStats()});
 if(!dbReady) return res.render('survey',{saved:false,error:'MongoDB is not connected, so your response was NOT stored. Configure MONGODB_URI in .env and restart the app.',counties:seed.counties,opinionStats:null});
 await OpinionResponse.create({county,ageBand,topIssue,direction,policyView,presidentialPreference});
 res.redirect(303,'/survey-results?submitted=1');
}));
app.get('/health',(req,res)=>res.json({ok:true,database:dbReady?'connected':'sample-data mode'}));
app.use((error,req,res,next)=>{
 console.error('Request failed:',error);
 if(res.headersSent) return next(error);
 res.status(500).send('Unable to process this request right now. Please try again later.');
});
app.use((req,res)=>{res.locals.adsense.enabled=false;res.locals.growth.indexable=false;res.locals.growth.shareable=false;res.status(404).render('404');});
app.listen(PORT,()=>console.log(`Kenya Election Insights running at http://localhost:${PORT}`));
