import { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const API_BASE   = '/api/v1';
const OWM_KEY    = import.meta.env.VITE_OWM_API_KEY || '';
const OWM_TILE   = 'https://tile.openweathermap.org/map';

// Classify OWM weather response into an alert level
function classifyAlert(data) {
  if (!data) return null;
  const rain1h = data.rain?.['1h'] || 0;
  const wind   = data.wind?.speed  || 0;
  const code   = data.weather?.[0]?.id || 800;
  const desc   = data.weather?.[0]?.description || '';
  const icon   = data.weather?.[0]?.icon || '01d';

  let level = 'none';
  if (rain1h >= 7.5 || (code >= 202 && code <= 232))           level = 'red';
  else if (rain1h >= 2.5 || (code >= 500 && code <= 531) || wind >= 17)  level = 'orange';
  else if (rain1h > 0 || (code >= 300 && code <= 622) || wind >= 10)     level = 'yellow';

  const map = {
    red:    { color: '#EF4444', label: '🔴 RED ALERT — Extreme Rain/Storm',          bg: 'rgba(239,68,68,0.18)' },
    orange: { color: '#F97316', label: '🟠 ORANGE ALERT — Heavy Rain / High Winds', bg: 'rgba(249,115,22,0.14)' },
    yellow: { color: '#F59E0B', label: '🟡 YELLOW ALERT — Light Rain',              bg: 'rgba(245,158,11,0.12)' },
    none:   { color: '#10B981', label: '🟢 Clear — No Alerts',                       bg: 'rgba(16,185,129,0.08)' },
  };

  return {
    level,
    ...map[level],
    temp: Math.round(data.main?.temp || 0),
    humidity: data.main?.humidity || 0,
    wind_kmh: Math.round(wind * 3.6),
    rain1h,
    desc,
    icon,
  };
}

export default function MapPage() {
  const mapRef          = useRef(null);
  const mapInstanceRef  = useRef(null);
  const markersLayerRef = useRef(null);
  const myLocMarkerRef  = useRef(null);
  const weatherTileRef  = useRef(null);
  const weatherPollRef  = useRef(null);

  const [needs, setNeeds]           = useState([]);
  const [myLocation, setMyLocation] = useState(null);
  const [filter, setFilter]         = useState('');
  const [loading, setLoading]       = useState(true);
  const [locating, setLocating]     = useState(false);

  // Weather
  const [showWeather, setShowWeather]   = useState(false);
  const [weatherAlert, setWeatherAlert] = useState(null);
  const [weatherLayer, setWeatherLayer] = useState('precipitation_new');
  const [mapCenter, setMapCenter]       = useState({ lat: 19.076, lng: 72.878 });

  // Load needs
  async function loadNeeds() {
    try {
      const token = localStorage.getItem('vol_token');
      const params = new URLSearchParams();
      if (filter) params.set('category', filter);
      const res = await fetch(`${API_BASE}/needs/map?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setNeeds(await res.json());
    } catch (e) { console.error('Failed to load needs:', e); }
    setLoading(false);
  }

  useEffect(() => { loadNeeds(); }, [filter]);
  useEffect(() => { const iv = setInterval(loadNeeds, 30000); return () => clearInterval(iv); }, [filter]);

  // Weather fetch
  const fetchWeather = useCallback(async (center = mapCenter) => {
    if (!OWM_KEY) {
      // Demo mode
      setWeatherAlert({
        level: 'yellow', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',
        label: '🟡 YELLOW ALERT — Light Rain',
        temp: 31, humidity: 82, wind_kmh: 24, rain1h: 1.1,
        desc: 'moderate rain', icon: '10d',
      });
      return;
    }
    try {
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${center.lat}&lon=${center.lng}&appid=${OWM_KEY}&units=metric`
      );
      if (res.ok) setWeatherAlert(classifyAlert(await res.json()));
    } catch (e) { console.error('Weather fetch failed:', e); }
  }, [mapCenter]);

  useEffect(() => {
    if (!showWeather) { if (weatherPollRef.current) clearInterval(weatherPollRef.current); return; }
    fetchWeather();
    weatherPollRef.current = setInterval(fetchWeather, 5 * 60 * 1000);
    return () => { if (weatherPollRef.current) clearInterval(weatherPollRef.current); };
  }, [showWeather, fetchWeather]);

  // Weather tile layer toggle
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (weatherTileRef.current) { map.removeLayer(weatherTileRef.current); weatherTileRef.current = null; }
    if (showWeather && OWM_KEY) {
      weatherTileRef.current = L.tileLayer(
        `${OWM_TILE}/${weatherLayer}/{z}/{x}/{y}.png?appid=${OWM_KEY}`,
        { opacity: 0.6, zIndex: 5, attribution: 'Weather © OpenWeatherMap' }
      ).addTo(map);
    }
  }, [showWeather, weatherLayer]);

  // Init map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const map = L.map(mapRef.current).setView([20.5937, 78.9629], 6); // Center on India
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OSM &copy; CARTO', maxZoom: 19,
    }).addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current  = map;
    setTimeout(() => map.invalidateSize(), 200);

    map.on('moveend', () => {
      const c = map.getCenter();
      setMapCenter({ lat: c.lat, lng: c.lng });
    });

    return () => {
      if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }
    };
  }, []);

  // My location
  function getMyLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMyLocation(loc);
        setLocating(false);
        const map = mapInstanceRef.current;
        if (map) {
          if (myLocMarkerRef.current) map.removeLayer(myLocMarkerRef.current);
          myLocMarkerRef.current = L.circleMarker([loc.lat, loc.lng], { radius: 10, fillColor: '#3B82F6', color: '#fff', weight: 3, opacity: 1, fillOpacity: 0.9 }).addTo(map);
          myLocMarkerRef.current.bindPopup('<b>📍 You are here</b>').openPopup();
          L.circleMarker([loc.lat, loc.lng], { radius: 22, fillColor: '#3B82F6', color: '#3B82F6', weight: 1, opacity: 0.3, fillOpacity: 0.1 }).addTo(map);
          map.flyTo([loc.lat, loc.lng], 14, { duration: 1 });
          if (showWeather) fetchWeather(loc);
        }
      },
      () => { setLocating(false); alert('Could not get location. Please enable GPS.'); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  // Markers
  useEffect(() => {
    const map   = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    const catColors = { medical: '#EF4444', food: '#F97316', shelter: '#3B82F6', water: '#06B6D4', rescue: '#A855F7', education: '#10B981', clothing: '#EAB308', sanitation: '#14B8A6', other: '#6B7280' };
    const catIcons  = { medical: '🏥', food: '🍚', shelter: '🏠', water: '💧', rescue: '🚨', education: '📚', clothing: '👕', sanitation: '🧹', other: '📋' };

    needs.forEach(n => {
      const color = catColors[n.category] || '#6B7280';
      const r = 5 + n.urgency * 1.5;
      const marker = L.circleMarker([n.latitude, n.longitude], { radius: r, fillColor: color, color, weight: 2, opacity: 0.9, fillOpacity: 0.5 });
      marker.bindPopup(`
        <div style="font-family:Inter,sans-serif;min-width:180px">
          <div style="font-weight:700;font-size:13px;margin-bottom:4px">${catIcons[n.category]} ${n.title}</div>
          <div style="font-size:11px;color:#888">
            Urgency: ${'🔴'.repeat(n.urgency)}${'⚪'.repeat(5 - n.urgency)}<br/>
            People: <b>${n.people_affected}</b><br/>
            Status: <b>${n.status}</b>
          </div>
        </div>
      `);
      layer.addLayer(marker);
      if (n.urgency >= 4) layer.addLayer(L.circleMarker([n.latitude, n.longitude], { radius: r + 8, fillColor: color, color, weight: 1, opacity: 0.25, fillOpacity: 0.08 }));
    });

    if (needs.length > 0 && !myLocation) {
      map.fitBounds(L.latLngBounds(needs.map(n => [n.latitude, n.longitude])), { padding: [30, 30] });
    }
  }, [needs]);

  const cats    = ['medical', 'food', 'shelter', 'water', 'rescue', 'education', 'clothing', 'sanitation'];
  const catIcons = { medical: '🏥', food: '🍚', shelter: '🏠', water: '💧', rescue: '🚨', education: '📚', clothing: '👕', sanitation: '🧹' };

  const LAYERS = [
    { id: 'precipitation_new', emoji: '🌧️', name: 'Rain' },
    { id: 'wind_new',          emoji: '💨', name: 'Wind' },
    { id: 'clouds_new',        emoji: '☁️', name: 'Clouds' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', paddingBottom: '70px' }}>

      {/* Header */}
      <div style={{ padding: '16px 16px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px' }}>🗺️ Nearby Needs</h2>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {loading ? 'Loading...' : `${needs.length} active needs`}
            <span style={{ marginLeft: '8px' }}>🟢 Live</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {/* Weather Toggle */}
          <button
            onClick={() => setShowWeather(w => !w)}
            style={{
              padding: '8px 12px', borderRadius: '10px', border: 'none',
              background: showWeather
                ? 'linear-gradient(135deg, #0ea5e9, #3b82f6)'
                : 'rgba(255,255,255,0.08)',
              color: '#fff', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '4px',
            }}
          >
            ⛅ {showWeather ? 'Hide' : 'Weather'}
          </button>
          <button
            onClick={getMyLocation}
            disabled={locating}
            style={{ padding: '8px 14px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #3B82F6, #6366F1)', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
          >
            {locating ? '⏳' : '📍'}
          </button>
        </div>
      </div>

      {/* Weather Alert Banner */}
      {showWeather && weatherAlert && (
        <div style={{
          margin: '0 16px 8px', borderRadius: '10px',
          border: `1px solid ${weatherAlert.color}50`,
          background: weatherAlert.bg,
          padding: '10px 14px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img
              src={`https://openweathermap.org/img/wn/${weatherAlert.icon}.png`}
              alt={weatherAlert.desc}
              style={{ width: 32, height: 32 }}
            />
            <div>
              <div style={{ fontWeight: 700, fontSize: '13px', color: weatherAlert.color }}>
                {weatherAlert.label}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '1px', textTransform: 'capitalize' }}>
                {weatherAlert.desc} · {weatherAlert.temp}°C · 💧{weatherAlert.humidity}% · 💨{weatherAlert.wind_kmh}km/h
                {weatherAlert.rain1h > 0 ? ` · 🌧️${weatherAlert.rain1h}mm/h` : ''}
              </div>
            </div>
          </div>
          {!OWM_KEY && (
            <div style={{ fontSize: '10px', color: '#F59E0B', marginTop: '6px' }}>
              ⚠️ Demo mode — set VITE_OWM_API_KEY for live weather
            </div>
          )}
        </div>
      )}

      {/* Weather Layer Tabs */}
      {showWeather && (
        <div style={{ display: 'flex', gap: '6px', padding: '0 16px 8px' }}>
          {LAYERS.map(l => (
            <button
              key={l.id}
              onClick={() => setWeatherLayer(l.id)}
              style={{
                padding: '4px 12px', borderRadius: '20px',
                border: `1px solid ${weatherLayer === l.id ? '#3b82f6' : 'var(--border-color)'}`,
                background: weatherLayer === l.id ? 'linear-gradient(135deg, #1d4ed8, #0ea5e9)' : 'transparent',
                color: weatherLayer === l.id ? '#fff' : 'var(--text-secondary)',
                fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '4px',
              }}
            >
              {l.emoji} {l.name}
            </button>
          ))}
        </div>
      )}

      {/* Category Filters */}
      <div style={{ display: 'flex', gap: '6px', padding: '0 16px 10px', overflowX: 'auto', flexShrink: 0 }}>
        <button
          onClick={() => setFilter('')}
          style={{ padding: '5px 12px', borderRadius: '20px', border: '1px solid var(--border-color)', background: !filter ? 'var(--accent)' : 'transparent', color: !filter ? '#fff' : 'var(--text-secondary)', fontSize: '11px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
        >All</button>
        {cats.map(c => (
          <button
            key={c}
            onClick={() => setFilter(filter === c ? '' : c)}
            style={{ padding: '5px 12px', borderRadius: '20px', border: '1px solid var(--border-color)', background: filter === c ? 'var(--accent)' : 'transparent', color: filter === c ? '#fff' : 'var(--text-secondary)', fontSize: '11px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            {catIcons[c]} {c}
          </button>
        ))}
      </div>

      {/* Map */}
      <div style={{ flex: 1, margin: '0 16px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', position: 'relative' }}>
        <div ref={mapRef} style={{ height: '100%', width: '100%', minHeight: '380px' }} />

        {/* Floating weather badge on map */}
        {showWeather && weatherAlert && (
          <div style={{
            position: 'absolute', top: '8px', left: '8px', zIndex: 500,
            background: 'rgba(15,23,42,0.88)', backdropFilter: 'blur(6px)',
            border: `1px solid ${weatherAlert.color}60`,
            borderRadius: '8px', padding: '5px 10px',
            fontSize: '11px', color: weatherAlert.color, fontWeight: 700,
            pointerEvents: 'none',
          }}>
            ⛅ {weatherAlert.level === 'none' ? 'Clear' : weatherAlert.level.toUpperCase() + ' ALERT'}
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '10px', padding: '6px 16px 4px', flexWrap: 'wrap', fontSize: '10px', color: 'var(--text-muted)' }}>
        <span>🔵 You</span>
        {Object.entries({ medical: '#EF4444', food: '#F97316', shelter: '#3B82F6', water: '#06B6D4', rescue: '#A855F7' }).map(([c, col]) => (
          <span key={c} style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: col, display: 'inline-block' }} />
            {c}
          </span>
        ))}
        {showWeather && <span style={{ color: '#60a5fa' }}>⛅ Weather tile</span>}
      </div>
    </div>
  );
}
