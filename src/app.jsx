const {useEffect,useMemo,useState} = React;

const SUITS = ["♠","♥","♣","♦"];
const RANKS = [2,3,4,5,6,7,8,9,10,11,12,13,14];

function makeDeck(){
  const d=[]; let id=1;
  for(const s of SUITS) for(const r of RANKS) d.push({id:id++,suit:s,rank:r});
  for(let i=d.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [d[i],d[j]]=[d[j],d[i]]; }
  return d;
}
const rlab = r => r<=10?(""+r):r===11?"J":r===12?"Q":r===13?"K":"A";
const baseChips = r => r<=10?r:(r<=13?10:11);

const HC = {"High Card":5,Pair:10,"Two Pair":20,"Three of a Kind":30,Straight:30,Flush:35,"Full House":40,"Four of a Kind":60,"Straight Flush":100};
const HM = {"High Card":1,Pair:2,"Two Pair":2,"Three of a Kind":3,Straight:4,Flush:4,"Full House":4,"Four of a Kind":7,"Straight Flush":8};

function evalHand(cards){
  const counts={}, suits={"♠":0,"♥":0,"♣":0,"♦":0}, ranks=[...cards.map(c=>c.rank)].sort((a,b)=>a-b);
  for(const c of cards){ counts[c.rank]=(counts[c.rank]||0)+1; suits[c.suit]++; }
  const flush = Object.values(suits).some(v=>v===cards.length);
  const u=[...new Set(ranks)];
  let straight=false;
  if(u.length===cards.length){
    let ok=true; for(let i=1;i<u.length;i++){ if(u[i]!==u[i-1]+1){ ok=false; break; } }
    const wheel = u.join()==="2,3,4,5,14";
    straight = ok||wheel;
  }
  let hand="High Card";
  const v=Object.values(counts).sort((a,b)=>b-a);
  if(straight&&flush)hand="Straight Flush";
  else if(v[0]===4)hand="Four of a Kind";
  else if(v[0]===3&&v[1]===2)hand="Full House";
  else if(flush)hand="Flush";
  else if(straight)hand="Straight";
  else if(v[0]===3)hand="Three of a Kind";
  else if(v[0]===2&&v[1]===2)hand="Two Pair";
  else if(v[0]===2)hand="Pair";
  return {hand,chips:HC[hand],mult:HM[hand]};
}

const suitCls = s => s==="♠"?"text-blue-600 dark:text-blue-300":
                     s==="♥"?"text-orange-600 dark:text-orange-300":
                     s==="♣"?"text-green-600 dark:text-green-300":"text-purple-600 dark:text-purple-300";
const rv = r => r; // Ace (14) should be highest naturally
const sortRank = a => [...a].sort((x,y)=> (rv(y.rank)-rv(x.rank)) || (SUITS.indexOf(x.suit)-SUITS.indexOf(y.suit)));
const sortSuit = a => [...a].sort((x,y)=> (SUITS.indexOf(x.suit)-SUITS.indexOf(y.suit)) || (rv(y.rank)-rv(x.rank)));

let _animTimer=null;
const tierInfo = h => h==="Straight Flush"?["Legendary","bg-fuchsia-600"]
  : h==="Four of a Kind"?["Epic","bg-rose-600"]
  : (h==="Full House"||h==="Flush")?["Rare","bg-indigo-600"]
  : (h==="Straight"||h==="Three of a Kind")?["Uncommon","bg-emerald-600"]
  : ["Common","bg-slate-700"];

function App(){
  const [s,setS]=useState(()=>({
    deck:makeDeck(), hand:[], discard:[],
    ante:1, blind:"Small", goal:300, score:0,
    hands:4, discards:3, handSize:8, maxPlay:5,
    money:6, sort:"none",
    inShop:false, shop:[],
    anim:false, aChips:0, aMult:1, aTotal:0, aHand:"", aTier:"", aTierColor:"",
    fx:[], drag:false, dragMode:null
  }));
  const [sel,setSel]=useState([]);

  useEffect(()=>{ dealStart(); },[]);
  useEffect(()=>{ if(s.score>=s.goal && !s.inShop) openShop();
                  if(s.hands<=0 && s.score<s.goal) reset(); },[s.score,s.hands,s.inShop]);

  const preview = useMemo(()=> s.hand.some(c=>sel.includes(c.id)) ? `${sel.length} selected` : null, [sel,s.hand]);

  useEffect(()=>{ const up=()=>setS(x=>({...x,drag:false,dragMode:null}));
    window.addEventListener("mouseup",up); return ()=>window.removeEventListener("mouseup",up);
  },[]);
  useEffect(()=>{ const onKey=e=>{
    if((e.target?.tagName)==="INPUT")return;
    const k=e.key.toLowerCase();
    // When in shop: handle number hotkeys and proceed keys, ignore gameplay keys
    if(s.inShop){
      if(["1","2","3"].includes(k)) { e.preventDefault(); buy(parseInt(k,10)-1); return; }
      if(k==="enter"||k==="escape"){ e.preventDefault(); proceed(); return; }
      return;
    }
    if(e.key===" "){ e.preventDefault(); if(!s.anim) play(); }
    if(k==="d" && !s.anim) discard();
    if(k==="r") setSort("rank");
    if(k==="u") setSort("suit");
    if(k==="n") setSort("none");
    if(k==="c") setSel([]);
  };
    window.addEventListener("keydown",onKey); return ()=>window.removeEventListener("keydown",onKey);
  },[s]);

  const applySort=(list,mode)=> mode==="rank"?sortRank(list):mode==="suit"?sortSuit(list):list;
  const setSort = m => setS(x=>({...x,sort:m,hand:applySort(x.hand,m)}));

  function dealStart(){
    setS(x=>{
      const deck=[...x.deck];
      if(deck.length<52){
        const d=makeDeck();
        for(let i=d.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[d[i],d[j]]=[d[j],d[i]];}
        d.forEach(c=>deck.push(c));
      }
      const hand=deck.splice(0,x.handSize);
      return {...x,hand:applySort(hand,x.sort),deck,score:0,hands:4,discards:3};
    });
  }
  function drawTo(n){
    setS(x=>{
      let deck=[...x.deck], hand=[...x.hand], discard=[...x.discard];
      while(hand.length<n && (deck.length||discard.length)){
        if(!deck.length && discard.length){
          for(let i=discard.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[discard[i],discard[j]]=[discard[j],discard[i]];}
          deck=discard; discard=[];
        }
        if(!deck.length) break;
        hand.push(deck.shift());
      }
      return {...x,hand:applySort(hand,x.sort),deck,discard};
    });
  }

  const ensureSel   = id => setSel(a=> a.includes(id)||a.length>=s.maxPlay ? a : [...a,id]);
  const ensureUnsel = id => setSel(a=> a.includes(id) ? a.filter(v=>v!==id) : a);
  const selectRank  = r  => {
    const ids = s.hand.filter(c=>c.rank===r).map(c=>c.id);
    setSel(a=>{ const set=new Set(a); for(const id of ids) if(set.size<s.maxPlay) set.add(id); return [...set]; });
  };

  function discard(){
    if(s.anim || s.discards<=0 || !sel.length) return;
    const ids=[...sel]; setSel([]);
    setS(x=>{
      const stay=x.hand.filter(c=>!ids.includes(c.id)); const gone=x.hand.filter(c=>ids.includes(c.id));
      return {...x,hand:applySort(stay,x.sort),discard:[...x.discard,...gone],discards:x.discards-1};
    });
    drawTo(s.handSize);
  }

  function startAnim(base,add,mul,hand){
    if(_animTimer) clearInterval(_animTimer);
    const [tier, col] = tierInfo(hand);
    const chipsTarget=base+add, multTarget=Math.max(1,mul);
    const t0=Date.now();
    setS(x=>({...x,anim:true,aHand:hand,aTier:tier,aTierColor:col,aChips:base,aMult:1,aTotal:base}));
    _animTimer=setInterval(()=>{
      const t=Date.now()-t0;
      let c = base + Math.round(add*Math.min(1, t/650));
      let m = t<650 ? 1 : 1 + (multTarget-1)*Math.min(1,(t-650)/800);
      const done = t>=1550;
      setS(x=>({...x,aChips:c,aMult:+m.toFixed(2),aTotal:Math.round(c*m)}));
      if(done){
        clearInterval(_animTimer); _animTimer=null;
        setS(x=>({...x,score:x.score+Math.round(chipsTarget*multTarget),anim:false}));
      }
    }, 26);
  }

  function play(){
    if(s.anim || s.hands<=0 || !sel.length || s.inShop) return;
    const ids=[...sel], played=s.hand.filter(c=>ids.includes(c.id));
    const base = played.reduce((a,c)=>a+baseChips(c.rank),0);
    const {hand, chips, mult} = evalHand(played);
    setSel([]); setS(x=>({...x,fx:ids}));
    setTimeout(()=>{
      setS(x=>{
        const stay=x.hand.filter(c=>!ids.includes(c.id));
        return {...x,hand:applySort(stay,x.sort),discard:[...x.discard,...played],hands:x.hands-1,fx:[]};
      });
      drawTo(s.handSize);
    }, 220);
    startAnim(base, chips, mult, hand);
  }

  const genShop = ()=>{
    const o=[{id:"hand+1",label:"Hand Size +1",price:7},{id:"discard+1",label:"+1 Discard next",price:5},{id:"money+5",label:"+5 Money",price:4}];
    const p=[], pool=[...o]; for(let i=0;i<3;i++){ const j=Math.floor(Math.random()*pool.length); p.push(pool.splice(j,1)[0]); }
    return p;
  };
  function openShop(){ setS(x=>({...x,inShop:true,shop:genShop(),money:x.money+5})); }
  function buy(i){
    const it=s.shop[i]; if(!it || s.money<it.price) return;
    setS(x=>{
      let {handSize,discards,money}=x; money-=it.price;
      if(it.id==="hand+1") handSize=Math.min(9,handSize+1);
      if(it.id==="discard+1") discards+=1;
      if(it.id==="money+5") money+=5;
      const shop=[...x.shop]; shop.splice(i,1);
      return {...x,handSize,discards,money,shop};
    });
  }
  function proceed(){
    setS(x=>{
      let ante=x.ante, blind=x.blind;
      if(blind==="Small") blind="Big"; else if(blind==="Big") blind="Boss"; else { ante=Math.min(8,ante+1); blind="Small"; }
      const deck=[...x.deck,...x.discard,...x.hand];
      for(let i=deck.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [deck[i],deck[j]]=[deck[j],deck[i]];}
      const hand=deck.splice(0,x.handSize);
      const newGoal = Math.round(300*Math.pow(1.45,ante-1)*(blind==="Small"?1:blind==="Big"?1.6:2.4));
      return {...x,ante,blind,goal:newGoal,score:0,hands:4,discards:3,deck,hand:applySort(hand,x.sort),inShop:false};
    });
  }
  function reset(){
    setSel([]);
    setS({
      deck:makeDeck(),hand:[],discard:[],
      ante:1,blind:"Small",goal:300,score:0,hands:4,discards:3,
      handSize:8,maxPlay:5,money:6,sort:"none",
      inShop:false,shop:[],anim:false,aChips:0,aMult:1,aTotal:0,aHand:"",aTier:"",aTierColor:"",fx:[],drag:false,dragMode:null
    });
    dealStart();
  }

  return (
    <div className="min-h-screen p-4 select-none" onDragStart={e=>e.preventDefault()}>
      <div className={`max-w-5xl mx-auto ${s.inShop?"pointer-events-none":""}`} aria-hidden={s.inShop}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-xl font-bold">Balatro-lite</div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="px-2 py-1 rounded-lg bg-slate-800 text-white text-xs">Ante <b>{s.ante}</b></div>
            <div className="px-2 py-1 rounded-lg bg-slate-700 text-white text-xs">{s.blind}</div>
            <div className="px-2 py-1 rounded-lg bg-slate-700 text-white text-xs">Goal <b>{s.goal}</b></div>
            <div className="px-2 py-1 rounded-lg bg-slate-700 text-white text-xs">Score <b>{s.score}</b></div>
            <div className="px-2 py-1 rounded-lg bg-slate-700 text-white text-xs">Hands <b>{s.hands}</b></div>
            <div className="px-2 py-1 rounded-lg bg-slate-700 text-white text-xs">Discards <b>{s.discards}</b></div>
            <div className="px-3 py-1 rounded-xl bg-amber-400 text-black flex items-baseline gap-1">
              <span className="text-xs">$</span><span className="text-2xl font-black leading-none tabular-nums">{s.money}</span>
            </div>
            <button onClick={reset} className="ml-2 px-3 py-1.5 text-sm rounded-xl bg-emerald-600 text-white">New Run</button>
          </div>
        </div>

        <div className="relative rounded-3xl p-3 min-h-[96px] border flex items-center justify-center bg-emerald-900 text-emerald-50"
             style={{background:"radial-gradient(circle at 35% 35%, rgba(255,255,255,.12), rgba(0,0,0,0) 60%)"}}>
          <div className="text-sm opacity-90 bg-black/30 px-2 py-1 rounded">{preview || `Select up to ${s.maxPlay} cards · Space=Play · D=Discard`}</div>
          {s.anim && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="px-3 py-2 rounded-xl bg-black/70 text-white text-center shadow-2xl">
                <div className="text-[11px] opacity-90">
                  {s.aHand} • <span className={`px-2 py-0.5 rounded ${s.aTierColor}`}>{s.aTier}</span>
                </div>
                <div className="mt-1 text-2xl font-black tracking-wider">{s.aChips} × {s.aMult}</div>
                <div className="text-3xl font-extrabold">= {s.aTotal}</div>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl p-3 bg-white/80 dark:bg-slate-800/70 border mt-3"
             onMouseLeave={()=>setS(x=>({...x,drag:false,dragMode:null}))}
             onContextMenu={e=>{ e.preventDefault(); }}>
          <div className="flex flex-wrap">
            {s.hand.map(c=>{
              const onDown = e => {
                e.preventDefault();
                const right = e.button===2;
                setS(x=>({...x,drag:true,dragMode:right?"remove":"add"}));
                right ? ensureUnsel(c.id) : ensureSel(c.id);
              };
              const isSel = sel.includes(c.id);
              const popStyle = s.fx?.includes(c.id) ? {animation:'pop .22s ease-out forwards'} : undefined;
              return (
                <button key={c.id}
                  onDoubleClick={()=>selectRank(c.rank)}
                  onMouseDown={onDown}
                  onMouseEnter={()=>{ if(s.drag){ s.dragMode==="add"?ensureSel(c.id):ensureUnsel(c.id); } }}
                  onContextMenu={e=>{ e.preventDefault(); ensureUnsel(c.id); }}
                  className={`relative w-16 h-24 rounded-2xl shadow-sm border border-slate-300 dark:border-slate-700
                              flex flex-col items-center justify-center m-1 transition-transform select-none
                              ${isSel? "-translate-y-2 ring-4 ring-indigo-400 scale-105 shadow-lg" : "hover:scale-105"}`}
                  style={popStyle}
                  title={`${rlab(c.rank)} ${c.suit}`}>
                  <div className={`absolute top-1 left-2 text-sm ${suitCls(c.suit)}`}>{rlab(c.rank)}</div>
                  <div className={`text-2xl ${suitCls(c.suit)}`}>{c.suit}</div>
                  <div className={`absolute bottom-1 right-2 text-sm ${suitCls(c.suit)}`}>{rlab(c.rank)}</div>
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 mt-3">
            <button onClick={()=>play()} disabled={s.anim||s.hands<=0||!sel.length} className="px-4 py-2 rounded-xl bg-indigo-600 text-white disabled:opacity-50">Play</button>
            <div className="ml-2 flex items-center gap-1 text-xs">
              <span className="opacity-80">Sort:</span>
              <button onClick={()=>setSort("rank")} className={`px-3 py-1.5 rounded-xl border ${s.sort==="rank"?"bg-slate-900 text-white":"bg-white/80 dark:bg-slate-700"}`}>Rank</button>
              <button onClick={()=>setSort("suit")} className={`px-3 py-1.5 rounded-xl border ${s.sort==="suit"?"bg-slate-900 text-white":"bg-white/80 dark:bg-slate-700"}`}>Suit</button>
              <button onClick={()=>setSort("none")} className={`px-3 py-1.5 rounded-xl border ${s.sort==="none"?"bg-slate-900 text-white":"bg-white/80 dark:bg-slate-700"}`}>None</button>
            </div>
            <button onClick={()=>discard()} disabled={s.anim||s.discards<=0||!sel.length} className="ml-auto px-4 py-2 rounded-xl bg-slate-700 text-white disabled:opacity-50">Discard</button>
          </div>
        </div>
      </div>

      {s.inShop && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] flex items-center justify-center" role="dialog" aria-modal="true">
          <div className="w-[min(760px,95vw)] rounded-2xl p-4 bg-white/95 dark:bg-slate-800/95 border shadow-2xl">
            <div className="flex items-center justify-between mb-2">
              <div className="text-lg font-semibold">Shop</div>
              <div className="px-3 py-1 rounded-xl bg-amber-400 text-black flex items-baseline gap-1">
                <span className="text-xs">$</span><span className="text-2xl font-black leading-none tabular-nums">{s.money}</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {s.shop.map((it,i)=>(
                <div key={i} role="button" tabIndex={0}
                     onClick={()=>buy(i)}
                     onKeyDown={e=>{if(e.key==='Enter'||e.key===' ')buy(i);}}
                     className="rounded-2xl p-3 border bg-white/80 dark:bg-slate-800/70 cursor-pointer hover:shadow">
                  <div className="font-semibold text-sm">{it.label}</div>
                  <div className="text-xs mt-1">${it.price}</div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-3">
              <button onClick={()=>setS(x=>({...x,shop:genShop(),money:Math.max(0,x.money-1)}))}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 text-white">Reroll (-$1)</button>
              <button onClick={()=>proceed()} className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white">Proceed</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
