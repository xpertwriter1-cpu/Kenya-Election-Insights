document.addEventListener('DOMContentLoaded',()=>document.querySelectorAll('a[target="_blank"]').forEach(a=>a.setAttribute('rel','noopener noreferrer')));

document.querySelectorAll('[data-copy-url]').forEach(button=>button.addEventListener('click',async()=>{
 const status=document.querySelector('[data-share-status]');
 try { await navigator.clipboard.writeText(button.dataset.copyUrl); status.textContent='Link copied.'; }
 catch { status.textContent='Copy this link: '+button.dataset.copyUrl; }
}));
