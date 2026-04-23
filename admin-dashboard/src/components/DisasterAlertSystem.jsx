/**
 * DisasterAlertSystem.jsx
 * Global disaster alert overlay for admin dashboard.
 * — Pulsing ⚠️ triangle badge in sidebar
 * — Slide-in alert drawer with all active disasters
 * — Polls OWM every 5 minutes
 * — Demo mode when no API key is set
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchWeatherWithAlerts, getDemoWeatherAlert, INDIA_CENTER } from '../services/weatherService';

const OWM_KEY = import.meta.env.VITE_OWM_API_KEY || '';

const LEVEL_CONFIG = {
  critical: { color: '#EF4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.4)',  glow: '0 0 20px rgba(239,68,68,0.4)',  badge: '#EF4444' },
  high:     { color: '#F97316', bg: 'rgba(249,115,22,0.10)', border: 'rgba(249,115,22,0.35)', glow: '0 0 16px rgba(249,115,22,0.3)', badge: '#F97316' },
  medium:   { color: '#F59E0B', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.35)', glow: '0 0 12px rgba(245,158,11,0.2)', badge: '#F59E0B' },
  low:      { color: '#10B981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.3)',  glow: 'none',                          badge: '#10B981' },
};

function AlertCard({ disaster, index }) {
  const [expanded, setExpanded] = useState(index === 0);
  const cfg = LEVEL_CONFIG[disaster.alertLevel] || LEVEL_CONFIG.medium;

  return (
    <div
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderRadius: 12,
        marginBottom: 10,
        overflow: 'hidden',
        transition: 'all 0.25s ease',
      }}
    >
      {/* Header row */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%', background: 'transparent', border: 'none',
          padding: '12px 16px', display: 'flex', alignItems: 'center',
          gap: 10, cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 22 }}>{disaster.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: cfg.color }}>
            {disaster.name}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>
            {disaster.description}
          </div>
        </div>
        <span style={{
          padding: '2px 8px', borderRadius: 20,
          background: cfg.badge, color: '#fff',
          fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          {disaster.alertLevel}
        </span>
        <span style={{ color: 'var(--text-muted)', fontSize: 12, marginLeft: 4 }}>
          {expanded ? '▲' : '▼'}
        </span>
      </button>

      {/* Expanded action section */}
      {expanded && (
        <div style={{ padding: '0 16px 14px' }}>
          {/* Stats row */}
          <div style={{
            display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10,
          }}>
            {[
              { label: 'Wind',     val: `${disaster.wind_kmh} km/h` },
              { label: 'Rain',     val: `${disaster.rain1h} mm/h` },
              { label: 'Temp',     val: `${disaster.temp}°C` },
              { label: 'Humidity', val: `${disaster.humidity}%` },
            ].map(({ label, val }) => (
              <div key={label} style={{
                background: 'rgba(255,255,255,0.05)', borderRadius: 8,
                padding: '4px 10px', fontSize: 11,
              }}>
                <span style={{ color: 'var(--text-muted)' }}>{label}: </span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{val}</span>
              </div>
            ))}
          </div>

          {/* Action recommendation */}
          <div style={{
            background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '8px 12px',
            fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.5,
            borderLeft: `3px solid ${cfg.color}`,
          }}>
            <div style={{ fontWeight: 700, color: cfg.color, marginBottom: 3 }}>
              ⚡ Recommended Action
            </div>
            {disaster.action}
          </div>

          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8 }}>
            Detected at {new Date(disaster.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DisasterAlertSystem() {
  const [weather, setWeather]       = useState(null);
  const [panelOpen, setPanelOpen]   = useState(false);
  const [dismissed, setDismissed]   = useState(new Set());
  const [lastFetch, setLastFetch]   = useState(null);
  const pollRef = useRef(null);

  const load = useCallback(async () => {
    let result;
    if (!OWM_KEY) {
      result = getDemoWeatherAlert();
    } else {
      result = await fetchWeatherWithAlerts(INDIA_CENTER.lat, INDIA_CENTER.lng, OWM_KEY);
    }
    if (result) {
      setWeather(result);
      setLastFetch(new Date());
      // Auto-open panel if critical alerts arrive
      if (result.disasters?.some(d => d.severity >= 5)) {
        setPanelOpen(true);
      }
    }
  }, []);

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(pollRef.current);
  }, [load]);

  const activeDisasters = (weather?.disasters || []).filter(d => !dismissed.has(d.id));
  const criticalCount   = activeDisasters.filter(d => d.severity >= 5).length;
  const highestSeverity = activeDisasters[0]?.severity || 0;

  const cfg = highestSeverity >= 5 ? LEVEL_CONFIG.critical
            : highestSeverity >= 4 ? LEVEL_CONFIG.high
            : highestSeverity >= 3 ? LEVEL_CONFIG.medium
            : LEVEL_CONFIG.low;

  const hasDanger = activeDisasters.length > 0;

  return (
    <>
      {/* ── Floating ⚠️ Triangle Badge (always visible when alerts exist) ─── */}
      {hasDanger && (
        <div
          onClick={() => setPanelOpen(p => !p)}
          title={`${activeDisasters.length} disaster alert${activeDisasters.length > 1 ? 's' : ''} — click to view`}
          style={{
            position: 'fixed',
            bottom: 24,
            left: 'calc(var(--sidebar-width) + 20px)',
            zIndex: 999,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: cfg.color,
            color: '#fff',
            padding: '8px 14px',
            borderRadius: 30,
            fontWeight: 700,
            fontSize: 13,
            boxShadow: `${cfg.glow}, 0 4px 16px rgba(0,0,0,0.4)`,
            animation: criticalCount > 0 ? 'disasterPulse 1.4s ease-in-out infinite' : 'none',
            userSelect: 'none',
            transition: 'all 0.2s',
          }}
        >
          <TriangleWarning size={18} />
          {activeDisasters.length} Disaster Alert{activeDisasters.length > 1 ? 's' : ''}
          {criticalCount > 0 && (
            <span style={{
              background: '#fff', color: cfg.color,
              borderRadius: 12, padding: '1px 7px', fontSize: 11, fontWeight: 800,
            }}>
              {criticalCount} CRITICAL
            </span>
          )}
        </div>
      )}

      {/* ── Disaster Alert Panel (slide in from bottom-left) ─────────────── */}
      {panelOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setPanelOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 998,
              background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)',
            }}
          />

          {/* Panel */}
          <div style={{
            position: 'fixed',
            bottom: 0,
            left: 'var(--sidebar-width)',
            width: 440,
            maxWidth: 'calc(100vw - var(--sidebar-width))',
            maxHeight: '80vh',
            zIndex: 999,
            background: 'var(--bg-secondary)',
            border: `1px solid ${cfg.border}`,
            borderBottom: 'none',
            borderRadius: '16px 16px 0 0',
            boxShadow: `${cfg.glow}, 0 -8px 40px rgba(0,0,0,0.5)`,
            display: 'flex',
            flexDirection: 'column',
            animation: 'panelSlideUp 0.3s ease',
          }}>
            {/* Panel Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <TriangleWarning size={22} color={cfg.color} />
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>
                    Disaster Alerts
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                    {activeDisasters.length} active · OWM live data
                    {lastFetch && ` · Updated ${lastFetch.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`}
                    {!OWM_KEY && ' · ⚠️ Demo mode'}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  onClick={load}
                  style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 10px', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer' }}
                >
                  ↻ Refresh
                </button>
                <button
                  onClick={() => setPanelOpen(false)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Weather summary strip */}
            {weather && (
              <div style={{
                padding: '10px 20px',
                background: cfg.bg,
                borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
              }}>
                <img
                  src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`}
                  alt={weather.description}
                  style={{ width: 48, height: 48 }}
                />
                <div>
                  <div style={{ fontWeight: 700, color: cfg.color, fontSize: 13 }}>
                    {weather.label}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1, textTransform: 'capitalize' }}>
                    {weather.description} · {weather.temp}°C · 💨 {weather.wind_speed} km/h · 💧 {weather.humidity}%
                    {weather.rain1h > 0 ? ` · 🌧️ ${weather.rain1h}mm/h` : ''}
                    {weather.cityName ? ` · 📍 ${weather.cityName}` : ''}
                  </div>
                </div>
              </div>
            )}

            {/* Alert list */}
            <div style={{ overflowY: 'auto', padding: '12px 16px', flex: 1 }}>
              {activeDisasters.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🟢</div>
                  <div>All clear — no active disaster alerts</div>
                </div>
              ) : (
                activeDisasters.map((d, i) => (
                  <AlertCard key={d.id} disaster={d} index={i} />
                ))
              )}
            </div>

            {/* Footer actions */}
            <div style={{
              padding: '10px 16px',
              borderTop: '1px solid var(--border)',
              display: 'flex', gap: 8, flexShrink: 0,
            }}>
              <button
                onClick={() => { setDismissed(new Set(activeDisasters.map(d => d.id))); setPanelOpen(false); }}
                style={{ flex: 1, padding: '8px', borderRadius: 8, background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                Dismiss All
              </button>
              <button
                onClick={() => { setDismissed(new Set()); load(); }}
                style={{ flex: 1, padding: '8px', borderRadius: 8, background: cfg.color, border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                ↻ Recheck Now
              </button>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes disasterPulse {
          0%, 100% { transform: scale(1);     box-shadow: ${cfg.glow}, 0 4px 16px rgba(0,0,0,0.4); }
          50%       { transform: scale(1.06);  box-shadow: 0 0 30px ${cfg.color}80, 0 4px 16px rgba(0,0,0,0.4); }
        }
        @keyframes panelSlideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        /* Sidebar ⚠️ nav indicator */
        .disaster-nav-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #EF4444;
          color: #fff;
          font-size: 9px;
          font-weight: 800;
          margin-left: auto;
          animation: disasterPulse 1.4s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}

/** SVG triangle warning icon */
export function TriangleWarning({ size = 20, color = '#fff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <path
        d="M12 2L2 20h20L12 2z"
        fill={color}
        opacity={0.2}
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <path d="M12 9v5" stroke={color === '#fff' ? '#fff' : color} strokeWidth={2} strokeLinecap="round" />
      <circle cx="12" cy="17" r="1" fill={color === '#fff' ? '#fff' : color} />
    </svg>
  );
}
