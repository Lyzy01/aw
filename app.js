// =============================================
// GODONATE app.js - Full Clean Build
// =============================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, updateProfile, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, increment, collection, addDoc, query, orderBy, limit, onSnapshot, getDocs, where, serverTimestamp, runTransaction, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA4K4pYAs2s7Xv4k_GJLx4VCrXEoZyubsE",
  authDomain: "godonate-9d056.firebaseapp.com",
  projectId: "godonate-9d056",
  storageBucket: "godonate-9d056.firebasestorage.app",
  messagingSenderId: "711443734180",
  appId: "1:711443734180:web:edbd767c9477dae84ad031"
};
const fireApp = initializeApp(firebaseConfig);
const auth = getAuth(fireApp);
const db = getFirestore(fireApp);
const googleProvider = new GoogleAuthProvider();
const ADMIN_USER = atob('bHl6eUBhZG1pbmFjY291bnQ=');
const ADMIN_PASS = atob('bHl6eTEyMw==');

// =============================================
// STATE
// =============================================
let currentUser = null, userData = null;
let countdownInterval = null, secondsToIncome = 60;
let selectedDonateUser = null, rouBetType = null;
let bjDeck = [], bjPlayerHand = [], bjDealerHand = [], bjGameActive = false;
let cfChoice = null;
let crashInterval = null, crashMultiplier = 1.0, crashTarget = 0, crashBet = 0, crashActive = false;
let chatUnsubscribe = null, feedUnsubscribe = null, donationUnsubscribe = null;
let allUsers = [], lastDonationEventId = null;
let appSettings = { incomePerMinute: 5, minDonate: 1, bigDonateThreshold: 10000 };

// VIP Drop state
let vipDropActive = false;
let vipDropClaimed = false;
let vipDropAmount = 1000;

// Event state — driven by Firestore so ALL users get them
let doubleIncomeActive = false, hotStreakActive = false;
let eventUnsubscribe = null;

// =============================================
// PARTICLE ENGINE
// =============================================
let pCanvas, pCtx, pParticles = [];

function initParticles() {
  pCanvas = document.getElementById('particle-canvas');
  if (!pCanvas) return;
  pCtx = pCanvas.getContext('2d');
  pCanvas.width = window.innerWidth;
  pCanvas.height = window.innerHeight;
  window.addEventListener('resize', () => { pCanvas.width = window.innerWidth; pCanvas.height = window.innerHeight; });
  requestAnimationFrame(tickParticles);
}

function tickParticles() {
  requestAnimationFrame(tickParticles);
  if (!pCtx) return;
  pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
  pParticles = pParticles.filter(p => p.life > 0);
  for (const p of pParticles) {
    p.x += p.vx; p.y += p.vy; p.vy += p.gravity; p.vx *= 0.98;
    p.life -= p.decay; p.rot = (p.rot || 0) + 0.07;
    pCtx.globalAlpha = Math.max(0, p.life);
    pCtx.fillStyle = p.color;
    if (p.shape === 'rect') {
      pCtx.save(); pCtx.translate(p.x, p.y); pCtx.rotate(p.rot);
      pCtx.fillRect(-p.size/2, -p.size*0.35, p.size, p.size*0.35);
      pCtx.restore();
    } else if (p.shape === 'star') {
      pCtx.save(); pCtx.translate(p.x, p.y); pCtx.rotate(p.rot);
      pCtx.beginPath();
      for (let i=0;i<5;i++){const a=(i*4*Math.PI)/5-Math.PI/2;i===0?pCtx.moveTo(Math.cos(a)*p.size,Math.sin(a)*p.size):pCtx.lineTo(Math.cos(a)*p.size,Math.sin(a)*p.size);}
      pCtx.closePath(); pCtx.fill(); pCtx.restore();
    } else {
      pCtx.beginPath(); pCtx.arc(p.x, p.y, Math.max(0.1, p.size * p.life), 0, Math.PI*2); pCtx.fill();
    }
  }
  pCtx.globalAlpha = 1;
}

function burst(x, y, count, colors, opts={}) {
  const shapes = ['circle','rect','star'];
  for (let i=0;i<count;i++) {
    const a = Math.random()*Math.PI*2, spd = (opts.speed||5)*(0.4+Math.random()*0.8);
    pParticles.push({
      x, y, vx: Math.cos(a)*spd, vy: Math.sin(a)*spd-(opts.upBias||1),
      color: colors[~~(Math.random()*colors.length)],
      size: opts.size||(3+Math.random()*5), life:1,
      decay: opts.decay||(0.010+Math.random()*0.013),
      gravity: opts.gravity??0.07,
      shape: opts.shape||shapes[~~(Math.random()*3)],
      rot: Math.random()*Math.PI*2,
    });
  }
}

function confettiRain(count=120) {
  const colors=['#f5c518','#ff6b35','#00e676','#448aff','#b388ff','#ff4757','#fff700','#ff69b4'];
  for(let i=0;i<count;i++) setTimeout(()=>{
    pParticles.push({x:Math.random()*window.innerWidth,y:-10,vx:(Math.random()-0.5)*3,vy:2+Math.random()*3,color:colors[~~(Math.random()*colors.length)],size:5+Math.random()*6,life:1,decay:0.004+Math.random()*0.005,gravity:0.04,shape:Math.random()>0.5?'rect':'star',rot:Math.random()*Math.PI*2});
  }, i*18);
}

function floatMoney(count=10) {
  const emojis=['💸','💰','🤑','💵','🪙','💎','👑','🎁'];
  const c=document.getElementById('float-money-container'); if(!c) return;
  for(let i=0;i<count;i++) setTimeout(()=>{
    const el=document.createElement('div'); el.className='float-money';
    el.textContent=emojis[~~(Math.random()*emojis.length)];
    el.style.left=(5+Math.random()*90)+'vw'; el.style.top=(30+Math.random()*50)+'vh';
    el.style.setProperty('--dur',(1.4+Math.random()*1.3)+'s');
    el.style.setProperty('--rot',(Math.random()*40-20)+'deg');
    el.style.fontSize=(1.2+Math.random()*1.1)+'rem';
    c.appendChild(el); setTimeout(()=>el.remove(),3000);
  }, i*65);
}

function pulseRing() {
  const r=document.createElement('div'); r.className='pulse-ring';
  document.body.appendChild(r); setTimeout(()=>r.remove(),900);
}

function winBurst() {
  const emojis=['✨','🎉','💰','⭐','🌟','💫','🎊'];
  for(let i=0;i<8;i++) setTimeout(()=>{
    const el=document.createElement('div'); el.className='win-burst';
    el.textContent=emojis[~~(Math.random()*emojis.length)];
    el.style.left=(20+Math.random()*60)+'vw'; el.style.top=(20+Math.random()*60)+'vh';
    el.style.setProperty('--dx',(Math.random()*16-8)+'vw');
    el.style.setProperty('--dy',(-8-Math.random()*14)+'vh');
    document.body.appendChild(el); setTimeout(()=>el.remove(),1300);
  }, i*75);
}

// =============================================
// DONATION ALERT CARDS (real-time, all users)
// =============================================
const alertQueue=[]; let alertRunning=false;

function pushAlert(fromName, toName, amount, msg) {
  alertQueue.push({fromName,toName,amount,msg});
  if(!alertRunning) drainAlerts();
}

function drainAlerts() {
  if(!alertQueue.length){alertRunning=false;return;}
  alertRunning=true;
  const {fromName,toName,amount,msg}=alertQueue.shift();
  const container=document.getElementById('donation-alert-queue');
  if(!container){setTimeout(drainAlerts,200);return;}
  const isBig=amount>=(appSettings.bigDonateThreshold||10000);
  const card=document.createElement('div');
  card.className='donation-alert-card'+(isBig?' alert-big':'');
  card.innerHTML=`<div class="dac-icon">${isBig?'🤑':'💝'}</div><div class="dac-body"><div class="dac-title">${isBig?'🚨 MEGA DONATION!':'New Donation'}</div><div class="dac-names"><span class="dac-from">@${esc(fromName)}</span><span class="dac-arrow"> ➜ </span><span class="dac-to">@${esc(toName)}</span></div>${msg?`<div class="dac-msg">"${esc(msg)}"</div>`:''}</div><div class="dac-amount">$${fmt(amount)}</div>`;
  container.appendChild(card);
  setTimeout(()=>{card.classList.add('removing');setTimeout(()=>{card.remove();setTimeout(drainAlerts,250);},420);},(isBig?6500:4000));
}

// =============================================
// TICKER
// =============================================
function addTicker(fromName,toName,amount){
  const ticker=document.getElementById('donation-ticker');
  const track=document.getElementById('ticker-track');
  if(!ticker||!track)return;
  ticker.style.display='flex';
  let inner=track.querySelector('.ticker-inner');
  if(!inner){inner=document.createElement('div');inner.className='ticker-inner';track.appendChild(inner);}
  const item=document.createElement('span');item.className='ticker-item';
  item.innerHTML=`💸 <span class="ti-name">@${esc(fromName)}</span> donated <span class="ti-amt">$${fmt(amount)}</span> to <span class="ti-name">@${esc(toName)}</span>`;
  inner.appendChild(item);
  while(inner.children.length>12)inner.removeChild(inner.firstChild);
}

// =============================================
// BIG DONATION OVERLAY (10K+) shown for ALL users
// =============================================
function triggerBigDonation(fromName, toName, amount, msg) {
  const overlay=document.getElementById('big-donation-overlay');
  if(!overlay)return;
  const el=(id,txt)=>{const e=document.getElementById(id);if(e)e.textContent=txt;};
  el('bdc-from','@'+fromName); el('bdc-to','@'+toName);
  el('bdc-amount','$'+fmt(amount)); el('bdc-msg',msg||'');
  el('bdc-emoji-row','🎆 💸 🎊 💸 🎆');
  overlay.style.display='flex';

  pulseRing(); setTimeout(pulseRing,280); setTimeout(pulseRing,560);
  confettiRain(160); floatMoney(25);

  const COLS=['#f5c518','#ff6b35','#00e676','#448aff','#b388ff','#ff4757','#fff','#ffd700'];
  const W=window.innerWidth,H=window.innerHeight;
  [[0,H],[W,H],[0,0],[W,0],[W/2,H]].forEach(([x,y],i)=>setTimeout(()=>burst(x,y,70,COLS,{speed:14,upBias:4,decay:0.007,size:7}),i*180));

  const fw=document.getElementById('big-fireworks');
  if(fw){
    fw.innerHTML='';
    const FC=['#f5c518','#ff6b35','#00e676','#448aff','#b388ff','#fff'];
    for(let b=0;b<14;b++) setTimeout(()=>{
      const wrap=document.createElement('div');
      wrap.style.cssText=`position:absolute;left:${5+Math.random()*90}%;top:${5+Math.random()*80}%;`;
      for(let p=0;p<14;p++){
        const pt=document.createElement('div'); pt.className='fw-particle';
        const ang=(p/14)*360,dist=28+Math.random()*55;
        pt.style.cssText=`background:${FC[~~(Math.random()*FC.length)]};width:${4+Math.random()*5}px;height:${4+Math.random()*5}px;--tx:${Math.cos(ang*Math.PI/180)*dist}px;--ty:${Math.sin(ang*Math.PI/180)*dist}px;--dur:${0.7+Math.random()*0.7}s`;
        wrap.appendChild(pt);
      }
      fw.appendChild(wrap);
    }, b*240);
  }
  setTimeout(()=>{overlay.style.display='none';if(fw)fw.innerHTML='';},7000);
}

// =============================================
// GLOBAL DONATION LISTENER (real-time all users)
// =============================================
function startGlobalDonationListener() {
  if(donationUnsubscribe)donationUnsubscribe();
  const q=query(collection(db,'donation_events'),orderBy('timestamp','desc'),limit(1));
  donationUnsubscribe=onSnapshot(q,snap=>{
    snap.docChanges().forEach(change=>{
      if(change.type!=='added')return;
      const id=change.doc.id;
      if(id===lastDonationEventId)return;
      lastDonationEventId=id;
      const ev=change.doc.data();
      if(ev.timestamp&&(Date.now()/1000-ev.timestamp.seconds)>12)return;
      pushAlert(ev.fromName,ev.toName,ev.amount,ev.msg);
      addTicker(ev.fromName,ev.toName,ev.amount);
      burst(window.innerWidth/2,window.innerHeight,35,['#f5c518','#ff6b35','#00e676','#448aff'],{speed:9,upBias:5,decay:0.009});
      if(ev.big&&ev.fromName!==userData?.username){
        triggerBigDonation(ev.fromName,ev.toName,ev.amount,ev.msg);
      }
    });
  });
}

// =============================================
// REAL-TIME EVENT LISTENER (Firestore-based so ALL users get it)
// =============================================
function startEventListener(){
  if(eventUnsubscribe)eventUnsubscribe();
  eventUnsubscribe=onSnapshot(doc(db,'settings','events'),snap=>{
    if(!snap.exists())return;
    const ev=snap.data();
    const now=Date.now();

    // Double income
    const newDI=ev.doubleIncome&&ev.doubleIncomeExpiry?.toMillis()>now;
    if(newDI&&!doubleIncomeActive){
      doubleIncomeActive=true;
      showEventBanner('🎉 DOUBLE INCOME EVENT','Income doubled! Ends in '+Math.ceil((ev.doubleIncomeExpiry.toMillis()-now)/60000)+' min','#f5c518');
      SFX.event();
    } else if(!newDI){doubleIncomeActive=false;}

    // Hot streak
    const newHS=ev.hotStreak&&ev.hotStreakExpiry?.toMillis()>now;
    if(newHS&&!hotStreakActive){
      hotStreakActive=true;
      showEventBanner('🔥 HOT STREAK EVENT','All wins doubled! Ends in '+Math.ceil((ev.hotStreakExpiry.toMillis()-now)/60000)+' min','#ff6b35');
      SFX.event();
    } else if(!newHS){hotStreakActive=false;}

    // VIP drop
    if(ev.vipDropActive!==undefined){
      vipDropActive=ev.vipDropActive;
      vipDropAmount=ev.vipDropAmount||1000;
      if(!ev.vipDropActive)vipDropClaimed=true;
    }
    updateEventBadge();
  });
}
// =============================================
window.addEventListener('load', ()=>{
  initParticles();
  generateCoinRain();
  loadAppSettings();
  checkAdminRoute();
  window.addEventListener('hashchange',checkAdminRoute);
  setTimeout(()=>{
    const s=document.getElementById('splash');
    if(!s)return;
    s.style.transition='opacity 0.7s ease';
    s.style.opacity='0';
    setTimeout(()=>s.style.display='none',720);
  },2000);
});

function checkAdminRoute(){if(window.location.hash==='#admin')showAdminLoginPage();}

function generateCoinRain(){
  const c=document.getElementById('coin-rain');if(!c)return;
  ['💰','💵','💸','🪙','💎'].forEach(em=>{
    for(let j=0;j<4;j++){
      const s=document.createElement('span');s.textContent=em;
      s.style.left=Math.random()*100+'vw';
      s.style.animationDuration=(3+Math.random()*5)+'s';
      s.style.animationDelay=(Math.random()*6)+'s';
      s.style.fontSize=(0.8+Math.random()*1.2)+'rem';
      c.appendChild(s);
    }
  });
}

// =============================================
// AUTH STATE — FIXED: always show app even if Firestore fails
// =============================================
onAuthStateChanged(auth, async user => {
  if (user) {
    currentUser = user;
    try {
      await loadUserData(user.uid);
    } catch(e) {
      console.error('loadUserData error:', e);
      // Create minimal userData so UI doesn't break
      userData = {
        uid: user.uid,
        username: user.displayName || user.email.split('@')[0],
        email: user.email,
        balance: 0,
        totalDonated: 0,
        totalReceived: 0,
        gamesPlayed: 0,
        gamesWon: 0,
        muted: false,
        banned: false,
      };
    }
    // Always navigate to app — even if Firestore had an error
    showAppPage();
    startIncomeTimer();
    startChatListener();
    startFeedListener();
    startGlobalDonationListener();
    startEventListener();
    injectVoiceUI();
  } else {
    currentUser = null; userData = null;
    stopIncomeTimer();
    [chatUnsubscribe, feedUnsubscribe, donationUnsubscribe, eventUnsubscribe].forEach(fn => fn && fn());
    const adminVisible =
      document.getElementById('admin-page').style.display === 'block' ||
      document.getElementById('admin-login-page').style.display === 'block';
    if (!adminVisible) showAuthPage();
  }
});

async function loadUserData(uid){
  const ref=doc(db,'users',uid);
  const snap=await getDoc(ref);
  if(snap.exists()){userData=snap.data();}
  else{
    const name=currentUser.displayName||currentUser.email.split('@')[0];
    userData={uid,username:name,email:currentUser.email,balance:50,totalDonated:0,totalReceived:0,gamesPlayed:0,gamesWon:0,muted:false,banned:false,createdAt:serverTimestamp(),lastSeen:serverTimestamp()};
    await setDoc(ref,userData);
    await addChatMsg({type:'system',text:`🎉 Welcome @${name} to GoDonate! You start with $50!`});
  }
  updateUI();
}

async function refreshUser(){
  if(!currentUser)return;
  try {
    const snap=await getDoc(doc(db,'users',currentUser.uid));
    if(snap.exists()){userData=snap.data();updateUI();}
  } catch(e) { console.error('refreshUser error:', e); }
}

function updateUI(){
  if(!userData)return;
  const b='$'+fmt(userData.balance||0);
  setText('balance-display',b);setText('nav-username','@'+userData.username);
  setText('home-balance',b);setText('home-donated','$'+fmt(userData.totalDonated||0));
  setText('home-games',userData.gamesPlayed||0);setText('home-username',userData.username);
  setText('profile-name','@'+userData.username);setText('profile-email',userData.email);
  setText('p-balance',b);setText('p-donated','$'+fmt(userData.totalDonated||0));
  setText('p-received','$'+fmt(userData.totalReceived||0));setText('p-games',userData.gamesPlayed||0);
}

function setText(id,val){const e=document.getElementById(id);if(e)e.textContent=val;}

// =============================================
// INCOME TIMER
// =============================================
function startIncomeTimer(){
  stopIncomeTimer();secondsToIncome=60;
  countdownInterval=setInterval(async()=>{
    secondsToIncome--;setText('next-income',secondsToIncome+'s');
    if(secondsToIncome<=0){
      secondsToIncome=60;
      const baseAmt=appSettings.incomePerMinute||5;
      const amt=doubleIncomeActive?baseAmt*2:baseAmt;
      try{
        await updateDoc(doc(db,'users',currentUser.uid),{balance:increment(amt),lastSeen:serverTimestamp()});
        userData.balance=(userData.balance||0)+amt;updateUI();showIncomePop(amt);SFX.income();
      }catch(e){ console.error('income timer error:', e); }
    }
  },1000);
}
function stopIncomeTimer(){if(countdownInterval)clearInterval(countdownInterval);}

function showIncomePop(amt){
  const el=document.createElement('div');
  el.textContent='+$'+amt+' 💰';
  el.style.cssText='position:fixed;top:70px;right:20px;background:rgba(0,230,118,0.15);border:1.5px solid #00e676;color:#00e676;padding:0.45rem 1.1rem;border-radius:100px;font-family:var(--font);font-weight:700;font-size:1rem;z-index:5000;animation:incPop 2.5s ease forwards;pointer-events:none';
  if(!document.getElementById('inc-kf')){const s=document.createElement('style');s.id='inc-kf';s.textContent='@keyframes incPop{0%{opacity:0;transform:translateY(0)}15%{opacity:1}80%{opacity:1}100%{opacity:0;transform:translateY(-70px)}}';document.head.appendChild(s);}
  document.body.appendChild(el);setTimeout(()=>el.remove(),2500);
}

// =============================================
// AUTH FUNCTIONS
// =============================================
window.switchAuthTab=tab=>{
  document.getElementById('login-form').style.display=tab==='login'?'block':'none';
  document.getElementById('signup-form').style.display=tab==='signup'?'block':'none';
  document.querySelectorAll('.auth-tab').forEach((t,i)=>t.classList.toggle('active',(i===0)===(tab==='login')));
};
window.emailLogin=async()=>{
  const email=val('login-email'),pass=val('login-pass'),err=document.getElementById('login-err');
  if(!email||!pass){err.textContent='Fill all fields.';return;}
  try{await signInWithEmailAndPassword(auth,email,pass);err.textContent='';}
  catch(e){err.textContent=e.code==='auth/invalid-credential'?'Wrong email or password.':e.message;}
};
window.emailSignup=async()=>{
  const name=val('signup-name'),email=val('signup-email'),pass=val('signup-pass');
  const err=document.getElementById('signup-err');
  if(!name||!email||!pass){err.textContent='Fill all fields.';return;}
  if(pass.length<6){err.textContent='Password 6+ chars.';return;}
  if(!/^[a-zA-Z0-9_]+$/.test(name)){err.textContent='Username: letters/numbers/underscores only.';return;}
  try{const cred=await createUserWithEmailAndPassword(auth,email,pass);await updateProfile(cred.user,{displayName:name});err.textContent='';}
  catch(e){err.textContent=e.code==='auth/email-already-in-use'?'Email taken.':e.message;}
};
window.googleLogin=async()=>{
  try{await signInWithPopup(auth,googleProvider);}
  catch(e){
    console.error('Google login error:',e);
    showToast('Google login failed: '+e.message,'error');
  }
};
window.logout=async()=>{stopIncomeTimer();await signOut(auth);showAuthPage();};

// =============================================
// PAGE NAVIGATION
// =============================================
function showAuthPage(){show('auth-page');hide('app-page');hide('admin-login-page');hide('admin-page');}
function showAppPage(){hide('auth-page');show('app-page');hide('admin-login-page');hide('admin-page');showSection('home');}
function showAdminLoginPage(){hide('auth-page');hide('app-page');show('admin-login-page');hide('admin-page');}
window.showAppPage=showAppPage;

window.showSection=sec=>{
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('active-sec'));
  document.querySelectorAll('.sidebar-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('sec-'+sec)?.classList.add('active-sec');
  document.querySelector(`[data-sec="${sec}"]`)?.classList.add('active');
  if(sec==='leaderboard')loadLB('donors');
  if(sec==='profile')loadProfile();
  if(sec==='chat')setTimeout(scrollChat,100);
};
function show(id){const e=document.getElementById(id);if(e)e.style.display='block';}
function hide(id){const e=document.getElementById(id);if(e)e.style.display='none';}
function val(id){return(document.getElementById(id)?.value||'').trim();}

// =============================================
// DONATION
// =============================================
window.searchUsers=async()=>{
  const q=val('donate-search').toLowerCase();
  const sug=document.getElementById('user-suggestions');
  if(q.length<2){sug.innerHTML='';return;}
  if(!allUsers.length){const snap=await getDocs(collection(db,'users'));allUsers=snap.docs.map(d=>d.data()).filter(u=>u.uid!==currentUser?.uid);}
  const matches=allUsers.filter(u=>u.username?.toLowerCase().includes(q)||u.email?.toLowerCase().includes(q)).slice(0,6);
  sug.innerHTML=matches.length?matches.map(u=>`<div class="suggestion-item" onclick="selectUser('${u.uid}','${esc(u.username)}')">@${esc(u.username)} <span style="color:var(--muted);font-size:0.8em">${esc(u.email)}</span></div>`).join(''):'<div class="suggestion-item" style="color:var(--muted)">No users found</div>';
};
window.selectUser=(uid,username)=>{
  selectedDonateUser={uid,username};
  const d=document.getElementById('selected-user-display');
  d.textContent='@'+username;d.className='selected-user has-user';
  document.getElementById('user-suggestions').innerHTML='';
  document.getElementById('donate-search').value='';
};
window.setDonateAmount=amt=>{document.getElementById('donate-amount').value=amt;};

window.sendDonation=async()=>{
  if(!selectedDonateUser){showToast('Select a user first!','error');return;}
  const amount=parseInt(document.getElementById('donate-amount').value);
  const msg=val('donate-msg');
  if(!amount||amount<1){showToast('Enter a valid amount!','error');return;}
  if((userData?.balance||0)<amount){showToast('Not enough balance! 💸','error');return;}
  const isBig=amount>=(appSettings.bigDonateThreshold||10000);
  try{
    await runTransaction(db,async tx=>{
      const sRef=doc(db,'users',currentUser.uid),rRef=doc(db,'users',selectedDonateUser.uid);
      const sSnap=await tx.get(sRef),rSnap=await tx.get(rRef);
      if(!sSnap.exists()||!rSnap.exists())throw new Error('User not found');
      if(sSnap.data().balance<amount)throw new Error('Insufficient balance');
      tx.update(sRef,{balance:increment(-amount),totalDonated:increment(amount)});
      tx.update(rRef,{balance:increment(amount),totalReceived:increment(amount)});
    });
    await addDoc(collection(db,'transactions'),{from:currentUser.uid,fromName:userData.username,to:selectedDonateUser.uid,toName:selectedDonateUser.username,amount,msg,timestamp:serverTimestamp()});
    const chatText=isBig?`🚨 @${userData.username} sent a MEGA $${fmt(amount)} to @${selectedDonateUser.username}!! 🎆🎆🎆`:`💝 @${userData.username} donated $${fmt(amount)} to @${selectedDonateUser.username}${msg?` — "${msg}"`:'' }`;
    await addChatMsg({type:'donation-alert',text:chatText,amount});
    await addDoc(collection(db,'donation_events'),{fromName:userData.username,toName:selectedDonateUser.username,amount,msg,timestamp:serverTimestamp(),big:isBig});
    userData.balance-=amount;userData.totalDonated=(userData.totalDonated||0)+amount;updateUI();
    floatMoney(isBig?20:8);
    burst(window.innerWidth/2,window.innerHeight*0.7,40,['#f5c518','#ff6b35','#00e676','#fff'],{speed:8,upBias:3});
    if(isBig){SFX.megaDonation();triggerBigDonation(userData.username,selectedDonateUser.username,amount,msg);}
    else{SFX.donation();}
    showToast(`💝 Sent $${fmt(amount)} to @${selectedDonateUser.username}!`,'success');
    document.getElementById('donate-amount').value='';document.getElementById('donate-msg').value='';
    selectedDonateUser=null;allUsers=[];
    document.getElementById('selected-user-display').textContent='No one selected';
    document.getElementById('selected-user-display').className='selected-user';
  }catch(e){showToast(e.message||'Donation failed','error');}
};

// =============================================
// LIVE FEED
// =============================================
function startFeedListener(){
  if(feedUnsubscribe)feedUnsubscribe();
  const q=query(collection(db,'transactions'),orderBy('timestamp','desc'),limit(10));
  feedUnsubscribe=onSnapshot(q,snap=>{
    const list=document.getElementById('live-feed-list');if(!list)return;
    if(snap.empty){list.innerHTML='<div class="feed-empty">No activity yet...</div>';return;}
    list.innerHTML='';
    snap.forEach(d=>{
      const tx=d.data();
      const div=document.createElement('div');div.className='feed-item';
      div.innerHTML=`<span>💝</span><span><b>@${esc(tx.fromName)}</b> ➜ <b>@${esc(tx.toName)}</b>${tx.msg?` <em style="color:var(--muted)">"${esc(tx.msg)}"</em>`:''}</span><span style="margin-left:auto;color:var(--accent);font-family:var(--mono);font-weight:700">$${fmt(tx.amount)}</span>`;
      list.appendChild(div);
    });
  },err=>console.error('feed error:',err));
}

// =============================================
// LEADERBOARD
// =============================================
window.showLbTab=async(tab,btn)=>{document.querySelectorAll('.lb-tab').forEach(b=>b.classList.remove('active'));btn?.classList.add('active');await loadLB(tab);};
async function loadLB(tab){
  const list=document.getElementById('lb-list');
  list.innerHTML='<div style="color:var(--muted);text-align:center;padding:2rem">Loading...</div>';
  const f={donors:'totalDonated',rich:'balance',received:'totalReceived'}[tab]||'totalDonated';
  try{
    const snap=await getDocs(query(collection(db,'users'),orderBy(f,'desc'),limit(20)));
    list.innerHTML='';
    snap.forEach(d=>{
      const u=d.data(),rank=list.children.length+1;
      const medal=rank===1?'🥇':rank===2?'🥈':rank===3?'🥉':rank;
      const div=document.createElement('div');div.className='lb-item'+(u.uid===currentUser?.uid?' lb-me':'');
      div.innerHTML=`<div class="lb-rank">${medal}</div><div class="lb-name">@${esc(u.username)}</div><div class="lb-val">$${fmt(u[f]||0)}</div>`;
      list.appendChild(div);
    });
    if(!snap.size)list.innerHTML='<div style="color:var(--muted);text-align:center;padding:2rem">No data yet</div>';
  }catch(e){console.error('lb error:',e);list.innerHTML='<div style="color:var(--red);text-align:center">Error loading — check Firestore rules</div>';}
}

// =============================================
// CHAT
// =============================================
function startChatListener(){
  if(chatUnsubscribe)chatUnsubscribe();
  const q=query(collection(db,'chat'),orderBy('timestamp','asc'),limit(120));
  chatUnsubscribe=onSnapshot(q,snap=>{
    const main=document.getElementById('chat-messages'),mini=document.getElementById('chat-mini-msgs');
    if(!main)return;main.innerHTML='';mini.innerHTML='';
    snap.forEach(d=>{renderMsg(main,d.data());renderMiniMsg(mini,d.data());});
    scrollChat();
  },err=>console.error('chat error:',err));
}
function renderMsg(container,msg){
  const div=document.createElement('div');
  const isSys=msg.type==='system'||msg.type==='pinned',isDon=msg.type==='donation-alert';
  div.className=`chat-msg${isSys?' system-msg':''}${isDon?' donation-alert':''}${msg.type==='pinned'?' pinned-msg':''}`;
  const time=msg.timestamp?.toDate?.()?.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})||'';
  const initials=(msg.username||'??').substring(0,2).toUpperCase();
  div.innerHTML=`<div class="msg-avatar">${isSys?'📢':isDon?'💝':initials}</div><div class="msg-content"><div class="msg-header"><span class="msg-name${isSys?' bot-name':''}">${isSys?'🤖 GoDonate Bot':'@'+esc(msg.username||'?')}</span><span class="msg-time">${time}</span>${msg.type==='pinned'?'<span class="pin-tag">📌</span>':''}</div><div class="msg-bubble">${esc(msg.text||'')}</div></div>`;
  container.appendChild(div);
}
function renderMiniMsg(container,msg){
  const div=document.createElement('div');div.className='mini-msg';
  const name=(msg.type==='system'||msg.type==='pinned')?'🤖':'@'+(msg.username||'?');
  div.innerHTML=`<span class="mini-name">${esc(name)}</span> ${esc((msg.text||'').substring(0,55))}`;
  container.appendChild(div);container.scrollTop=container.scrollHeight;
}
function scrollChat(){const c=document.getElementById('chat-messages');if(c)c.scrollTop=c.scrollHeight;}
async function addChatMsg(data){
  try { await addDoc(collection(db,'chat'),{...data,timestamp:serverTimestamp()}); }
  catch(e){ console.error('addChatMsg error:',e); }
}
window.sendChatMsg=async()=>{
  if(!currentUser||!userData)return;
  if(userData.muted){showToast('You are muted! 🤐','error');return;}
  const input=document.getElementById('chat-input'),text=input.value.trim();
  if(!text)return;input.value='';

  // Handle !claim command
  if(text.toLowerCase()==='!claim'){
    if(!vipDropActive){showToast('No VIP Drop active right now! 👀','error');return;}
    if(vipDropClaimed){showToast('VIP Drop already claimed! 😢','error');return;}
    // Optimistically lock it
    vipDropClaimed=true;
    try{
      await runTransaction(db,async tx=>{
        const evRef=doc(db,'settings','events');
        const evSnap=await tx.get(evRef);
        if(!evSnap.exists()||!evSnap.data().vipDropActive)throw new Error('Drop already claimed!');
        tx.update(evRef,{vipDropActive:false});
        const userRef=doc(db,'users',currentUser.uid);
        tx.update(userRef,{balance:increment(vipDropAmount)});
      });
      userData.balance=(userData.balance||0)+vipDropAmount;updateUI();
      await addChatMsg({type:'system',text:`🎉 @${userData.username} claimed the VIP Drop and got $${fmt(vipDropAmount)}! 👑`});
      winBurst();floatMoney(15);confettiRain(80);SFX.jackpot();
      showToast(`💎 You claimed $${fmt(vipDropAmount)}! 🎉`,'gold');
    }catch(e){vipDropClaimed=false;showToast(e.message||'Claim failed!','error');}
    return;
  }

  await addChatMsg({type:'user',uid:currentUser.uid,username:userData.username,text});
};
window.addEmoji=emoji=>{const inp=document.getElementById('chat-input');inp.value+=emoji;inp.focus();};

// =============================================
// PROFILE
// =============================================
async function loadProfile(){
  if(!currentUser)return;
  await refreshUser();
  const txList=document.getElementById('tx-list');
  txList.innerHTML='<div style="color:var(--muted);font-size:0.85rem;padding:0.5rem">Loading...</div>';
  try{
    const[s1,s2]=await Promise.all([
      getDocs(query(collection(db,'transactions'),where('from','==',currentUser.uid),orderBy('timestamp','desc'),limit(10))),
      getDocs(query(collection(db,'transactions'),where('to','==',currentUser.uid),orderBy('timestamp','desc'),limit(10))),
    ]);
    const txs=[];
    s1.forEach(d=>txs.push({...d.data(),dir:'sent'}));
    s2.forEach(d=>txs.push({...d.data(),dir:'recv'}));
    txs.sort((a,b)=>(b.timestamp?.seconds||0)-(a.timestamp?.seconds||0));
    txList.innerHTML='';
    if(!txs.length){txList.innerHTML='<div style="color:var(--muted);font-size:0.85rem;padding:1rem">No transactions yet</div>';return;}
    txs.slice(0,15).forEach(tx=>{
      const div=document.createElement('div');div.className='tx-item';
      const sent=tx.dir==='sent';
      div.innerHTML=`<span>${sent?'↗️ To @'+esc(tx.toName):'↙️ From @'+esc(tx.fromName)}</span><span class="tx-amount ${sent?'neg':'pos'}">${sent?'-':'+'}$${fmt(tx.amount)}</span>`;
      txList.appendChild(div);
    });
  }catch(e){console.error('profile error:',e);txList.innerHTML='<div style="color:var(--red)">Error loading — check Firestore rules</div>';}
}

// =============================================
// GAME HELPERS
// =============================================
async function placeBet(amount){
  if((userData?.balance||0)<amount){showToast('Not enough balance! 💸','error');return false;}
  try {
    await updateDoc(doc(db,'users',currentUser.uid),{balance:increment(-amount),gamesPlayed:increment(1)});
  } catch(e){ console.error('placeBet error:',e); }
  userData.balance-=amount;userData.gamesPlayed=(userData.gamesPlayed||0)+1;updateUI();return true;
}
async function addWin(amount){
  try {
    await updateDoc(doc(db,'users',currentUser.uid),{balance:increment(amount),gamesWon:increment(1)});
  } catch(e){ console.error('addWin error:',e); }
  userData.balance+=amount;userData.gamesWon=(userData.gamesWon||0)+1;updateUI();
}
function setResult(id,text,type){const e=document.getElementById(id);if(e){e.textContent=text;e.className='game-result '+type;}}
function getBet(id){const v=parseInt(document.getElementById(id)?.value);if(!v||v<1){showToast('Enter a valid bet!','error');return null;}return v;}
const WIN_C=['#f5c518','#00e676','#fff700','#fff'];
const LOSE_C=['#ff4757','#ff6b35','#ff0000'];

// =============================================
// COIN FLIP
// =============================================
window.setCoinChoice=choice=>{
  cfChoice=choice;
  document.getElementById('cf-heads').classList.toggle('selected',choice==='heads');
  document.getElementById('cf-tails').classList.toggle('selected',choice==='tails');
};
window.playCoinFlip=async()=>{
  const bet=getBet('cf-bet');if(!bet||!cfChoice){showToast('Choose Heads or Tails!','error');return;}
  const ok=await placeBet(bet);if(!ok)return;
  const coin=document.getElementById('coin-display');coin.classList.add('spinning');
  SFX.spin();
  await sleep(1200);coin.classList.remove('spinning');
  const result=Math.random()<0.5?'heads':'tails';
  coin.textContent=result==='heads'?'👑':'🦅';
  const mult=hotStreakActive?2:1;
  if(result===cfChoice){
    SFX.win();
    await addWin(bet*2*mult);setResult('cf-result',`${result==='heads'?'👑':'🦅'} WIN! +$${fmt(bet*mult)} 🎉${hotStreakActive?' 🔥2x!':''}`,'win');
    winBurst();floatMoney(6);burst(window.innerWidth/2,window.innerHeight*0.6,50,WIN_C,{speed:7,upBias:3});
  }else{SFX.lose();setResult('cf-result',`${result==='heads'?'👑':'🦅'} ${result.toUpperCase()} — Lose $${fmt(bet)} 😢`,'lose');burst(window.innerWidth/2,window.innerHeight*0.6,20,LOSE_C,{speed:4,upBias:1});}
};

// =============================================
// DICE
// =============================================
const DICE_EM=['','1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣'];
window.playDice=async()=>{
  const bet=getBet('dice-bet');if(!bet)return;
  const guess=parseInt(document.getElementById('dice-guess').value);
  if(!guess||guess<1||guess>6){showToast('Guess 1–6!','error');return;}
  const ok=await placeBet(bet);if(!ok)return;
  const el=document.getElementById('dice-display');el.classList.add('rolling');
  SFX.spin();
  await sleep(1000);el.classList.remove('rolling');
  const result=~~(Math.random()*6)+1;el.textContent=DICE_EM[result];
  const mult=hotStreakActive?2:1;
  if(result===guess){
    SFX.win();
    await addWin(bet*5*mult);setResult('dice-result',`Rolled ${result} — EXACT! ${5*mult}x! +$${fmt(bet*5*mult-bet)} 🎲🎉${hotStreakActive?' 🔥':''}`,'win');
    winBurst();floatMoney(8);burst(window.innerWidth/2,window.innerHeight*0.6,60,WIN_C,{speed:8,upBias:4});
  }else{SFX.lose();setResult('dice-result',`Rolled ${result}. Guessed ${guess}. -$${fmt(bet)} 😢`,'lose');}
};

// =============================================
// SLOTS
// =============================================
const SLOT_SYMS=['🍒','🍋','🍊','🍇','⭐','💎','7️⃣','🎰'];
const SLOT_PAY={'🍒🍒🍒':5,'🍋🍋🍋':4,'🍊🍊🍊':4,'🍇🍇🍇':6,'⭐⭐⭐':20,'💎💎💎':50,'7️⃣7️⃣7️⃣':77,'🎰🎰🎰':100};
window.playSlots=async()=>{
  const bet=getBet('slots-bet');if(!bet)return;
  const ok=await placeBet(bet);if(!ok)return;
  const reels=['slot1','slot2','slot3'].map(id=>document.getElementById(id));
  reels.forEach(r=>r.classList.add('spinning'));
  SFX.spin();
  await sleep(400);reels[0].textContent=SLOT_SYMS[~~(Math.random()*SLOT_SYMS.length)];reels[0].classList.remove('spinning');SFX.coin();
  await sleep(400);reels[1].textContent=SLOT_SYMS[~~(Math.random()*SLOT_SYMS.length)];reels[1].classList.remove('spinning');SFX.coin();
  await sleep(400);reels[2].textContent=SLOT_SYMS[~~(Math.random()*SLOT_SYMS.length)];reels[2].classList.remove('spinning');SFX.coin();
  const mult=hotStreakActive?2:1;
  const combo=reels.map(r=>r.textContent).join(''),pay=SLOT_PAY[combo];
  if(pay){
    const totalPay=pay*mult;
    if(totalPay>=20) SFX.jackpot(); else SFX.win();
    await addWin(bet*totalPay);setResult('slots-result',`${combo} = ${totalPay}x! +$${fmt(bet*(totalPay-1))} 🎰🎉${hotStreakActive?' 🔥':''}`,'win');
    winBurst();floatMoney(totalPay>=20?20:8);burst(window.innerWidth/2,window.innerHeight*0.5,totalPay>=20?100:50,WIN_C,{speed:totalPay>=20?12:7,upBias:4});
    if(totalPay>=20){confettiRain(80);showToast(`🎰 JACKPOT ${totalPay}x! 🎉`,'gold');}
  }else{
    const r=reels.map(r=>r.textContent);
    if(r[0]===r[1]||r[1]===r[2]||r[0]===r[2]){SFX.tie();await addWin(Math.floor(bet*1.5));setResult('slots-result',`2 match — +$${fmt(Math.floor(bet*0.5))}`,'tie');}
    else{SFX.lose();setResult('slots-result',`No match — -$${fmt(bet)} 😢`,'lose');}
  }
};

// =============================================
// NUMBER GUESS
// =============================================
window.playGuess=async()=>{
  const bet=getBet('guess-bet');if(!bet)return;
  const guess=parseInt(document.getElementById('guess-num').value);
  if(!guess||guess<1||guess>100){showToast('Guess 1–100!','error');return;}
  const ok=await placeBet(bet);if(!ok)return;
  document.getElementById('guess-display').textContent='🤔';await sleep(900);
  const ans=~~(Math.random()*100)+1;document.getElementById('guess-display').textContent=ans;
  const diff=Math.abs(ans-guess);
  const mult=hotStreakActive?2:1;
  if(diff===0){SFX.jackpot();await addWin(bet*10*mult);setResult('guess-result',`EXACT! ${ans}! ${10*mult}x! +$${fmt(bet*10*mult-bet)} 🎯🎉${hotStreakActive?' 🔥':''}`,'win');winBurst();floatMoney(15);confettiRain(60);}
  else if(diff<=5){SFX.win();await addWin(bet*3*mult);setResult('guess-result',`So close! ${ans} — ${3*mult}x! +$${fmt(bet*3*mult-bet)}${hotStreakActive?' 🔥':''}`,'win');winBurst();floatMoney(6);}
  else if(diff<=10){SFX.tie();await addWin(Math.floor(bet*1.5));setResult('guess-result',`Almost! ${ans} — 1.5x! +$${fmt(Math.floor(bet*0.5))}`,'tie');}
  else{SFX.lose();setResult('guess-result',`Answer was ${ans}. Off by ${diff}. -$${fmt(bet)} 😢`,'lose');}
};

// =============================================
// ROCK PAPER SCISSORS
// =============================================
const RPS_EM={rock:'✊',paper:'✋',scissors:'✌️'};
const RPS_BEATS={rock:'scissors',paper:'rock',scissors:'paper'};
window.playRPS=async choice=>{
  const bet=getBet('rps-bet');if(!bet)return;
  const ok=await placeBet(bet);if(!ok)return;
  SFX.click();
  document.getElementById('rps-player').textContent=RPS_EM[choice];
  document.getElementById('rps-cpu').textContent='🤔';await sleep(800);
  const cpu=['rock','paper','scissors'][~~(Math.random()*3)];
  document.getElementById('rps-cpu').textContent=RPS_EM[cpu];
  const mult=hotStreakActive?2:1;
  if(choice===cpu){SFX.tie();await addWin(bet);setResult('rps-result','TIE! Bet returned.','tie');}
  else if(RPS_BEATS[choice]===cpu){SFX.win();await addWin(bet*2*mult);setResult('rps-result',`WIN! ${RPS_EM[choice]} beats ${RPS_EM[cpu]}! +$${fmt(bet*mult)} 🎉${hotStreakActive?' 🔥':''}`,'win');winBurst();floatMoney(5);burst(window.innerWidth/2,window.innerHeight*0.6,40,WIN_C,{speed:6,upBias:3});}
  else{SFX.lose();setResult('rps-result',`LOSE! ${RPS_EM[cpu]} beats ${RPS_EM[choice]}. -$${fmt(bet)} 😢`,'lose');}
};

// =============================================
// BLACKJACK
// =============================================
function mkDeck(){return['♠','♥','♦','♣'].flatMap(s=>['A','2','3','4','5','6','7','8','9','10','J','Q','K'].map(v=>({s,v}))).sort(()=>Math.random()-0.5);}
function cVal(c){if(['J','Q','K'].includes(c.v))return 10;if(c.v==='A')return 11;return+c.v;}
function hTot(h){let t=h.reduce((s,c)=>s+cVal(c),0),a=h.filter(c=>c.v==='A').length;while(t>21&&a--)t-=10;return t;}
function renderHand(id,hand,hide2=false){
  const el=document.getElementById(id);el.innerHTML='';
  hand.forEach((c,i)=>{const div=document.createElement('div');if(i===1&&hide2){div.className='bj-card back';div.textContent='🂠';}else{div.className='bj-card'+(['♥','♦'].includes(c.s)?' red':'');div.textContent=c.v+c.s;}el.appendChild(div);});
}
window.bjDeal=async()=>{
  const bet=getBet('bj-bet');if(!bet)return;const ok=await placeBet(bet);if(!ok)return;
  bjGameActive=true;bjDeck=mkDeck();bjPlayerHand=[bjDeck.pop(),bjDeck.pop()];bjDealerHand=[bjDeck.pop(),bjDeck.pop()];
  renderHand('player-cards',bjPlayerHand);renderHand('dealer-cards',bjDealerHand,true);
  setText('player-score','Total: '+hTot(bjPlayerHand));setText('dealer-score','Total: ?');
  document.getElementById('bj-hit').disabled=false;document.getElementById('bj-stand').disabled=false;
  document.getElementById('bj-result').textContent='';document.getElementById('bj-result').className='game-result';
  if(hTot(bjPlayerHand)===21)bjEnd(bet,'bj');
};
window.bjHit=()=>{if(!bjGameActive)return;const bet=parseInt(document.getElementById('bj-bet').value);bjPlayerHand.push(bjDeck.pop());renderHand('player-cards',bjPlayerHand);const t=hTot(bjPlayerHand);setText('player-score','Total: '+t);if(t>21)bjEnd(bet,'bust');else if(t===21)bjEnd(bet,'stand');};
window.bjStand=()=>{if(!bjGameActive)return;const bet=parseInt(document.getElementById('bj-bet').value);while(hTot(bjDealerHand)<17)bjDealerHand.push(bjDeck.pop());bjEnd(bet,'stand');};
async function bjEnd(bet,mode){
  bjGameActive=false;document.getElementById('bj-hit').disabled=true;document.getElementById('bj-stand').disabled=true;
  renderHand('dealer-cards',bjDealerHand);const p=hTot(bjPlayerHand),d=hTot(bjDealerHand);
  setText('player-score','Total: '+p);setText('dealer-score','Total: '+d);
  if(mode==='bj'){SFX.jackpot();await addWin(Math.floor(bet*2.5));setResult('bj-result',`🃏 BLACKJACK! +$${fmt(Math.floor(bet*1.5))}`,'win');winBurst();floatMoney(10);confettiRain(50);}
  else if(mode==='bust'||p>21){SFX.lose();setResult('bj-result',`💥 Bust (${p})! -$${fmt(bet)}`,'lose');}
  else if(d>21){SFX.win();await addWin(bet*2);setResult('bj-result',`🎉 Dealer busts! +$${fmt(bet)}`,'win');winBurst();floatMoney(8);}
  else if(p>d){SFX.win();await addWin(bet*2);setResult('bj-result',`🎉 Win! ${p} vs ${d}. +$${fmt(bet)}`,'win');winBurst();floatMoney(8);burst(window.innerWidth/2,window.innerHeight*0.6,50,WIN_C,{speed:7,upBias:3});}
  else if(p<d){SFX.lose();setResult('bj-result',`😢 Dealer wins ${d} vs ${p}. -$${fmt(bet)}`,'lose');}
  else{SFX.tie();await addWin(bet);setResult('bj-result',`🤝 Push! ${p} vs ${d}. Returned.`,'tie');}
}

// =============================================
// ROULETTE
// =============================================
const RED_N=[1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
window.setRouBet=type=>{
  rouBetType=type;
  document.querySelectorAll('.rou-btn').forEach(b=>b.classList.toggle('selected',b.dataset.bet===type));
  setText('rou-selection','Selected: '+type);
};
window.playRoulette=async()=>{
  if(!rouBetType){showToast('Pick a bet type!','error');return;}
  const bet=getBet('rou-bet');if(!bet)return;const ok=await placeBet(bet);if(!ok)return;
  const wheel=document.getElementById('roulette-wheel');
  SFX.spin();
  wheel.style.animation='coinSpin 0.25s linear infinite';await sleep(1600);wheel.style.animation='';
  const num=~~(Math.random()*37),isRed=RED_N.includes(num),isGreen=num===0;
  wheel.textContent=isGreen?'0🟢':(isRed?num+'🔴':num+'⚫');
  let win=false,mult=2;
  if(rouBetType==='red'&&isRed)win=true;
  else if(rouBetType==='black'&&!isRed&&!isGreen)win=true;
  else if(rouBetType==='green'&&isGreen){win=true;mult=14;}
  else if(rouBetType==='odd'&&num>0&&num%2!==0)win=true;
  else if(rouBetType==='even'&&num>0&&num%2===0)win=true;
  const hsMult=hotStreakActive?2:1;
  if(win){
    const totalMult=mult*hsMult;
    if(totalMult>=14) SFX.jackpot(); else SFX.win();
    await addWin(bet*totalMult);setResult('rou-result',`${wheel.textContent} WIN! ${totalMult}x! +$${fmt(bet*(totalMult-1))} 🎉${hotStreakActive?' 🔥':''}`,'win');
    winBurst();floatMoney(totalMult>=14?15:6);burst(window.innerWidth/2,window.innerHeight*0.6,totalMult>=14?80:40,WIN_C,{speed:totalMult>=14?10:6,upBias:3});
    if(totalMult>=14)confettiRain(70);
  }else{SFX.lose();setResult('rou-result',`${wheel.textContent} — -$${fmt(bet)} 😢`,'lose');}
};

// =============================================
// CRASH GAME
// =============================================
function genCrash(){const r=Math.random();if(r<0.05)return 1.0+Math.random()*0.15;if(r<0.40)return 1.2+Math.random()*1.4;if(r<0.70)return 2.5+Math.random()*3.0;if(r<0.90)return 5.0+Math.random()*5.0;return 10+Math.random()*40;}
window.startCrash=async()=>{
  if(crashActive)return;const bet=getBet('crash-bet');if(!bet)return;
  const autoOut=parseFloat(document.getElementById('crash-auto').value)||0;
  const ok=await placeBet(bet);if(!ok)return;
  crashBet=bet;crashMultiplier=1.0;crashActive=true;crashTarget=genCrash();
  document.getElementById('crash-start-btn').disabled=true;document.getElementById('crash-cashout-btn').disabled=false;
  document.getElementById('crash-result').textContent='';document.getElementById('crash-result').className='game-result';
  const mEl=document.getElementById('crash-mult'),fEl=document.getElementById('crash-fill');
  mEl.classList.remove('danger');fEl.classList.remove('danger');
  crashInterval=setInterval(async()=>{
    crashMultiplier=Math.round((crashMultiplier+0.03)*100)/100;
    const pct=Math.min((crashMultiplier/10)*100,100);mEl.textContent=crashMultiplier.toFixed(2)+'x';fEl.style.width=pct+'%';
    if(crashMultiplier>=5){mEl.classList.add('danger');fEl.classList.add('danger');}
    if(autoOut>0&&crashMultiplier>=autoOut){await doCashout();return;}
    if(crashMultiplier>=crashTarget){
      clearInterval(crashInterval);crashActive=false;
      SFX.crash();
      mEl.textContent='💥 CRASH @ '+crashTarget.toFixed(2)+'x';
      document.getElementById('crash-start-btn').disabled=false;document.getElementById('crash-cashout-btn').disabled=true;
      setResult('crash-result',`💥 Crashed @ ${crashTarget.toFixed(2)}x! -$${fmt(crashBet)} 😢`,'lose');
      burst(window.innerWidth/2,window.innerHeight*0.5,30,LOSE_C,{speed:6,upBias:2});
    }
  },100);
};
async function doCashout(){
  if(!crashActive)return;clearInterval(crashInterval);crashActive=false;
  SFX.cashout();
  const win=Math.floor(crashBet*crashMultiplier);await addWin(win);
  document.getElementById('crash-mult').classList.remove('danger');document.getElementById('crash-fill').classList.remove('danger');
  document.getElementById('crash-start-btn').disabled=false;document.getElementById('crash-cashout-btn').disabled=true;
  setResult('crash-result',`💰 Cashed out @ ${crashMultiplier.toFixed(2)}x! +$${fmt(win-crashBet)} 🎉`,'win');
  winBurst();floatMoney(8);burst(window.innerWidth/2,window.innerHeight*0.6,50,WIN_C,{speed:8,upBias:4});
}
window.cashoutCrash=()=>doCashout();

// =============================================
// ADMIN
// =============================================
window.adminLogin=async()=>{
  const u=val('adm-user'),p=val('adm-pass'),err=document.getElementById('adm-err');
  if(u===ADMIN_USER&&p===ADMIN_PASS){
    err.textContent='';
    // Sign in anonymously so Firestore auth works for admin reads/writes
    try{
      if(!auth.currentUser) await signInAnonymously(auth);
    }catch(e){console.warn('anon sign in failed',e);}
    hide('admin-login-page');show('admin-page');loadAdminPanel();
  } else err.textContent='Invalid credentials.';
};
window.adminLogout=()=>{hide('admin-page');if(currentUser)showAppPage();else showAuthPage();};
window.showAdminTab=(tab,btn)=>{
  document.querySelectorAll('.admin-tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.admin-nav-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('atab-'+tab)?.classList.add('active');btn?.classList.add('active');
  if(tab==='users')loadAdminUsers();if(tab==='transactions')loadAdminTx();
};
async function loadAdminPanel(){
  try{
    const[uS,tS,cS]=await Promise.all([getDocs(collection(db,'users')),getDocs(collection(db,'transactions')),getDocs(collection(db,'chat'))]);
    let tot=0;tS.forEach(d=>tot+=d.data().amount||0);
    setText('as-users',uS.size);setText('as-donations','$'+fmt(tot));setText('as-msgs',cS.size);setText('as-active',uS.size);
    const recent=await getDocs(query(collection(db,'transactions'),orderBy('timestamp','desc'),limit(10)));
    const c=document.getElementById('admin-recent-donations');c.innerHTML='';
    recent.forEach(d=>{const tx=d.data();const div=document.createElement('div');div.className='admin-tx-item';div.innerHTML=`<span>@${esc(tx.fromName)} ➜ @${esc(tx.toName)}</span><span style="color:var(--accent);font-family:var(--mono)">$${fmt(tx.amount)}</span>`;c.appendChild(div);});
  }catch(e){console.error('admin panel error:',e);}
}
async function loadAdminUsers(filter=''){
  const c=document.getElementById('admin-users-list');c.innerHTML='<div style="color:var(--muted)">Loading...</div>';
  try {
    const snap=await getDocs(collection(db,'users'));c.innerHTML='';
    snap.forEach(d=>{
      const u=d.data();
      if(filter&&!u.username?.toLowerCase().includes(filter.toLowerCase())&&!u.email?.toLowerCase().includes(filter.toLowerCase()))return;
      const div=document.createElement('div');div.className='admin-user-item';
      div.innerHTML=`<div style="flex:1"><div class="aui-name">@${esc(u.username)} ${u.muted?'🤐':''}</div><div style="font-size:0.78rem;color:var(--muted)">${esc(u.email)}</div></div><div class="aui-balance">$${fmt(u.balance||0)}</div><div class="aui-actions"><button class="btn-secondary" style="font-size:0.8rem;padding:0.3rem 0.6rem" onclick="adminGive('${u.uid}','${esc(u.username)}')">💰</button><button class="btn-secondary" style="font-size:0.8rem;padding:0.3rem 0.6rem" onclick="adminMute('${u.uid}',${!u.muted})">${u.muted?'🔊':'🤐'}</button><button class="btn-danger" style="font-size:0.8rem;padding:0.3rem 0.5rem" onclick="adminReset('${u.uid}','${esc(u.username)}')">Reset</button></div>`;
      c.appendChild(div);
    });
  } catch(e){ c.innerHTML='<div style="color:var(--red)">Error loading users</div>'; }
}
async function loadAdminTx(){
  const c=document.getElementById('admin-tx-list');c.innerHTML='';
  try {
    const snap=await getDocs(query(collection(db,'transactions'),orderBy('timestamp','desc'),limit(50)));
    snap.forEach(d=>{const tx=d.data();const div=document.createElement('div');div.className='admin-tx-item';div.innerHTML=`<span>@${esc(tx.fromName)} ➜ @${esc(tx.toName)}</span><span style="color:var(--muted);font-size:0.8rem">${esc(tx.msg||'')}</span><span style="color:var(--accent);font-family:var(--mono)">$${fmt(tx.amount)}</span>`;c.appendChild(div);});
    if(!snap.size)c.innerHTML='<div style="color:var(--muted);text-align:center;padding:2rem">No transactions yet</div>';
  } catch(e){ c.innerHTML='<div style="color:var(--red)">Error loading transactions</div>'; }
}
window.adminSearchUsers=q=>loadAdminUsers(q);
window.adminGive=async(uid,username)=>{const amt=prompt(`Give how much to @${username}?`);if(!amt||isNaN(amt))return;await updateDoc(doc(db,'users',uid),{balance:increment(parseInt(amt))});showToast(`Gave $${amt} to @${username}! ✅`,'success');loadAdminUsers();};
window.adminMute=async(uid,mute)=>{await updateDoc(doc(db,'users',uid),{muted:mute});showToast(mute?'Muted 🤐':'Unmuted 🔊','success');loadAdminUsers();};
window.adminReset=async(uid,username)=>{if(!confirm(`Reset @${username}'s balance?`))return;await updateDoc(doc(db,'users',uid),{balance:0});showToast(`Balance reset`,'success');loadAdminUsers();};
window.sendAnnouncement=async(type='system')=>{const text=document.getElementById('announce-text').value.trim();if(!text){showToast('Write something first!','error');return;}await addChatMsg({type,text,username:'GoDonate Bot'});document.getElementById('announce-text').value='';showToast('Announcement sent! 📢','success');};
window.sendBotMsg=async text=>{
  await addChatMsg({type:'system',text,username:'GoDonate Bot'});
  const now=new Date();

  // 💎 VIP Drop — write to Firestore so all users see it
  if(text.includes('!claim')){
    const match=text.match(/\$(\d+)/);
    const amt=match?parseInt(match[1]):1000;
    await setDoc(doc(db,'settings','events'),{
      vipDropActive:true, vipDropAmount:amt
    },{merge:true});
    SFX.event();
  }

  // 🎉 Double Income — write expiry to Firestore
  if(text.includes('Double income')||text.includes('double income')){
    const expiry=new Date(now.getTime()+10*60*1000);
    await setDoc(doc(db,'settings','events'),{
      doubleIncome:true, doubleIncomeExpiry:expiry
    },{merge:true});
    // Auto-expire
    setTimeout(async()=>{
      await setDoc(doc(db,'settings','events'),{doubleIncome:false},{merge:true});
      await addChatMsg({type:'system',text:'⏰ Double Income Event has ended!',username:'GoDonate Bot'});
    },10*60*1000);
  }

  // 🔥 Hot Streak — write expiry to Firestore
  if(text.includes('Hot streak')||text.includes('game wins doubled')){
    const expiry=new Date(now.getTime()+5*60*1000);
    await setDoc(doc(db,'settings','events'),{
      hotStreak:true, hotStreakExpiry:expiry
    },{merge:true});
    setTimeout(async()=>{
      await setDoc(doc(db,'settings','events'),{hotStreak:false},{merge:true});
      await addChatMsg({type:'system',text:'⏰ Hot Streak Event has ended!',username:'GoDonate Bot'});
    },5*60*1000);
  }

  showToast('Bot message sent! 🤖','success');
};

function showEventBanner(title, subtitle, color){
  const existing=document.getElementById('event-banner');
  if(existing) existing.remove();
  const banner=document.createElement('div');
  banner.id='event-banner';
  banner.style.cssText=`position:fixed;top:70px;left:50%;transform:translateX(-50%);background:rgba(10,12,20,0.97);border:2px solid ${color};border-radius:16px;padding:0.8rem 2rem;z-index:8000;text-align:center;pointer-events:none;box-shadow:0 0 30px ${color}55`;
  banner.innerHTML=`<div style="font-size:1.1rem;font-weight:800;color:${color}">${title}</div><div style="font-size:0.85rem;color:#aaa;margin-top:0.2rem">${subtitle}</div>`;
  document.body.appendChild(banner);
  confettiRain(60); SFX.event();
  setTimeout(()=>{banner.style.transition='opacity 1s';banner.style.opacity='0';setTimeout(()=>banner.remove(),1000);},5000);

  // Update persistent event badge in nav
  updateEventBadge();
}

function updateEventBadge(){
  let badge=document.getElementById('event-badge');
  const events=[];
  if(hotStreakActive) events.push('🔥 Hot Streak 2x');
  if(doubleIncomeActive) events.push('🎉 Double Income');
  if(vipDropActive) events.push('💎 VIP Drop Active');

  if(!events.length){if(badge)badge.remove();return;}
  if(!badge){
    badge=document.createElement('div');
    badge.id='event-badge';
    badge.style.cssText='position:fixed;bottom:16px;right:16px;background:rgba(10,12,20,0.95);border:1.5px solid var(--accent);border-radius:12px;padding:0.5rem 1rem;z-index:4000;font-size:0.82rem;font-weight:700;cursor:pointer;box-shadow:0 4px 20px rgba(0,0,0,0.4)';
    document.body.appendChild(badge);
  }
  badge.innerHTML=events.map(e=>`<div>${e}</div>`).join('');
}
window.saveAdminSettings=async()=>{
  appSettings.incomePerMinute=parseInt(document.getElementById('admin-income').value)||5;
  appSettings.minDonate=parseInt(document.getElementById('admin-min-donate').value)||1;
  appSettings.bigDonateThreshold=parseInt(document.getElementById('admin-big-donate').value)||10000;
  await setDoc(doc(db,'settings','app'),appSettings);showToast('Settings saved! ✅','success');
};
async function loadAppSettings(){try{const snap=await getDoc(doc(db,'settings','app'));if(snap.exists())appSettings={...appSettings,...snap.data()};}catch{}}

// =============================================
// TOAST
// =============================================
let toastTmr;
window.showToast=(msg,type='')=>{
  const t=document.getElementById('toast');t.textContent=msg;t.className=`toast show ${type}`;
  clearTimeout(toastTmr);toastTmr=setTimeout(()=>t.className='toast',3200);
};

// =============================================
// HELPERS
// =============================================
function fmt(n){n=Math.round(n||0);if(n>=1000000)return(n/1000000).toFixed(1)+'M';if(n>=1000)return(n/1000).toFixed(1)+'K';return n.toLocaleString();}
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}

// =============================================
// VOICE CHAT (Jitsi Meet embed — no setup, works instantly)
// =============================================
let jitsiApi = null;
let inVoice = false;
const VOICE_ROOM = 'GoDonate-LiveVoice-9d056'; // unique room name for this app

function injectVoiceUI(){
  if(document.getElementById('sec-voice'))return;

  // Sidebar button
  const navSection=document.querySelector('.sidebar .sidebar-section');
  if(navSection&&!document.getElementById('voice-sidebar-btn')){
    const btn=document.createElement('button');
    btn.className='sidebar-btn';btn.id='voice-sidebar-btn';
    btn.setAttribute('data-sec','voice');
    btn.innerHTML='📞 Voice Chat';
    btn.onclick=()=>showSection('voice');
    navSection.appendChild(btn);
  }

  // Section
  const main=document.getElementById('main-content');if(!main)return;
  const sec=document.createElement('section');
  sec.id='sec-voice';sec.className='section';
  sec.innerHTML=`
    <div class="section-header"><h1>📞 Voice Chat</h1><p>Talk live with other players — click Join and allow your mic!</p></div>
    <div class="game-card" style="max-width:700px;align-items:flex-start;gap:1rem;padding:1.2rem">
      <div style="display:flex;align-items:center;gap:0.8rem;width:100%">
        <div id="voice-dot" style="width:14px;height:14px;border-radius:50%;background:var(--red);flex-shrink:0;transition:background 0.3s"></div>
        <span id="voice-status-text" style="font-weight:700;flex:1">Not in voice</span>
        <button class="btn-main" id="voice-join-btn" onclick="window.joinVoice()" style="padding:0.5rem 1.2rem">🎙️ Join Voice</button>
        <button class="btn-danger" id="voice-leave-btn" onclick="window.leaveVoice()" style="padding:0.5rem 1.2rem;display:none">📵 Leave</button>
      </div>
      <div id="jitsi-frame" style="width:100%;border-radius:14px;overflow:hidden;display:none"></div>
      <div style="background:var(--bg3);border-radius:12px;padding:1rem;width:100%;box-sizing:border-box">
        <div style="font-size:0.82rem;font-weight:700;color:var(--muted);margin-bottom:0.5rem">HOW TO USE</div>
        <div style="font-size:0.85rem;color:var(--text);line-height:1.7">
          1. Click <b>Join Voice</b><br>
          2. Allow microphone in your browser when prompted<br>
          3. Make sure to <b>unmute yourself</b> inside the voice panel<br>
          4. Everyone who joins the same room can hear each other 🎙️
        </div>
      </div>
    </div>`;
  main.appendChild(sec);
}

window.joinVoice=()=>{
  if(inVoice)return;
  // Load Jitsi script
  const loadJitsi=()=>{
    inVoice=true;
    document.getElementById('voice-dot').style.background='var(--green)';
    setText('voice-status-text','In voice chat 🎙️');
    document.getElementById('voice-join-btn').style.display='none';
    document.getElementById('voice-leave-btn').style.display='block';

    const frame=document.getElementById('jitsi-frame');
    frame.style.display='block';
    frame.style.height='480px';
    frame.innerHTML='';

    try{
      jitsiApi=new window.JitsiMeetExternalAPI('meet.jit.si',{
        roomName: VOICE_ROOM,
        parentNode: frame,
        width: '100%',
        height: 480,
        userInfo:{ displayName:'@'+(userData?.username||'Player') },
        configOverwrite:{
          startWithVideoMuted: true,
          startWithAudioMuted: false,
          disableVideoBackground: true,
          prejoinPageEnabled: false,
          startAudioOnly: true,
        },
        interfaceConfigOverwrite:{
          TOOLBAR_BUTTONS:['microphone','hangup','settings','raisehand'],
          SHOW_JITSI_WATERMARK: false,
          SHOW_BRAND_WATERMARK: false,
          DEFAULT_BACKGROUND:'#0a0c14',
          FILM_STRIP_MAX_HEIGHT: 0,
          VERTICAL_FILMSTRIP: false,
          VIDEO_LAYOUT_FIT:'nocrop',
        },
      });
      jitsiApi.on('readyToClose',()=>window.leaveVoice());
      SFX.coin();
      showToast('🎙️ Joined voice! Unmute yourself inside the panel.','success');
    }catch(e){
      console.error('Jitsi error:',e);
      // Fallback: open in new tab
      window.open('https://meet.jit.si/'+VOICE_ROOM,'_blank');
      inVoice=false;
      document.getElementById('voice-dot').style.background='var(--red)';
      setText('voice-status-text','Opened in new tab');
    }
  };

  if(window.JitsiMeetExternalAPI){loadJitsi();return;}
  setText('voice-status-text','Loading voice...');
  const s=document.createElement('script');
  s.src='https://meet.jit.si/external_api.js';
  s.onload=loadJitsi;
  s.onerror=()=>{
    showToast('Could not load voice library. Opening in new tab...','error');
    window.open('https://meet.jit.si/'+VOICE_ROOM,'_blank');
    setText('voice-status-text','Not in voice');
  };
  document.head.appendChild(s);
};

window.leaveVoice=()=>{
  if(!inVoice)return;
  inVoice=false;
  if(jitsiApi){try{jitsiApi.dispose();}catch{}jitsiApi=null;}
  const frame=document.getElementById('jitsi-frame');
  if(frame){frame.style.display='none';frame.innerHTML='';}
  document.getElementById('voice-dot').style.background='var(--red)';
  setText('voice-status-text','Not in voice');
  document.getElementById('voice-join-btn').style.display='block';
  document.getElementById('voice-leave-btn').style.display='none';
  showToast('📵 Left voice chat','');
};

// =============================================
// SOUND ENGINE (Web Audio API — no files needed)
// =============================================
let audioCtx = null;
function getAudio(){
  if(!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)();
  return audioCtx;
}
function playTone(freq, type='sine', duration=0.15, vol=0.3, delay=0){
  try{
    const ctx=getAudio();
    const osc=ctx.createOscillator(), gain=ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type=type; osc.frequency.setValueAtTime(freq, ctx.currentTime+delay);
    gain.gain.setValueAtTime(vol, ctx.currentTime+delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+delay+duration);
    osc.start(ctx.currentTime+delay); osc.stop(ctx.currentTime+delay+duration);
  }catch{}
}

const SFX = {
  win(){
    playTone(523,  'sine', 0.12, 0.3, 0.00);
    playTone(659,  'sine', 0.12, 0.3, 0.10);
    playTone(784,  'sine', 0.18, 0.3, 0.20);
    playTone(1047, 'sine', 0.25, 0.35, 0.32);
  },
  lose(){
    playTone(400, 'sawtooth', 0.12, 0.25, 0.00);
    playTone(300, 'sawtooth', 0.18, 0.25, 0.12);
    playTone(200, 'sawtooth', 0.22, 0.25, 0.26);
  },
  jackpot(){
    [523,659,784,1047,1319,1568].forEach((f,i)=>playTone(f,'sine',0.15,0.35,i*0.08));
    setTimeout(()=>[1568,1319,1047,784,659,523,784,1047,1568].forEach((f,i)=>playTone(f,'sine',0.12,0.3,i*0.07)),600);
  },
  coin(){
    playTone(1200,'sine',0.06,0.2,0.00);
    playTone(900, 'sine',0.08,0.2,0.05);
    playTone(1500,'sine',0.10,0.25,0.10);
  },
  click(){
    playTone(800,'sine',0.05,0.15,0);
  },
  income(){
    playTone(880,'sine',0.08,0.2,0.00);
    playTone(1100,'sine',0.10,0.25,0.08);
  },
  donation(){
    playTone(528,'sine',0.12,0.3,0.00);
    playTone(660,'sine',0.12,0.3,0.10);
    playTone(792,'sine',0.15,0.35,0.20);
  },
  megaDonation(){
    [330,415,523,659,830,1047,1319].forEach((f,i)=>playTone(f,'sine',0.18,0.4,i*0.07));
  },
  chat(){
    playTone(880,'sine',0.05,0.1,0);
  },
  event(){
    [523,659,784,523,659,784,1047].forEach((f,i)=>playTone(f,'square',0.1,0.2,i*0.09));
  },
  crash(){
    playTone(200,'sawtooth',0.3,0.4,0);
    playTone(150,'sawtooth',0.4,0.4,0.15);
    playTone(100,'sawtooth',0.5,0.5,0.35);
  },
  cashout(){
    playTone(660,'sine',0.1,0.3,0.00);
    playTone(880,'sine',0.1,0.3,0.08);
    playTone(1100,'sine',0.15,0.35,0.16);
  },
  spin(){
    for(let i=0;i<6;i++) playTone(200+i*80,'square',0.05,0.15,i*0.06);
  },
  tie(){
    playTone(440,'sine',0.15,0.2,0);
    playTone(440,'sine',0.15,0.2,0.2);
  }
};
