/**
 * DisasterBanner.jsx — Volunteer App
 * Full-width alert banner at top of every page.
 * Shows ⚠️ triangle + disaster name when active.
 * Tapping expands to show details + recommended action.
 */
import { useState, useEffect, useRef, useCallback } from 'react';

const OWM_KEY  = import.meta.env.VITE_OWM_API_KEY || '';
const INDIA_CENTER   = { lat: 20.5937, lng: 78.9629 };

// Disaster detection (same logic as admin, self-contained so no shared dep needed)
function detectDisasters(data) {
  if (!data) return [];
  const code  = data.weather?.[0]?.id || 800;
  const wind  = data.wind?.speed || 0;
  const rain1h= data.rain?.['1h'] || 0;
  const temp  = data.main?.temp || 0;
  const hum   = data.main?.humidity || 0;
  const snow1h= data.snow?.['1h'] || 0;
  const pres  = data.main?.pressure || 1013;

  const list = [];
  const now  = new Date().toISOString();

  const push = (id, name, icon, color, severity, desc, action) =>
    list.push({ id, name, icon, color, severity, desc, action,
      wind_kmh: Math.round(wind * 3.6), rain1h, temp: Math.round(temp),
      humidity: hum, timestamp: now,
      level: severity >= 5 ? 'critical' : severity >= 4 ? 'high' : severity >= 3 ? 'medium' : 'low',
    });

  if (code === 781)
    push('TORNADO','Tornado','🌪️','#8B5CF6',5,`Tornado detected`,'Seek sturdy shelter immediately. Avoid open areas.');
  if (wind >= 33)
    push('CYCLONE','Cyclone','🌀','#A855F7',5,`${Math.round(wind*3.6)} km/h winds`,'Evacuate coastal zones. Move to sturdy shelter inland.');
  if (rain1h >= 7.5 || code===522||code===531||code===504)
    push('FLOOD','Flash Flood','🌊','#3B82F6',5,`${rain1h}mm/h rainfall`,'Avoid low-lying areas. Move to higher ground.');
  if (pres < 960 && wind >= 20 && rain1h >= 5)
    push('TSUNAMI','Tsunami Warning','🌊','#1D4ED8',5,'Coastal storm surge','Move inland immediately — evacuate coast.');
  if (code>=200&&code<=232)
    push('THUNDERSTORM','Thunderstorm','⛈️','#F59E0B',4,'Lightning risk','Avoid tall trees. Stay indoors.');
  if (rain1h>=2.5&&rain1h<7.5&&code>=500&&code<=521)
    push('HEAVY_RAIN','Heavy Rain','🌧️','#06B6D4',3,`${rain1h}mm/h`,'Monitor waterways. Avoid flooded roads.');
  if (temp >= 45)
    push('HEAT','Extreme Heat','🔥','#EF4444',4,`${Math.round(temp)}°C`,'Stay hydrated. Seek cool shelter.');
  if (temp>=38&&hum<=20&&rain1h===0&&code>=800)
    push('DROUGHT','Drought','☀️','#F97316',3,`${Math.round(temp)}°C, ${hum}% humidity`,'Conserve water. Avoid outdoor activity.');
  if (code===761||code===762)
    push('DUST_STORM','Dust Storm','🌫️','#B45309',4,'Visibility degraded','Stay indoors. Cover nose and mouth.');
  if (snow1h>=5||code===622)
    push('SNOWSTORM','Snowstorm','🌨️','#93C5FD',4,`${snow1h}mm/h snow`,'Stay indoors. Check on neighbors.');

  return list.sort((a, b) => b.severity - a.severity);
}

const SEVERITY_BG = {
  critical: { bg: 'rgba(239,68,68,0.92)',  text: '#fff',    border: '#EF4444' },
  high:     { bg: 'rgba(249,115,22,0.92)', text: '#fff',    border: '#F97316' },
  medium:   { bg: 'rgba(245,158,11,0.90)', text: '#fff',    border: '#F59E0B' },
  low:      { bg: 'rgba(16,185,129,0.85)', text: '#fff',    border: '#10B981' },
};

export default function DisasterBanner() {
  const [disasters, setDisasters]   = useState([]);
  const [expanded, setExpanded]     = useState(false);
  const [dismissed, setDismissed]   = useState(false);
  const [lastCheck, setLastCheck]   = useState(null);
  const pollRef = useRef(null);

  const load = useCallback(async () => {
    setDismissed(false);
    if (!OWM_KEY) {
      // Demo mode — show a yellow alert
      setDisasters([{
        id: 'HEAVY_RAIN', name: 'Heavy Rain', icon: '🌧️', color: '#06B6D4',
        severity: 3, level: 'medium',
        desc: '3.5mm/h rainfall', action: 'Monitor waterways. Avoid flooded roads.',
        wind_kmh: 35, rain1h: 3.5, temp: 30, humidity: 85,
        timestamp: new Date().toISOString(),
      }]);
      setLastCheck(new Date());
      return;
    }
    try {
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${INDIA_CENTER.lat}&lon=${INDIA_CENTER.lng}&appid=${OWM_KEY}&units=metric`
      );
      if (res.ok) {
        const d = await res.json();
        setDisasters(detectDisasters(d));
        setLastCheck(new Date());
      }
    } catch (e) { console.error('Volunteer weather fetch:', e); }
  }, []);

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(pollRef.current);
  }, [load]);

  if (disasters.length === 0 || dismissed) return null;

  const top = disasters[0];
  const cfg = SEVERITY_BG[top.level] || SEVERITY_BG.medium;
  const isCritical = top.severity >= 5;

  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 200,
      background: cfg.bg,
      borderBottom: `2px solid ${cfg.border}`,
      backdropFilter: 'blur(8px)',
      animation: isCritical ? 'volShake 0.5s ease 0s 2, volPulse 1.4s ease-in-out 1s infinite' : 'volPulse 2s ease-in-out infinite',
      userSelect: 'none',
    }}>
      {/* Main tap row */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          padding: '10px 16px', display: 'flex',
          alignItems: 'center', gap: 10, cursor: 'pointer',
        }}
      >
        {/* Triangle warning icon */}
        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
          <path d="M12 2L2 20h20L12 2z" fill="#fff" opacity={0.3} stroke="#fff" strokeWidth={2} strokeLinejoin="round"/>
          <path d="M12 9v5" stroke="#fff" strokeWidth={2} strokeLinecap="round"/>
          <circle cx="12" cy="17" r="1" fill="#fff"/>
        </svg>

        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: cfg.text, lineHeight: 1.2 }}>
            {top.icon} {top.name} — {disasters.length > 1 ? `+${disasters.length - 1} more alert${disasters.length > 2 ? 's' : ''}` : top.desc}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', marginTop: 1 }}>
            Tap for details & recommended actions
            {lastCheck && ` · ${lastCheck.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`}
          </div>
        </div>

        <span style={{
          background: 'rgba(0,0,0,0.25)', color: cfg.text,
          padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 800,
          textTransform: 'uppercase',
        }}>
          {top.level}
        </span>
        <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>
          {expanded ? '▲' : '▼'}
        </span>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{
          padding: '0 16px 14px',
          maxHeight: 320, overflowY: 'auto',
        }}>
          {disasters.map((d, i) => (
            <div key={d.id} style={{
              background: 'rgba(0,0,0,0.2)', borderRadius: 10,
              padding: '10px 12px', marginBottom: 8,
            }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
                {d.icon} {d.name}
              </div>
              <div style={{ fontSize: 11, opacity: 0.85, marginBottom: 6, lineHeight: 1.4 }}>
                {d.desc} · 💨{d.wind_kmh}km/h · 🌡️{d.temp}°C
                {d.rain1h > 0 ? ` · 🌧️${d.rain1h}mm/h` : ''}
              </div>
              <div style={{
                background: 'rgba(0,0,0,0.25)', borderRadius: 7,
                padding: '7px 10px', fontSize: 12, lineHeight: 1.5,
                borderLeft: '3px solid rgba(255,255,255,0.5)',
              }}>
                <span style={{ fontWeight: 700, display: 'block', marginBottom: 2 }}>⚡ Action</span>
                {d.action}
              </div>
            </div>
          ))}

          {/* Dismiss */}
          <button
            onClick={(e) => { e.stopPropagation(); setDismissed(true); setExpanded(false); }}
            style={{
              width: '100%', padding: '8px', borderRadius: 8,
              background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              marginTop: 4,
            }}
          >
            Dismiss Alerts
          </button>
        </div>
      )}

      <style>{`
        @keyframes volPulse {
          0%,100% { opacity: 1; }
          50%      { opacity: 0.88; }
        }
        @keyframes volShake {
          0%,100% { transform: translateX(0); }
          20%     { transform: translateX(-4px); }
          40%     { transform: translateX(4px); }
          60%     { transform: translateX(-3px); }
          80%     { transform: translateX(3px); }
        }
      `}</style>
    </div>
  );
}
