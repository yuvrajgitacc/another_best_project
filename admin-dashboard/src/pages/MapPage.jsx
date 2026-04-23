import { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import { needs as needsApi, analytics } from '../services/api';
import {
  getOWMTileUrl, fetchWeatherAlert,
  WEATHER_LAYERS, INDIA_CENTER,
} from '../services/weatherService';

const OWM_API_KEY = import.meta.env.VITE_OWM_API_KEY || '';

export default function MapPage() {
  const mapRef             = useRef(null);
  const mapInstanceRef     = useRef(null);
  const markersLayerRef    = useRef(null);
  const heatLayerRef       = useRef(null);
  const weatherLayerRef    = useRef(null);
  const searchMarkerRef    = useRef(null);
  const searchTimeoutRef   = useRef(null);
  const pollRef            = useRef(null);
  const weatherPollRef     = useRef(null);

  const [mapNeeds, setMapNeeds]       = useState([]);
  const [filter, setFilter]           = useState('');
  const [loading, setLoading]         = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [heatmapData, setHeatmapData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching]     = useState(false);

  // ── Weather state ──────────────────────────────────────────
  const [showWeather, setShowWeather]     = useState(false);
  const [activeWeatherLayer, setActiveWeatherLayer] = useState('precipitation_new');
  const [weatherAlert, setWeatherAlert]   = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [mapCenter, setMapCenter]         = useState({ lat: 20.5937, lng: 78.9629 }); // India center

  // ─────────────────────────────────────────────────────────────
  // Load needs + heatmap
  // ─────────────────────────────────────────────────────────────
  useEffect(() => { loadMapData(); }, [filter]);

  useEffect(() => {
    pollRef.current = setInterval(() => { loadMapData(); }, 30000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [filter]);

  async function loadMapData() {
    try {
      const params = {};
      if (filter) params.category = filter;
      const [data, heatData] = await Promise.all([
        needsApi.getForMap(params),
        analytics.getHeatmap(params),
      ]);
      setMapNeeds(data);
      setHeatmapData(heatData);
    } catch (err) {
      console.error('Failed to load map data:', err);
    }
    setLoading(false);
  }

  // ─────────────────────────────────────────────────────────────
  // Weather alert fetch (uses current map center)
  // ─────────────────────────────────────────────────────────────
  const loadWeatherAlert = useCallback(async (center = mapCenter) => {
    if (!OWM_API_KEY) {
      // Demo mode — simulate a yellow alert for UI preview
      setWeatherAlert({
        temp: 32, feels_like: 37, humidity: 85,
        wind_speed: 28, rain1h: 1.2,
        description: 'moderate rain',
        icon: '10d',
        alertLevel: 'yellow',
        color: '#F59E0B',
        label: '🟡 YELLOW ALERT — Light Rain / Drizzle',
        bg: 'rgba(245,158,11,0.10)',
      });
      return;
    }
    setWeatherLoading(true);
    const result = await fetchWeatherAlert(center.lat, center.lng, OWM_API_KEY);
    if (result) setWeatherAlert(result);
    setWeatherLoading(false);
  }, [mapCenter, OWM_API_KEY]);

  // Poll weather every 5 minutes when overlay is on
  useEffect(() => {
    if (!showWeather) {
      if (weatherPollRef.current) clearInterval(weatherPollRef.current);
      return;
    }
    loadWeatherAlert();
    weatherPollRef.current = setInterval(() => loadWeatherAlert(), 5 * 60 * 1000);
    return () => { if (weatherPollRef.current) clearInterval(weatherPollRef.current); };
  }, [showWeather, loadWeatherAlert]);

  // ─────────────────────────────────────────────────────────────
  // Initialize map
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView([20.5937, 78.9629], 6); // Center on India to show multiple cities

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 19,
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current  = map;
    setTimeout(() => map.invalidateSize(), 200);

    // Track center for weather fetch
    map.on('moveend', () => {
      const c = map.getCenter();
      setMapCenter({ lat: c.lat, lng: c.lng });
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersLayerRef.current = null;
        heatLayerRef.current    = null;
        weatherLayerRef.current = null;
      }
    };
  }, []);

  // ─────────────────────────────────────────────────────────────
  // Weather tile layer management
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove existing weather layer
    if (weatherLayerRef.current) {
      map.removeLayer(weatherLayerRef.current);
      weatherLayerRef.current = null;
    }

    if (!showWeather) return;

    const tileUrl = OWM_API_KEY
      ? getOWMTileUrl(activeWeatherLayer, OWM_API_KEY)
      : null;

    if (tileUrl) {
      weatherLayerRef.current = L.tileLayer(tileUrl, {
        opacity: 0.65,
        zIndex: 5,
        attribution: 'Weather &copy; <a href="https://openweathermap.org">OpenWeatherMap</a>',
      }).addTo(map);
    }
  }, [showWeather, activeWeatherLayer]);

  // ─────────────────────────────────────────────────────────────
  // Heatmap layer
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (heatLayerRef.current) { map.removeLayer(heatLayerRef.current); heatLayerRef.current = null; }
    if (showHeatmap && heatmapData.length > 0) {
      heatLayerRef.current = L.heatLayer(
        heatmapData.map(p => [p.latitude, p.longitude, p.intensity || 50]),
        { radius: 35, blur: 25, maxZoom: 17, max: 100, gradient: { 0.2: '#2563EB', 0.4: '#06B6D4', 0.6: '#10B981', 0.8: '#F97316', 1.0: '#EF4444' } }
      ).addTo(map);
    }
  }, [showHeatmap, heatmapData]);

  // ─────────────────────────────────────────────────────────────
  // Need markers
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;
    markersLayer.clearLayers();

    const catColors = { medical: '#EF4444', food: '#F97316', shelter: '#3B82F6', water: '#06B6D4', rescue: '#A855F7', education: '#10B981', clothing: '#EAB308', sanitation: '#14B8A6', other: '#6B7280' };
    const catIcons  = { medical: '🏥', food: '🍚', shelter: '🏠', water: '💧', rescue: '🚨', education: '📚', clothing: '👕', sanitation: '🧹', other: '📋' };

    mapNeeds.forEach(need => {
      const color  = catColors[need.category] || '#6B7280';
      const radius = 6 + (need.urgency * 2);
      const marker = L.circleMarker([need.latitude, need.longitude], { radius, fillColor: color, color, weight: 2, opacity: 0.9, fillOpacity: 0.6 });
      marker.bindPopup(`
        <div style="font-family:Inter,sans-serif;min-width:220px;">
          <h4 style="margin:0 0 4px;font-size:14px;">${catIcons[need.category] || '📋'} ${need.title}</h4>
          <p style="margin:0;color:#666;font-size:12px;">
            Category: <strong>${need.category}</strong><br/>
            Urgency: <strong>${'🔴'.repeat(need.urgency)}${'⚪'.repeat(5 - need.urgency)}</strong> (${need.urgency}/5)<br/>
            People: <strong>${need.people_affected}</strong><br/>
            Status: <strong>${need.status}</strong>
          </p>
        </div>
      `);
      markersLayer.addLayer(marker);
      if (need.urgency >= 4) {
        markersLayer.addLayer(L.circleMarker([need.latitude, need.longitude], { radius: radius + 8, fillColor: color, color, weight: 1, opacity: 0.3, fillOpacity: 0.1 }));
      }
    });

    if (mapNeeds.length > 0) {
      map.fitBounds(L.latLngBounds(mapNeeds.map(n => [n.latitude, n.longitude])), { padding: [50, 50] });
    }
  }, [mapNeeds]);

  // ─────────────────────────────────────────────────────────────
  // Search
  // ─────────────────────────────────────────────────────────────
  function handleSearchInput(value) {
    setSearchQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (value.length < 3) { setSearchResults([]); return; }

    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value)}&format=json&limit=5&countrycodes=in`,
          { headers: { 'User-Agent': 'SevaSetu/1.0' } }
        );
        setSearchResults(await res.json());
      } catch (e) { console.error('Search failed:', e); }
      setSearching(false);
    }, 400);
  }

  function flyToLocation(lat, lon, name) {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (searchMarkerRef.current) map.removeLayer(searchMarkerRef.current);
    map.flyTo([lat, lon], 14, { duration: 1.5 });
    searchMarkerRef.current = L.circleMarker([lat, lon], { radius: 12, fillColor: '#FBBF24', color: '#F59E0B', weight: 3, opacity: 1, fillOpacity: 0.4 }).addTo(map);
    searchMarkerRef.current.bindPopup(`<b>📍 ${name}</b>`).openPopup();
    setSearchQuery(name);
    setSearchResults([]);
    // Refresh weather for this location
    if (showWeather) loadWeatherAlert({ lat, lng: lon });
  }

  const categories = ['medical', 'food', 'shelter', 'water', 'rescue', 'education', 'clothing', 'sanitation'];
  const catIcons   = { medical: '🏥', food: '🍚', shelter: '🏠', water: '💧', rescue: '🚨', education: '📚', clothing: '👕', sanitation: '🧹' };

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h2>🗺️ Live Crisis Map</h2>
          <div className="subtitle">
            {loading ? 'Loading...' : `${mapNeeds.length} active needs on map`}
            <span style={{ marginLeft: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>🟢 Auto-refresh 30s</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {/* Weather Toggle */}
          <button
            className={`btn btn-sm ${showWeather ? '' : 'btn-outline'}`}
            onClick={() => setShowWeather(!showWeather)}
            style={showWeather ? {
              background: 'linear-gradient(135deg, #3b82f6, #0ea5e9)',
              color: 'white', border: 'none',
            } : {}}
          >
            ⛅ {showWeather ? 'Hide Weather' : 'Weather Overlay'}
          </button>
          <button className={`btn btn-sm ${showHeatmap ? 'btn-primary' : 'btn-outline'}`} onClick={() => setShowHeatmap(!showHeatmap)}>
            🔥 {showHeatmap ? 'Hide' : 'Show'} Heatmap
          </button>
          <button className="btn btn-primary" onClick={loadMapData}>↻ Refresh</button>
        </div>
      </div>

      <div className="page-body">
        {/* Weather Alert Banner */}
        {showWeather && weatherAlert && (
          <div style={{
            borderRadius: '10px', border: `1px solid ${weatherAlert.color}40`,
            background: weatherAlert.bg, padding: '12px 16px',
            marginBottom: '12px', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img
                src={`https://openweathermap.org/img/wn/${weatherAlert.icon}@2x.png`}
                alt={weatherAlert.description}
                style={{ width: 48, height: 48 }}
              />
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: weatherAlert.color }}>
                  {weatherAlert.label}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', textTransform: 'capitalize' }}>
                  {weatherAlert.description} · {weatherAlert.temp}°C (feels {weatherAlert.feels_like}°C) · 💧 {weatherAlert.humidity}% · 💨 {weatherAlert.wind_speed} km/h
                  {weatherAlert.rain1h > 0 ? ` · 🌧️ ${weatherAlert.rain1h}mm/h` : ''}
                </div>
              </div>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {!OWM_API_KEY && <span style={{ color: '#F59E0B' }}>⚠️ Demo mode — add VITE_OWM_API_KEY for live data</span>}
              {OWM_API_KEY && <span>📍 {mapCenter.lat.toFixed(3)}°N, {mapCenter.lng.toFixed(3)}°E</span>}
            </div>
          </div>
        )}

        {/* Weather Layer Selector (Windy-style panel) */}
        {showWeather && (
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-color)',
            borderRadius: '12px', padding: '12px 16px', marginBottom: '14px',
          }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              ⛅ Weather Layers
              {!OWM_API_KEY && <span style={{ marginLeft: '8px', color: '#F59E0B', textTransform: 'none' }}>— add VITE_OWM_API_KEY to enable tiles</span>}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {WEATHER_LAYERS.map(layer => (
                <button
                  key={layer.id}
                  onClick={() => setActiveWeatherLayer(layer.id)}
                  title={layer.desc}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    border: `1px solid ${activeWeatherLayer === layer.id ? '#3b82f6' : 'var(--border-color)'}`,
                    background: activeWeatherLayer === layer.id
                      ? 'linear-gradient(135deg, #1d4ed8, #0ea5e9)'
                      : 'transparent',
                    color: activeWeatherLayer === layer.id ? '#fff' : 'var(--text-secondary)',
                    fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '5px',
                    transition: 'all 0.2s',
                  }}
                >
                  <span>{layer.emoji}</span>
                  <span style={{ fontSize: '11px' }}>{layer.name}</span>
                </button>
              ))}
            </div>

            {/* Weather Legend */}
            {activeWeatherLayer === 'precipitation_new' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Rain intensity:</span>
                {[
                  { color: '#a8edff', label: 'Trace' },
                  { color: '#3fa8f5', label: 'Light' },
                  { color: '#1464b4', label: 'Moderate' },
                  { color: '#0a1450', label: 'Heavy' },
                  { color: '#f02020', label: 'Extreme' },
                ].map(({ color, label }) => (
                  <span key={label} style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', color: 'var(--text-muted)' }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: color, display: 'inline-block' }} />
                    {label}
                  </span>
                ))}
              </div>
            )}
            {activeWeatherLayer === 'wind_new' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Wind speed:</span>
                {[
                  { color: '#ffffff', label: 'Calm' },
                  { color: '#88ccff', label: 'Breeze' },
                  { color: '#3399ff', label: 'Moderate' },
                  { color: '#ff6600', label: 'Strong' },
                  { color: '#ff0000', label: 'Storm' },
                ].map(({ color, label }) => (
                  <span key={label} style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', color: 'var(--text-muted)' }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: color, display: 'inline-block', border: '1px solid rgba(255,255,255,0.2)' }} />
                    {label}
                  </span>
                ))}
              </div>
            )}
            {activeWeatherLayer === 'temp_new' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Temperature:</span>
                {[
                  { color: '#8080ff', label: '<0°C' },
                  { color: '#00b0ff', label: '10°C' },
                  { color: '#00ff80', label: '20°C' },
                  { color: '#ffff00', label: '30°C' },
                  { color: '#ff4000', label: '>40°C' },
                ].map(({ color, label }) => (
                  <span key={label} style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', color: 'var(--text-muted)' }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: color, display: 'inline-block' }} />
                    {label}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Category Filters */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <button className={`btn btn-sm ${!filter ? 'btn-primary' : 'btn-outline'}`} onClick={() => setFilter('')}>All</button>
          {categories.map(cat => (
            <button
              key={cat}
              className={`btn btn-sm ${filter === cat ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setFilter(filter === cat ? '' : cat)}
            >
              {catIcons[cat]} {cat}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div style={{ position: 'relative', marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="🔍 Search location (e.g. Mumbai, Delhi, Bangalore)"
              value={searchQuery}
              onChange={e => handleSearchInput(e.target.value)}
              style={{
                flex: 1, padding: '10px 16px', borderRadius: '10px',
                border: '1px solid var(--border-color)', background: 'var(--bg-input)',
                color: 'var(--text-primary)', fontSize: '14px', outline: 'none',
              }}
            />
            {searchQuery && (
              <button className="btn btn-outline btn-sm" onClick={() => { setSearchQuery(''); setSearchResults([]); if (searchMarkerRef.current && mapInstanceRef.current) { mapInstanceRef.current.removeLayer(searchMarkerRef.current); searchMarkerRef.current = null; } }}>✕</button>
            )}
          </div>
          {searchResults.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000, background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', marginTop: '4px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
              {searchResults.map((r, i) => (
                <div
                  key={i}
                  onClick={() => flyToLocation(parseFloat(r.lat), parseFloat(r.lon), r.display_name.split(',')[0])}
                  style={{ padding: '10px 16px', cursor: 'pointer', fontSize: '13px', borderBottom: i < searchResults.length - 1 ? '1px solid var(--border-color)' : 'none', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ fontWeight: 600 }}>📍 {r.display_name.split(',').slice(0, 2).join(', ')}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{r.display_name}</div>
                </div>
              ))}
            </div>
          )}
          {searching && <div style={{ position: 'absolute', right: '60px', top: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>Searching...</div>}
        </div>

        {/* Map */}
        <div className="map-container" style={{ height: '580px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', position: 'relative' }}>
          <div ref={mapRef} style={{ height: '100%', width: '100%' }} />

          {/* Windy-style floating weather layer indicator */}
          {showWeather && (
            <div style={{
              position: 'absolute', top: '10px', right: '10px', zIndex: 500,
              background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(59,130,246,0.4)', borderRadius: '10px',
              padding: '8px 12px', fontSize: '11px', color: '#94a3b8',
              pointerEvents: 'none',
            }}>
              <div style={{ fontWeight: 700, color: '#60a5fa', marginBottom: '2px' }}>
                {WEATHER_LAYERS.find(l => l.id === activeWeatherLayer)?.emoji}{' '}
                {WEATHER_LAYERS.find(l => l.id === activeWeatherLayer)?.name}
              </div>
              <div>⛅ Weather Overlay ON</div>
              {weatherAlert && (
                <div style={{ marginTop: '4px', color: weatherAlert.color, fontWeight: 600 }}>
                  {weatherAlert.alertLevel === 'none' ? '✅' : '⚠️'} {weatherAlert.alertLevel.toUpperCase()} ALERT
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── MAP KEY ──────────────────────────────────── */}
        <div style={{
          marginTop: '16px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '14px',
          padding: '16px 20px',
        }}>
          <div style={{
            fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '12px',
          }}>
            🗺️ Map Key
          </div>

          {/* Category colour grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
            gap: '8px',
            marginBottom: '14px',
          }}>
            {[
              { cat: 'medical',    color: '#EF4444', icon: '🏥' },
              { cat: 'food',       color: '#F97316', icon: '🍚' },
              { cat: 'shelter',    color: '#3B82F6', icon: '🏠' },
              { cat: 'water',      color: '#06B6D4', icon: '💧' },
              { cat: 'rescue',     color: '#A855F7', icon: '🚨' },
              { cat: 'education',  color: '#10B981', icon: '📚' },
              { cat: 'clothing',   color: '#EAB308', icon: '👕' },
              { cat: 'sanitation', color: '#14B8A6', icon: '🧹' },
            ].map(({ cat, color, icon }) => (
              <div key={cat} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: `${color}12`,
                border: `1px solid ${color}30`,
                borderRadius: '8px',
                padding: '6px 10px',
              }}>
                {/* Pin circle */}
                <span style={{
                  width: 14, height: 14, borderRadius: '50%',
                  background: color,
                  boxShadow: `0 0 6px ${color}80`,
                  flexShrink: 0,
                  display: 'inline-block',
                }} />
                <span style={{ fontSize: '14px' }}>{icon}</span>
                <span style={{
                  fontSize: '12px', fontWeight: 600,
                  color: 'var(--text-primary)',
                  textTransform: 'capitalize',
                }}>{cat}</span>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>

            {/* Urgency scale */}
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pin Size = Urgency</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                {[1, 2, 3, 4, 5].map(u => (
                  <div key={u} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                    <span style={{
                      width: 8 + u * 4, height: 8 + u * 4, borderRadius: '50%',
                      background: u <= 2 ? '#3B82F6' : u === 3 ? '#F59E0B' : u === 4 ? '#F97316' : '#EF4444',
                      display: 'block',
                      boxShadow: u === 5 ? '0 0 8px rgba(239,68,68,0.5)' : 'none',
                    }} />
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{u}</span>
                  </div>
                ))}
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: '4px', alignSelf: 'center' }}>Low → Critical</span>
              </div>
            </div>

            {/* Pulse ring */}
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pulse Ring</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26 }}>
                  <span style={{ width: 26, height: 26, borderRadius: '50%', border: '2px solid rgba(239,68,68,0.3)', display: 'block', position: 'absolute' }} />
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#EF4444', display: 'block' }} />
                </span>
                Urgency ≥ 4 (High / Critical)
              </div>
            </div>

            {/* Your location */}
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Other</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FBBF24', display: 'inline-block' }} />
                  📍 Search result
                </span>
                {showHeatmap && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: 50, height: 8, borderRadius: 4, background: 'linear-gradient(to right, #2563EB, #06B6D4, #10B981, #F97316, #EF4444)', display: 'inline-block' }} />
                    Crisis density
                  </span>
                )}
                {showWeather && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#60a5fa' }}>
                    ⛅ Weather tile (OpenWeatherMap)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
