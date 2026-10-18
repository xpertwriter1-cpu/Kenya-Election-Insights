function createDatabase(mongoose, uri = '') {
 let pending = null, failure = null, retryAt = 0;
 function classify(error) {
  if (error.code === 18 || /authentication failed|bad auth/i.test(error.message)) return 'authentication_failed';
  if (/querySrv|ENOTFOUND|ETIMEOUT|ECONNREFUSED/i.test(error.message)) return 'network_or_dns';
  return 'connection_failed';
 }
 async function connect() {
  if (mongoose.connection.readyState === 1) { failure=null; return true; }
  if (!uri.trim()) { failure='missing_uri'; return false; }
  if (!/^mongodb(?:\+srv)?:\/\//.test(uri.trim())) { failure='invalid_uri'; return false; }
  if (pending) return pending;
  if (Date.now() < retryAt) return false;
  pending = mongoose.connect(uri.trim(), {serverSelectionTimeoutMS:8000,connectTimeoutMS:8000})
   .then(()=>{failure=null;retryAt=0;return true;})
   .catch(error=>{failure=classify(error);retryAt=Date.now()+15000;console.error('MongoDB connection unavailable:',failure);return false;})
   .finally(()=>{pending=null;});
  return pending;
 }
 return {connect,status:()=>({connected:mongoose.connection.readyState===1,reason:failure})};
}
module.exports = {createDatabase};
