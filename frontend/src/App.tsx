import React, { useState, useEffect, useRef, useCallback } from 'react';
import { EarthGlobe } from './components/EarthGlobe';
import InversionSimulation from './components/InversionSimulation';
import NeighborhoodSimulation from './components/NeighborhoodSimulation';
import { SCENES, MOCK_FIRES, NEIGHBORHOODS } from './data/mockData';
import type { NeighborhoodData, HourlyForecast } from './types';

// ─── AQI helpers ──────────────────────────────────────────────────────────────
const AQI_COLORS = ['#34a853','#8bc34a','#fbbc04','#ff6d00','#ea4335','#9c27b0'];
function aqiColor(v:number) {
  if(v<=50)  return AQI_COLORS[0];
  if(v<=100) return AQI_COLORS[1];
  if(v<=200) return AQI_COLORS[2];
  if(v<=300) return AQI_COLORS[3];
  if(v<=400) return AQI_COLORS[4];
  return AQI_COLORS[5];
}
function aqiLabel(v:number) {
  if(v<=50)  return 'Good';
  if(v<=100) return 'Satisfactory';
  if(v<=200) return 'Moderate';
  if(v<=300) return 'Poor';
  if(v<=400) return 'Very Poor';
  if(v<=450) return 'Severe';
  return 'Severe+';
}

// ─── Tiny components ──────────────────────────────────────────────────────────
const Beacon = () => <span className="beacon" />;

const Label: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color='var(--c-muted)' }) => (
  <span className="mono" style={{ color }}>{children}</span>
);

const Chip: React.FC<{ bg:string; color:string; children:React.ReactNode }> = ({ bg, color, children }) => (
  <span className="chip" style={{ background:bg, color }}>{children}</span>
);

// ─── AQI ring ─────────────────────────────────────────────────────────────────
const AqiRing: React.FC<{ aqi:number; size?:number }> = ({ aqi, size=80 }) => {
  const r = (size-10)/2, circ=2*Math.PI*r;
  const pct = Math.min(aqi,500)/500;
  const col = aqiColor(aqi);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={8}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={8}
        strokeDasharray={`${circ*pct} ${circ*(1-pct)}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ filter:`drop-shadow(0 0 7px ${col}99)`, transition:'stroke-dasharray 0.6s ease' }}
      />
      <text x={size/2} y={size/2+2} textAnchor="middle" dominantBaseline="middle"
        fill={col} fontSize={size>70?17:11} fontWeight="700" fontFamily="Google Sans">{aqi}</text>
      <text x={size/2} y={size/2+size/4-2} textAnchor="middle"
        fill="var(--c-muted)" fontSize={9} fontFamily="Google Sans">{aqiLabel(aqi)}</text>
    </svg>
  );
};

// ─── Forecast chart ───────────────────────────────────────────────────────────
const Chart: React.FC<{ forecast:HourlyForecast[]; idx:number; onHover:(i:number)=>void }> = ({ forecast, idx, onHover }) => {
  const H=96, W=600, maxAqi=520;
  const pts = (arr: number[]) => arr.map((v,i)=>`${(i/(arr.length-1))*W},${H-(v/maxAqi)*H}`).join(' ');
  const p50  = forecast.map(f=>f.aqi);
  const p90  = forecast.map(f=>f.pm25_p90);
  const p10  = forecast.map(f=>f.pm25_p10);
  const polyPts = [...forecast.map((_,i)=>`${(i/(forecast.length-1))*W},${H-(p90[i]/maxAqi)*H}`),
                   ...[...forecast].reverse().map((_,i)=>`${((forecast.length-1-i)/(forecast.length-1))*W},${H-(p10[forecast.length-1-i]/maxAqi)*H}`)].join(' ');
  const ax = (idx/(forecast.length-1))*W;
  const ay = H-(forecast[idx]?.aqi/maxAqi)*H;
  const col = aqiColor(forecast[idx]?.aqi??200);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',height:H,overflow:'visible',cursor:'crosshair'}}
      onMouseMove={e=>{const r=e.currentTarget.getBoundingClientRect();onHover(Math.round(Math.max(0,Math.min(47,(e.clientX-r.left)/r.width*47))));}}
    >
      <defs>
        <linearGradient id="lg1" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#34a853"/>
          <stop offset="40%"  stopColor="#fbbc04"/>
          <stop offset="75%"  stopColor="#ea4335"/>
          <stop offset="100%" stopColor="#9c27b0"/>
        </linearGradient>
        <linearGradient id="lg2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={col} stopOpacity="0.18"/>
          <stop offset="100%" stopColor={col} stopOpacity="0.01"/>
        </linearGradient>
      </defs>
      {/* Guide lines */}
      {[200,300,400].map(v=>(
        <line key={v} x1={0} y1={H-(v/maxAqi)*H} x2={W} y2={H-(v/maxAqi)*H}
          stroke="rgba(255,255,255,0.07)" strokeDasharray="4 5" strokeWidth="1"/>
      ))}
      {/* Band */}
      <polygon points={polyPts} fill="url(#lg2)"/>
      {/* Median */}
      <polyline points={pts(p50)} fill="none" stroke="url(#lg1)" strokeWidth="2.5" strokeLinejoin="round"/>
      {/* Active line + dot */}
      <line x1={ax} y1={0} x2={ax} y2={H} stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeDasharray="3 4"/>
      <circle cx={ax} cy={ay} r={5} fill={col} stroke="#fff" strokeWidth="1.5"
        style={{filter:`drop-shadow(0 0 5px ${col})`}}/>
    </svg>
  );
};

// ─── Alert Modal ──────────────────────────────────────────────────────────────
const AlertModal: React.FC<{ n:NeighborhoodData; onClose:()=>void }> = ({ n, onClose }) => {
  const [phone, setPhone] = useState('+91 ');
  const [thresh, setThresh] = useState(300);
  const [done, setDone] = useState(false);

  return (
    <div className="modal-bg" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="glass" style={{borderRadius:20,padding:28,maxWidth:420,width:'100%',position:'relative',animation:'fadeUp 0.4s cubic-bezier(0.16,1,0.3,1)'}}>
        <button onClick={onClose} style={{position:'absolute',top:14,right:14,background:'rgba(255,255,255,0.07)',border:'none',color:'var(--c-muted)',width:30,height:30,borderRadius:15,cursor:'pointer',fontSize:18,lineHeight:1}}>×</button>
        {!done?(
          <>
            <Label color="var(--c-cyan)">Amazon SNS · Smart Alert</Label>
            <h3 style={{fontSize:20,fontWeight:700,margin:'6px 0 8px'}}>Subscribe to {n.name}</h3>
            <p style={{fontSize:13,color:'var(--c-muted)',marginBottom:20,lineHeight:1.6}}>
              Get notified 12 hours before hazardous air reaches your neighborhood.
            </p>
            <form onSubmit={e=>{e.preventDefault();setDone(true)}} style={{display:'flex',flexDirection:'column',gap:14}}>
              <div>
                <label style={{display:'block',fontSize:12,color:'var(--c-muted)',marginBottom:6}}>Mobile number</label>
                <input type="tel" required value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+91 98765 43210"/>
              </div>
              <div>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                  <label style={{fontSize:12,color:'var(--c-muted)'}}>Alert when AQI exceeds</label>
                  <span style={{fontSize:12,fontWeight:700,color:aqiColor(thresh)}}>{thresh} · {aqiLabel(thresh)}</span>
                </div>
                <input type="range" min={100} max={450} step={50} value={thresh} onChange={e=>setThresh(+e.target.value)}/>
              </div>
              <div style={{padding:'10px 14px',background:'rgba(66,133,244,0.07)',border:'1px solid rgba(66,133,244,0.18)',borderRadius:12,fontSize:12,color:'var(--c-muted)',lineHeight:1.6}}>
                <strong style={{color:'var(--c-text)'}}>Sample SMS:</strong> "MSR: {n.name} will cross AQI {thresh} tomorrow 06:00 AM. Hazardous for outdoor activity. Stay indoors."
              </div>
              <button type="submit" className="btn btn-alert" style={{justifyContent:'center',marginTop:4}}>🔔 Activate Alert</button>
            </form>
          </>
        ):(
          <div style={{textAlign:'center',padding:'16px 0'}}>
            <div style={{fontSize:52,marginBottom:12}}>✅</div>
            <h3 style={{fontSize:20,fontWeight:700,marginBottom:8}}>You're subscribed!</h3>
            <p style={{fontSize:13,color:'var(--c-muted)',marginBottom:20,lineHeight:1.6}}>
              Alerts active for <strong style={{color:'var(--c-text)'}}>{n.name}</strong> when AQI &gt; {thresh}.
            </p>
            <button className="btn btn-ghost" onClick={onClose}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Arch Modal ───────────────────────────────────────────────────────────────
const ArchModal: React.FC<{ onClose:()=>void }> = ({ onClose }) => (
  <div className="modal-bg" onClick={e=>e.target===e.currentTarget&&onClose()}>
    <div className="glass" style={{borderRadius:20,padding:28,maxWidth:540,width:'100%',maxHeight:'88vh',overflowY:'auto',position:'relative',animation:'fadeUp 0.4s cubic-bezier(0.16,1,0.3,1)'}}>
      <button onClick={onClose} style={{position:'absolute',top:14,right:14,background:'rgba(255,255,255,0.07)',border:'none',color:'var(--c-muted)',width:30,height:30,borderRadius:15,cursor:'pointer',fontSize:18,lineHeight:1}}>×</button>
      <Label color="var(--c-cyan)">Team Calypso · AWS Stack</Label>
      <h3 style={{fontSize:22,fontWeight:700,margin:'6px 0 20px'}}>Full Pipeline Architecture</h3>
      {[
        {e:'📥',t:'Ingestion',s:'Lambda + EventBridge + S3',d:'Hourly pulls from CPCB/OpenAQ, NASA FIRMS VIIRS fires, ERA5 winds, CAMS aerosol, and daily Sentinel-5P TROPOMI into S3 Data Lake.'},
        {e:'🤖',t:'ML Training',s:'Amazon SageMaker',d:'LightGBM quantile regression (p10/p50/p90) trained on multi-winter CPCB PM2.5 station data with weather & satellite features.'},
        {e:'⚡',t:'Inference',s:'Lambda + DynamoDB',d:'48-hour quantile forecasts generated on a ~3km NCR grid, cached in DynamoDB for sub-50ms API responses.'},
        {e:'✨',t:'AI Briefings',s:'Amazon Bedrock (Claude 3.5)',d:'Plain-language health advisories generated from CPCB NAQI, WHO, and GRAP guidelines via RAG Knowledge Base.'},
        {e:'🔔',t:'Smart Alerts',s:'Amazon SNS',d:'Threshold-based SMS/email notifications triggered 12h before hazardous peaks via pub-sub topic subscriptions.'},
        {e:'🌐',t:'Frontend',s:'Amplify + API Gateway + Vite',d:'Three.js point-cloud Earth, React UI, FastAPI on Lambda, globally served via AWS Amplify Hosting with CDN.'},
      ].map(row=>(
        <div key={row.t} style={{display:'flex',gap:14,padding:'14px 0',borderBottom:'1px solid var(--c-border)'}}>
          <span style={{fontSize:24,flexShrink:0,marginTop:2}}>{row.e}</span>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
              <strong style={{fontSize:14}}>{row.t}</strong>
              <Chip bg="rgba(66,133,244,0.1)" color="#7baaf7">{row.s}</Chip>
            </div>
            <p style={{fontSize:12,color:'var(--c-muted)',lineHeight:1.6}}>{row.d}</p>
          </div>
        </div>
      ))}
      <p style={{fontSize:11,color:'var(--c-dim)',marginTop:16,lineHeight:1.7,fontFamily:'var(--ffm)'}}>
        Data sources (all free): CPCB / OpenAQ · ERA5 / Open-Meteo · CAMS Aerosol · NASA FIRMS (VIIRS 375m) · ESA Sentinel-5P TROPOMI
      </p>
    </div>
  </div>
);

// ─── Scene definitions ────────────────────────────────────────────────────────
const SCENE_META = [
  {
    icon:'🛰️', tag:'SENTINEL-5P · 824 km ORBIT', aws:'Lambda + EventBridge → S3 Raw Lake',
    title:'Satellite Eyes Open Over India',
    body:'Every afternoon, the ESA Sentinel-5P satellite sweeps the Indian subcontinent. Its TROPOMI spectrometer captures regional NO₂ and Aerosol Index at 3.5×5.5 km resolution — detecting massive smog fronts before they touch a single ground monitor.',
    fact:'Sentinel-5P detects aerosol plumes invisible to surface-level sensors',
    color:'rgba(0,188,212,0.15)', borderColor:'rgba(0,188,212,0.3)',
  },
  {
    icon:'🔥', tag:'NASA FIRMS · VIIRS 375 m', aws:'S3 Ingestion + EventBridge Hourly',
    title:'3,842 Farm Fires Blazing in Punjab & Haryana',
    body:'Post-monsoon paddy harvest gives farmers a 3-week window to clear fields before the next crop. NASA VIIRS thermal infrared detects exact fire locations, fire radiative power (MW), and timing — feeding directly into the ML feature pipeline.',
    fact:'Fire radiative power peaks at 210 MW in Sangrur district at 13:44 IST',
    color:'rgba(255,109,0,0.12)', borderColor:'rgba(255,109,0,0.3)',
  },
  {
    icon:'💨', tag:'ERA5 · OPEN-METEO WINDS', aws:'SageMaker Feature Engineering',
    title:'Northwesterly Corridor Sweeps Smoke 250 km South',
    body:'Persistent post-monsoon northwesterlies at 15–25 km/h carry smoke from the Punjab–Haryana belt down the flat Indo-Gangetic Plains directly into the Delhi NCR basin. 78% of Delhi\'s severe smog episodes trace to this wind trajectory.',
    fact:'Smoke-to-Delhi travel time: 18–36 hours via 850hPa transport layer',
    color:'rgba(251,188,4,0.1)', borderColor:'rgba(251,188,4,0.25)',
  },
  {
    icon:'🌫️', tag:'BOUNDARY LAYER HEIGHT · INVERSION', aws:'LightGBM Quantile Inference',
    title:'The Inversion Lid Drops Like a Seal',
    body:'Nocturnal radiative cooling traps cold surface air beneath warmer air aloft. The mixing layer collapses from 1,200m to barely 150m — sealing Delhi\'s smog like an airtight lid, multiplying PM2.5 concentration by 3.5× in under 4 hours.',
    fact:'Surface winds fall below 3 km/h, stopping all horizontal ventilation',
    color:'rgba(156,39,176,0.12)', borderColor:'rgba(156,39,176,0.3)',
  },
];

// ─── Main App ─────────────────────────────────────────────────────────────────
export const App: React.FC = () => {
  const [activeScene, setActiveScene] = useState(0);
  const [showForecast, setShowForecast] = useState(false);
  const [showArch, setShowArch] = useState(false);
  const [showInversionSim, setShowInversionSim] = useState(false);
  const [showNeighborhoodSim, setShowNeighborhoodSim] = useState(false);
  const [alertN, setAlertN] = useState<NeighborhoodData|null>(null);

  // Globe scene is a fractional 0-4 for smooth transitions
  const [globeScene, setGlobeScene] = useState(0);

  // Scroll container
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionsRef = useRef<HTMLElement[]>([]);
  const isAnimating = useRef(false);

  // Forecast state
  const [selectedN, setSelectedN] = useState<NeighborhoodData>(NEIGHBORHOODS[0]);
  const [search, setSearch] = useState('');
  const [hourIdx, setHourIdx] = useState(0);

  const filtered = NEIGHBORHOODS.filter(n =>
    !search.trim() || n.name.toLowerCase().includes(search.toLowerCase()) || n.zone.toLowerCase().includes(search.toLowerCase())
  );
  const hd: HourlyForecast = selectedN.forecast[hourIdx] ?? selectedN.forecast[0];

  // Smooth scene transition
  const goToScene = useCallback((next: number) => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    setGlobeScene(next);
    setActiveScene(next);
    setTimeout(() => { isAnimating.current = false; }, 700);
  }, []);

  // Wheel / keyboard navigation through 4 scenes
  useEffect(() => {
    if (showForecast) return;
    let lastWheel = 0;
    const onWheel = (e: WheelEvent) => {
      const now = Date.now();
      if (now - lastWheel < 600) return;
      lastWheel = now;
      if (e.deltaY > 0 && activeScene < 3) { goToScene(activeScene + 1); }
      else if (e.deltaY < 0 && activeScene > 0) { goToScene(activeScene - 1); }
      else if (e.deltaY > 0 && activeScene === 3) { setShowForecast(true); setGlobeScene(4); }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key==='ArrowDown'||e.key==='PageDown') {
        if(activeScene<3) goToScene(activeScene+1);
        else if(activeScene===3) { setShowForecast(true); setGlobeScene(4); }
      }
      if (e.key==='ArrowUp'||e.key==='PageUp') {
        if(activeScene>0) goToScene(activeScene-1);
      }
    };
    window.addEventListener('wheel', onWheel, { passive:true });
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('wheel', onWheel); window.removeEventListener('keydown', onKey); };
  }, [activeScene, showForecast, goToScene]);

  const meta = SCENE_META[activeScene];
  const sceneTags = ['🛰️ Orbit','🔥 Punjab Fires','💨 Wind Transport','🌫️ Inversion'];

  return (
    <div style={{ width:'100vw', height:'100vh', overflow:'hidden', background:'#000007', position:'relative' }}>

      {/* ── 3D Earth (always rendered) ──────────────────────────────────────── */}
      <div style={{ position:'absolute', inset:0, zIndex:0 }}>
        <EarthGlobe scene={globeScene} />
      </div>

      {/* ── Gradient vignettes to frame UI cleanly ────────────────────────── */}
      {/* Left-side vignette for scene panel */}
      {!showForecast && (
        <div style={{ position:'absolute', inset:0, zIndex:1, pointerEvents:'none',
          background:'linear-gradient(to right, rgba(0,0,7,0.88) 0%, rgba(0,0,7,0.55) 36%, transparent 55%)' }} />
      )}
      {/* Bottom vignette */}
      <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'25%', zIndex:1, pointerEvents:'none',
        background:'linear-gradient(to top, rgba(0,0,7,0.75), transparent)' }} />
      {/* Top vignette */}
      <div style={{ position:'absolute', top:0, left:0, right:0, height:'12%', zIndex:1, pointerEvents:'none',
        background:'linear-gradient(to bottom, rgba(0,0,7,0.65), transparent)' }} />

      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <header style={{
        position:'absolute', top:0, left:0, right:0, zIndex:20,
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'14px 24px',
      }}>
        {/* Brand */}
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{
            width:38, height:38, borderRadius:10,
            background:'linear-gradient(135deg,#1a3a6e,#1e5f9e)',
            border:'1px solid rgba(0,188,212,0.3)',
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:18,
            boxShadow:'0 4px 16px rgba(0,188,212,0.2)',
          }}>🛰️</div>
          <div>
            <div style={{ fontWeight:700, fontSize:15, letterSpacing:'-0.01em' }}>MSR</div>
            <div style={{ fontSize:11, color:'var(--c-muted)', fontFamily:'var(--ffm)', lineHeight:1.2 }}>
              Satellite Smog Forecast · Delhi NCR
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginLeft:4, fontSize:12, color:'var(--c-cyan)' }}>
            <Beacon />
            <span style={{ fontFamily:'var(--ffm)', fontSize:10, letterSpacing:'0.06em', textTransform:'uppercase' }}>Live</span>
          </div>
        </div>

        {/* Nav buttons */}
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {!showForecast && (
            <button className="btn btn-primary" style={{ fontSize:12, padding:'8px 16px' }}
              onClick={() => { setShowForecast(true); setGlobeScene(4); }}>
              📍 48H Forecast
            </button>
          )}
          <button className="btn btn-ghost" style={{ fontSize:12, padding:'8px 14px' }}
            onClick={() => setShowArch(true)}>
            ☁️ AWS Stack
          </button>
        </div>
      </header>

      {/* ── CINEMATIC SCENE PANEL (scenes 0-3, left side) ─────────────────── */}
      {!showForecast && (
        <div className="scene-panel" key={activeScene} style={{ animation:'slideInLeft 0.5s cubic-bezier(0.16,1,0.3,1)' }}>
          <div className="glass" style={{ borderRadius:22, overflow:'hidden' }}>
            {/* Accent bar */}
            <div style={{ height:3, background:`linear-gradient(to right, ${meta.borderColor.replace('0.3','0.8')}, transparent)` }} />

            <div style={{ padding:'22px 24px' }}>
              {/* Tags row */}
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14, flexWrap:'wrap' }}>
                <Chip bg="rgba(255,255,255,0.06)" color="var(--c-muted)">
                  <span style={{ fontFamily:'var(--ffm)', fontSize:10, letterSpacing:'0.06em' }}>
                    STEP {String(activeScene+1).padStart(2,'0')} / 04
                  </span>
                </Chip>
                <Chip bg={meta.color} color={meta.borderColor.replace('0.3','1')}>
                  <span style={{ fontFamily:'var(--ffm)', fontSize:10, letterSpacing:'0.04em' }}>{meta.tag}</span>
                </Chip>
              </div>

              {/* Title */}
              <h2 style={{ fontSize:22, fontWeight:700, lineHeight:1.3, marginBottom:12, letterSpacing:'-0.01em' }}>
                {meta.title}
              </h2>

              {/* Body */}
              <p style={{ fontSize:13, color:'var(--c-muted)', lineHeight:1.7, marginBottom:16 }}>
                {meta.body}
              </p>

              {/* Key fact */}
              <div style={{
                padding:'10px 14px', borderRadius:12, marginBottom:20,
                background:meta.color, border:`1px solid ${meta.borderColor}`,
                display:'flex', gap:10, alignItems:'flex-start',
              }}>
                <span style={{ fontSize:14, flexShrink:0 }}>📡</span>
                <p style={{ fontSize:11, lineHeight:1.55, fontFamily:'var(--ffm)',
                  color: meta.borderColor.replace('0.3','0.95') }}>
                  {meta.fact}
                </p>
              </div>

              {/* AWS row */}
              <div style={{ fontSize:11, color:'var(--c-dim)', fontFamily:'var(--ffm)', marginBottom:18 }}>
                <span style={{ color:'var(--c-amber)' }}>AWS ›</span> {meta.aws}
              </div>

              {/* Simulation launcher for Scene 3 */}
              {activeScene === 3 && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ width:'100%', marginBottom:10, fontSize:12, justifyContent:'center', borderColor:'rgba(244,154,107,0.4)', color:'#f49a6b' }}
                  onClick={() => setShowInversionSim(true)}
                >
                  🔬 Launch Inversion Chamber Simulator
                </button>
              )}

              {/* Navigation */}
              <div style={{ display:'flex', gap:8 }}>
                {activeScene > 0 && (
                  <button className="btn btn-ghost" style={{ fontSize:12, padding:'8px 14px', flex:'0 0 auto' }}
                    onClick={() => goToScene(activeScene-1)}>← Back</button>
                )}
                <button
                  className="btn btn-primary"
                  style={{ fontSize:13, flex:1, justifyContent:'center' }}
                  onClick={() => {
                    if(activeScene < 3) goToScene(activeScene+1);
                    else { setShowForecast(true); setGlobeScene(4); }
                  }}>
                  {activeScene < 3 ? 'Next Scene →' : '📍 Explore Forecast →'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── RIGHT SIDE: scene-specific data panel ─────────────────────────── */}
      {!showForecast && activeScene === 1 && (
        <div style={{
          position:'fixed', top:'50%', right:24, transform:'translateY(-50%)',
          zIndex:20, width:200, animation:'fadeIn 0.5s ease',
        }}>
          <div className="glass" style={{ borderRadius:18, padding:16 }}>
            <Label color="#ff7043">🔥 VIIRS Active Fires</Label>
            <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:7 }}>
              {MOCK_FIRES.slice(0,6).map(f=>(
                <div key={f.id} style={{ display:'flex', justifyContent:'space-between', fontSize:11.5 }}>
                  <span style={{ color:'var(--c-muted)' }}>{f.district}</span>
                  <span style={{ color:'#ff7043', fontWeight:700, fontFamily:'var(--ffm)' }}>{f.frp}MW</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid var(--c-border)', fontSize:10, color:'var(--c-dim)', fontFamily:'var(--ffm)' }}>
              {MOCK_FIRES.length} fires · 375m VIIRS
            </div>
          </div>
        </div>
      )}

      {/* Wind stats for scene 2 */}
      {!showForecast && activeScene === 2 && (
        <div style={{ position:'fixed', top:'50%', right:24, transform:'translateY(-50%)', zIndex:20, width:200, animation:'fadeIn 0.5s ease' }}>
          <div className="glass" style={{ borderRadius:18, padding:16 }}>
            <Label color="var(--c-amber)">💨 ERA5 Winds</Label>
            <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:8 }}>
              {[{l:'Direction',v:'NW (315°)'},{l:'Speed 850hPa',v:'18 km/h'},{l:'Transport path',v:'250 km'},{l:'Travel time',v:'14–18 h'},{l:'Affected area',v:'Delhi NCR'}].map(r=>(
                <div key={r.l}>
                  <div style={{ fontSize:10, color:'var(--c-dim)', fontFamily:'var(--ffm)', marginBottom:2 }}>{r.l}</div>
                  <div style={{ fontSize:13, fontWeight:600 }}>{r.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Inversion stats for scene 3 */}
      {!showForecast && activeScene === 3 && (
        <div style={{ position:'fixed', top:'50%', right:24, transform:'translateY(-50%)', zIndex:20, width:200, animation:'fadeIn 0.5s ease' }}>
          <div className="glass" style={{ borderRadius:18, padding:16 }}>
            <Label color="#ce93d8">🌫️ Inversion Metrics</Label>
            <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:8 }}>
              {[{l:'Mixing Height',v:'↓ 150 m',c:'#ea4335'},{l:'PM2.5 × Factor',v:'3.5× surge',c:'#ea4335'},{l:'Surface Wind',v:'< 3 km/h',c:'#fbbc04'},{l:'Temp Gradient',v:'+4°C / 300m',c:'#9c27b0'}].map(r=>(
                <div key={r.l}>
                  <div style={{ fontSize:10, color:'var(--c-dim)', fontFamily:'var(--ffm)', marginBottom:2 }}>{r.l}</div>
                  <div style={{ fontSize:13, fontWeight:700, color:r.c }}>{r.v}</div>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowInversionSim(true)}
              style={{ marginTop:12, width:'100%', fontSize:11, padding:'7px 8px', justifyContent:'center', background:'#7b1fa2' }}
            >
              🔬 Launch Simulator
            </button>
          </div>
        </div>
      )}

      {/* ── STEP DOTS (right center) ──────────────────────────────────────── */}
      {!showForecast && (
        <div style={{ position:'fixed', right:16, top:'50%', transform:'translateY(-50%)', zIndex:20, display:'flex', flexDirection:'column', gap:8 }}>
          {SCENE_META.map((_,i) => (
            <button
              key={i}
              className={`step-dot ${activeScene===i?'active':''}`}
              onClick={() => goToScene(i)}
              title={sceneTags[i]}
            />
          ))}
        </div>
      )}

      {/* ── BOTTOM SCENE STEPPER BAR ──────────────────────────────────────── */}
      {!showForecast && (
        <div className="bottom-nav">
          <div className="glass" style={{ borderRadius:40, padding:'8px 12px', display:'flex', gap:4, alignItems:'center' }}>
            {sceneTags.map((tag,i) => (
              <button key={i} onClick={()=>goToScene(i)}
                style={{
                  padding:'5px 12px', borderRadius:20, border:'none', cursor:'pointer',
                  fontSize:12, fontFamily:'var(--ff)',
                  background: activeScene===i ? 'rgba(66,133,244,0.2)' : 'transparent',
                  color: activeScene===i ? '#7baaf7' : 'var(--c-dim)',
                  fontWeight: activeScene===i ? 600 : 400,
                  transition:'all 0.2s',
                }}>
                {tag}
              </button>
            ))}
            <div style={{ width:1, height:18, background:'var(--c-border)', margin:'0 2px' }} />
            <button onClick={()=>{ setShowForecast(true); setGlobeScene(4); }}
              style={{ padding:'5px 12px', borderRadius:20, border:'none', cursor:'pointer', fontSize:12, fontFamily:'var(--ff)', background:'rgba(234,67,53,0.15)', color:'#ef9a9a', fontWeight:600 }}>
              📍 Forecast
            </button>
          </div>
        </div>
      )}

      {/* ── FORECAST OVERLAY ──────────────────────────────────────────────── */}
      {showForecast && (
        <div className="forecast-overlay" style={{ animation:'fadeIn 0.4s ease' }}>
          {/* Back */}
          <button className="btn btn-ghost" onClick={()=>{ setShowForecast(false); setGlobeScene(3); }}
            style={{ position:'fixed', top:14, left:24, zIndex:50, fontSize:12, padding:'8px 14px' }}>
            ← Back to Map
          </button>

          <div style={{ maxWidth:1080, margin:'0 auto', display:'flex', flexDirection:'column', gap:14 }}>

            {/* Header card */}
            <div className="glass anim-fade-up" style={{ borderRadius:20, padding:'20px 24px' }}>
              <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'space-between', gap:12, marginBottom:16 }}>
                <div>
                  <Label color="var(--c-cyan)">48-Hour Quantile ML Forecast · Delhi NCR</Label>
                  <h1 style={{ fontSize:22, fontWeight:700, marginTop:4 }}>Neighborhood Air Quality</h1>
                  <p style={{ fontSize:12, color:'var(--c-muted)', marginTop:3 }}>
                    Powered by LightGBM on SageMaker · Sentinel-5P + VIIRS + ERA5 features
                  </p>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button className="btn btn-ghost" style={{ fontSize:12, padding:'9px 16px', color:'#d0ee91', borderColor:'rgba(208,238,145,0.3)' }} onClick={()=>setShowNeighborhoodSim(true)}>
                    🗺️ 3km Grid Sandbox
                  </button>
                  <button className="btn btn-alert" style={{ fontSize:12, padding:'9px 18px' }} onClick={()=>setAlertN(selectedN)}>
                    🔔 Alert Signup
                  </button>
                </div>
              </div>

              {/* Search */}
              <div style={{ position:'relative', marginBottom:12 }}>
                <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', fontSize:15, pointerEvents:'none' }}>🔍</span>
                <input type="text" value={search} onChange={e=>setSearch(e.target.value)}
                  placeholder="Search neighborhood — Dwarka, Anand Vihar, Rohini, Noida Sec 62, Gurugram..."
                  style={{ paddingLeft:42, borderRadius:14 }}
                />
              </div>

              {/* Pills */}
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {filtered.map(n=>(
                  <button key={n.id}
                    onClick={()=>{ setSelectedN(n); setSearch(''); setHourIdx(0); }}
                    style={{
                      padding:'5px 14px', borderRadius:20, cursor:'pointer', fontSize:12, fontFamily:'var(--ff)',
                      background: selectedN.id===n.id ? 'rgba(66,133,244,0.2)' : 'rgba(255,255,255,0.05)',
                      color: selectedN.id===n.id ? '#7baaf7' : 'var(--c-muted)',
                      border: selectedN.id===n.id ? '1px solid rgba(66,133,244,0.35)' : '1px solid transparent',
                      fontWeight: selectedN.id===n.id ? 600 : 400,
                      transition:'all 0.15s',
                    }}>
                    {n.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Two-col grid: current status + metrics */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(290px,1fr))', gap:14 }}>

              {/* AQI Card */}
              <div className="glass anim-fade-up" style={{ borderRadius:20, padding:22, animationDelay:'0.05s' }}>
                <Label>Current Conditions</Label>
                <div style={{ display:'flex', alignItems:'center', gap:18, margin:'14px 0 18px' }}>
                  <AqiRing aqi={hd.aqi} size={90} />
                  <div>
                    <h3 style={{ fontSize:18, fontWeight:700, marginBottom:3 }}>{selectedN.name}</h3>
                    <p style={{ fontSize:12, color:'var(--c-muted)', marginBottom:10 }}>{selectedN.zone} · Delhi NCR</p>
                    <Chip bg={`${aqiColor(hd.aqi)}22`} color={aqiColor(hd.aqi)}>{aqiLabel(hd.aqi)}</Chip>
                  </div>
                </div>

                {/* Quantile bands */}
                <Label>LightGBM Quantile Bands</Label>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginTop:10 }}>
                  {([['p10',hd.pm25_p10,'#34a853'],['p50',hd.pm25_p50,'var(--c-cyan)'],['p90',hd.pm25_p90,'#ea4335']] as const).map(([lbl,val,col])=>(
                    <div key={lbl} style={{ padding:'8px 0', background:'rgba(255,255,255,0.03)', borderRadius:10, textAlign:'center', border:'1px solid var(--c-border)' }}>
                      <div style={{ fontSize:10, color:'var(--c-dim)', fontFamily:'var(--ffm)', marginBottom:3 }}>{lbl}</div>
                      <div style={{ fontSize:16, fontWeight:700, color:col as string }}>{val}</div>
                      <div style={{ fontSize:9, color:'var(--c-dim)' }}>µg/m³</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Metrics card */}
              <div className="glass anim-fade-up" style={{ borderRadius:20, padding:22, animationDelay:'0.1s' }}>
                <Label>Atmospheric Snapshot</Label>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:12 }}>
                  {[
                    {e:'🌬️',l:'Wind',v:`${hd.windSpeed} km/h ${hd.windDir}`},
                    {e:'📏',l:'Inversion Ceiling',v:`${hd.inversionHeight} m`},
                    {e:'🌡️',l:'Surface Temp',v:`${hd.temperature}°C`},
                    {e:'🗺️',l:'Grid Cell',v:'~3 km'},
                  ].map(m=>(
                    <div key={m.l} style={{ padding:'12px', background:'rgba(255,255,255,0.03)', borderRadius:12, border:'1px solid var(--c-border)' }}>
                      <div style={{ fontSize:20, marginBottom:5 }}>{m.e}</div>
                      <div style={{ fontSize:10, color:'var(--c-muted)', marginBottom:2 }}>{m.l}</div>
                      <div style={{ fontSize:14, fontWeight:600 }}>{m.v}</div>
                    </div>
                  ))}
                </div>

                {/* Source bars */}
                <div style={{ marginTop:14 }}>
                  <Label>Pollution Source Attribution</Label>
                  <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:7 }}>
                    {[
                      {l:'Stubble Fires',v:hd.sourceBreakdown.stubble,c:'#ff7043'},
                      {l:'Local Traffic & Industry',v:hd.sourceBreakdown.local,c:'#ea4335'},
                      {l:'Inversion Trapping',v:hd.sourceBreakdown.stagnationFactor,c:'#9c27b0'},
                    ].map(s=>(
                      <div key={s.l}>
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:3 }}>
                          <span style={{ color:'var(--c-muted)' }}>{s.l}</span>
                          <span style={{ color:s.c, fontWeight:700 }}>{s.v}%</span>
                        </div>
                        <div style={{ height:3, background:'rgba(255,255,255,0.07)', borderRadius:2 }}>
                          <div style={{ height:'100%', width:`${s.v}%`, background:s.c, borderRadius:2, transition:'width 0.5s ease' }}/>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 48h chart */}
            <div className="glass anim-fade-up" style={{ borderRadius:20, padding:22, animationDelay:'0.15s' }}>
              <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'space-between', gap:10, marginBottom:16 }}>
                <div>
                  <Label>48-Hour AQI Trajectory</Label>
                  <h3 style={{ fontSize:16, fontWeight:600, marginTop:3 }}>{selectedN.name} · Quantile Forecast</h3>
                </div>
                <div style={{ fontSize:12, fontFamily:'var(--ffm)', color:'var(--c-muted)' }}>
                  {hd.timeLabel} &nbsp;·&nbsp;
                  <span style={{ color:aqiColor(hd.aqi), fontWeight:700 }}>AQI {hd.aqi}</span>
                </div>
              </div>

              <Chart forecast={selectedN.forecast} idx={hourIdx} onHover={setHourIdx} />

              <input type="range" min={0} max={47} value={hourIdx}
                onChange={e=>setHourIdx(+e.target.value)} style={{ marginTop:10 }}/>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--c-dim)', fontFamily:'var(--ffm)', marginTop:4 }}>
                <span>Now (0h)</span><span>+24h</span><span>+48h</span>
              </div>

              {/* Best / worst windows */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:10, marginTop:16 }}>
                <div style={{ padding:'14px 16px', borderRadius:14, background:'rgba(52,168,83,0.07)', border:'1px solid rgba(52,168,83,0.2)' }}>
                  <p style={{ fontSize:11, color:'#81c995', fontFamily:'var(--ffm)', marginBottom:6 }}>✅ BEST OUTDOOR WINDOW</p>
                  <p style={{ fontSize:13, fontWeight:600, marginBottom:4 }}>{selectedN.bestWindow.time}</p>
                  <p style={{ fontSize:11.5, color:'var(--c-muted)', lineHeight:1.6 }}>{selectedN.bestWindow.tip}</p>
                </div>
                <div style={{ padding:'14px 16px', borderRadius:14, background:'rgba(234,67,53,0.07)', border:'1px solid rgba(234,67,53,0.2)' }}>
                  <p style={{ fontSize:11, color:'#f28b82', fontFamily:'var(--ffm)', marginBottom:6 }}>⚠️ HAZARDOUS PEAK</p>
                  <p style={{ fontSize:13, fontWeight:600, marginBottom:4 }}>{selectedN.worstWindow.time}</p>
                  <p style={{ fontSize:11.5, color:'var(--c-muted)', lineHeight:1.6 }}>{selectedN.worstWindow.tip}</p>
                </div>
              </div>
            </div>

            {/* Bedrock briefing */}
            <div className="glass anim-fade-up" style={{ borderRadius:20, padding:22, animationDelay:'0.2s', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:0, right:0, width:200, height:200, background:'radial-gradient(circle at 80% 20%, rgba(156,39,176,0.12), transparent)', pointerEvents:'none' }}/>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                <span style={{ fontSize:22 }}>✨</span>
                <div>
                  <Label color="#c084fc">Amazon Bedrock · Claude 3.5 Sonnet · Health KB</Label>
                  <h3 style={{ fontSize:15, fontWeight:600, marginTop:2 }}>AI Health Briefing</h3>
                </div>
              </div>
              {selectedN.bedrockSummary && (
                <>
                  <p style={{ fontSize:16, fontWeight:600, fontStyle:'italic', lineHeight:1.45, marginBottom:10 }}>
                    "{selectedN.bedrockSummary.headline}"
                  </p>
                  <p style={{ fontSize:13, color:'var(--c-muted)', lineHeight:1.7, marginBottom:16 }}>
                    {selectedN.bedrockSummary.briefing}
                  </p>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:10 }}>
                    {[
                      {e:'🏫',l:'Schools & Children',t:selectedN.bedrockSummary.schoolAdvice},
                      {e:'🏃',l:'Exercise & Sport',t:selectedN.bedrockSummary.exerciseAdvice},
                      {e:'🚌',l:'Commute Tips',t:selectedN.bedrockSummary.commuteAdvice},
                    ].map(c=>(
                      <div key={c.l} style={{ padding:'12px 14px', borderRadius:14, background:'rgba(255,255,255,0.03)', border:'1px solid var(--c-border)' }}>
                        <p style={{ fontSize:13, fontWeight:600, marginBottom:5 }}>{c.e} {c.l}</p>
                        <p style={{ fontSize:12, color:'var(--c-muted)', lineHeight:1.6 }}>{c.t}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div style={{ textAlign:'center', fontSize:11, color:'var(--c-dim)', fontFamily:'var(--ffm)', padding:'8px 0 4px' }}>
              MSR · Team Calypso: Saket, Ritvik, Mahek · WeMakeDevs × AWS Environmental Hacks (Air Track)
            </div>
          </div>
        </div>
      )}

      {/* ── SCROLL HINT (scene 0) ──────────────────────────────────────────── */}
      {!showForecast && activeScene === 0 && (
        <div style={{
          position:'fixed', bottom:80, right:'50%', transform:'translateX(50%)',
          zIndex:20, fontSize:12, color:'var(--c-dim)', fontFamily:'var(--ffm)',
          display:'flex', flexDirection:'column', alignItems:'center', gap:6,
          animation:'fadeIn 1.5s ease 2s both',
          pointerEvents:'none',
        }}>
          <span style={{ letterSpacing:'0.08em', textTransform:'uppercase' }}>Scroll to explore</span>
          <div style={{ width:1, height:20, background:'linear-gradient(to bottom, var(--c-dim), transparent)' }}/>
        </div>
      )}

      {/* ── MODALS ─────────────────────────────────────────────────────────── */}
      {alertN && <AlertModal n={alertN} onClose={()=>setAlertN(null)} />}
      {showArch && <ArchModal onClose={()=>setShowArch(false)} />}
      {showInversionSim && (
        <div className="modal-bg" onClick={e=>e.target===e.currentTarget&&setShowInversionSim(false)}>
          <div className="glass" style={{ borderRadius:24, padding:24, maxWidth:960, width:'95%', maxHeight:'92vh', overflowY:'auto', position:'relative', animation:'fadeUp 0.35s ease' }}>
            <button onClick={()=>setShowInversionSim(false)} style={{ position:'absolute', top:16, right:16, background:'rgba(255,255,255,0.08)', border:'none', color:'var(--c-muted)', width:32, height:32, borderRadius:16, cursor:'pointer', fontSize:20, lineHeight:1, zIndex:10 }}>×</button>
            <InversionSimulation />
          </div>
        </div>
      )}
      {showNeighborhoodSim && (
        <div className="modal-bg" onClick={e=>e.target===e.currentTarget&&setShowNeighborhoodSim(false)}>
          <div className="glass" style={{ borderRadius:24, padding:24, maxWidth:1040, width:'95%', maxHeight:'92vh', overflowY:'auto', position:'relative', animation:'fadeUp 0.35s ease' }}>
            <button onClick={()=>setShowNeighborhoodSim(false)} style={{ position:'absolute', top:16, right:16, background:'rgba(255,255,255,0.08)', border:'none', color:'var(--c-muted)', width:32, height:32, borderRadius:16, cursor:'pointer', fontSize:20, lineHeight:1, zIndex:10 }}>×</button>
            <NeighborhoodSimulation />
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
