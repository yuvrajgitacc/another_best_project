import { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import { needs as needsApi, analytics } from '../services/api';
import { Map as MapIcon, RefreshCw, Flame, Search, X, CloudRain } from 'lucide-react';
import {
  getOWMTileUrl, fetchWeatherWithAlerts,
  WEATHER_LAYERS, INDIA_CENTER,
} from '../services/weatherService';

const OWM_API_KEY = import.meta.env.VITE_OWM_API_KEY || '';

export default function MapPage() {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const heatLayerRef = useRef(null);
  const weatherLayerRef = useRef(null);
  const searchMarkerRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const pollRef = useRef(null);
  const weatherPollRef = useRef(null);

  const [mapNeeds, setMapNeeds] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [heatmapData, setHeatmapData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Weather state
  const [showWeather, setShowWeather] = useState(false);
  const [activeWeatherLayer, setActiveWeatherLayer] = useState('precipitation_new');
  const [weatherAlert, setWeatherAlert] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: INDIA_CENTER.lat, lng: INDIA_CENTER.lng });

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

  // Weather alert fetch
  const loadWeatherAlert = useCallback(async (center = mapCenter) => {
    // Only fetch real weather data when API key is configured
    if (!OWM_API_KEY) return;
    setWeatherLoading(true);
    const result = await fetchWeatherWithAlerts(center.lat, center.lng, OWM_API_KEY);
    if (result) setWeatherAlert(result);
    setWeatherLoading(false);
  }, [mapCenter]);

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

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView([22.0, 73.5], 6);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 19,
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
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
        heatLayerRef.current = null;
        weatherLayerRef.current = null;
      }
    };
  }, []);

  // Weather tile layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (weatherLayerRef.current) { map.removeLayer(weatherLayerRef.current); weatherLayerRef.current = null; }
    if (!showWeather || !OWM_API_KEY) return;
    const tileUrl = getOWMTileUrl(activeWeatherLayer, OWM_API_KEY);
    if (tileUrl) {
      weatherLayerRef.current = L.tileLayer(tileUrl, {
        opacity: 0.65, zIndex: 5,
        attribution: 'Weather &copy; <a href="https://openweathermap.org">OpenWeatherMap</a>',
      }).addTo(map);
    }
  }, [showWeather, activeWeatherLayer]);

  // Heatmap layer
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

  // Need markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;
    markersLayer.clearLayers();

    const catColors = {
      medical: '#EF4444', food: '#F97316', shelter: '#3B82F6',
      water: '#06B6D4', rescue: '#A855F7', education: '#10B981',
      clothing: '#EAB308', sanitation: '#14B8A6', other: '#6B7280',
    };

    mapNeeds.forEach(need => {
      const color = catColors[need.category] || '#6B7280';
      const radius = 6 + (need.urgency * 2);

      const marker = L.circleMarker([need.latitude, need.longitude], {
        radius, fillColor: color, color: color,
        weight: 2, opacity: 0.9, fillOpacity: 0.6,
      });

      let urgencyHtml = '<div style="display:flex;gap:2px;margin-top:2px;">';
      for(let i=1; i<=5; i++) {
        urgencyHtml += `<div style="width:6px;height:6px;border-radius:50%;background:${i <= need.urgency ? '#EF4444' : '#ccc'}"></div>`;
      }
      urgencyHtml += '</div>';

      marker.bindPopup(`
        <div style="font-family: Inter, sans-serif; min-width: 220px;">
          <h4 style="margin: 0 0 4px; font-size: 14px;">${need.title}</h4>
          <p style="margin: 0; color: #666; font-size: 12px;">
            Category: <strong>${need.category}</strong><br/>
            Urgency: ${urgencyHtml} (${need.urgency}/5)<br/>
            People: <strong>${need.people_affected}</strong><br/>
            Status: <strong>${need.status}</strong>
          </p>
        </div>
      `);

      markersLayer.addLayer(marker);
      if (need.urgency >= 4) {
        markersLayer.addLayer(L.circleMarker([need.latitude, need.longitude], {
          radius: radius + 8, fillColor: color, color: color,
          weight: 1, opacity: 0.3, fillOpacity: 0.1,
        }));
      }
    });

    if (mapNeeds.length > 0) {
      map.fitBounds(L.latLngBounds(mapNeeds.map(n => [n.latitude, n.longitude])), { padding: [50, 50] });
    }
  }, [mapNeeds]);

  // Search
  function handleSearchInput(value) {
    setSearchQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!value || value.length < 3) { setSearchResults([]); return; }
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
    searchMarkerRef.current = L.circleMarker([lat, lon], {
      radius: 12, fillColor: '#FBBF24', color: '#F59E0B',
      weight: 3, opacity: 1, fillOpacity: 0.4,
    }).addTo(map);
    searchMarkerRef.current.bindPopup(`<b>Location: ${name}</b>`).openPopup();
    setSearchQuery(name);
    setSearchResults([]);
    if (showWeather) loadWeatherAlert({ lat, lng: lon });
  }

  const categories = ['medical', 'food', 'shelter', 'water', 'rescue', 'education', 'clothing', 'sanitation'];

  return (
    <>
      <div className="page-header">
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><MapIcon size={24} color="var(--accent)" /> Live Crisis Map</h2>
          <div className="subtitle" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {loading ? 'Loading...' : `${mapNeeds.length} active needs on map`}
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-green)' }}></span> Auto-refresh 30s
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            className={`btn btn-sm ${showWeather ? '' : 'btn-outline'}`}
            onClick={() => setShowWeather(!showWeather)}
            style={showWeather ? { background: 'linear-gradient(135deg, #3b82f6, #0ea5e9)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '6px' } : { display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <CloudRain size={14} /> {showWeather ? 'Hide Weather' : 'Weather Overlay'}
          </button>
          <button
            className={`btn btn-sm ${showHeatmap ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setShowHeatmap(!showHeatmap)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Flame size={14} color={showHeatmap ? '#fff' : 'var(--accent-orange)'} /> {showHeatmap ? 'Hide' : 'Show'} Heatmap
          </button>
          <button className="btn btn-primary" onClick={loadMapData} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Weather: No API Key notice */}
        {showWeather && !OWM_API_KEY && (
          <div style={{
            marginBottom: '16px', padding: '12px 18px',
            background: 'rgba(100,116,139,0.1)',
            border: '1px solid rgba(100,116,139,0.3)',
            borderRadius: '12px', fontSize: '13px', color: 'var(--text-secondary)',
          }}>
            <CloudRain size={16} style={{ verticalAlign: 'text-bottom', marginRight: '6px' }} />
            Weather overlay needs an API key. Add <code style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 6px', borderRadius: '4px' }}>VITE_OWM_API_KEY=your-key</code> to <code style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 6px', borderRadius: '4px' }}>.env</code> (free at openweathermap.org)
          </div>
        )}

        {/* Weather Alert Banner */}
        {showWeather && weatherAlert && (
          <div style={{
            marginBottom: '16px', padding: '12px 18px',
            background: weatherAlert.bg || 'rgba(16,185,129,0.08)',
            border: `1px solid ${weatherAlert.color || '#10B981'}40`,
            borderRadius: '12px',
            display: 'flex', alignItems: 'center', gap: '12px',
          }}>
            <img
              src={`https://openweathermap.org/img/wn/${weatherAlert.icon || '01d'}@2x.png`}
              alt={weatherAlert.description} style={{ width: 44, height: 44 }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '13px', color: weatherAlert.color }}>
                {weatherAlert.label || 'All Clear'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', textTransform: 'capitalize' }}>
                {weatherAlert.description} &middot; {weatherAlert.temp}&deg;C &middot; Wind: {weatherAlert.wind_speed} km/h &middot; Humidity: {weatherAlert.humidity}%
                {weatherAlert.rain1h > 0 ? ` · Rain: ${weatherAlert.rain1h}mm/h` : ''}
                {weatherAlert.cityName ? ` · ${weatherAlert.cityName}` : ''}
              </div>
            </div>
            {weatherLoading && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Updating...</span>}
            {!OWM_API_KEY && <span style={{ fontSize: '10px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '8px' }}>Demo Mode</span>}
          </div>
        )}

        {/* Weather Layer Selector */}
        {showWeather && OWM_API_KEY && (
          <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
            {WEATHER_LAYERS.map(layer => (
              <button
                key={layer.id}
                className={`btn btn-sm ${activeWeatherLayer === layer.id ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setActiveWeatherLayer(layer.id)}
                title={layer.desc}
                style={{ fontSize: '11px' }}
              >
                {layer.name}
              </button>
            ))}
          </div>
        )}

        {/* Filter buttons */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <button className={`btn btn-sm ${!filter ? 'btn-primary' : 'btn-outline'}`} onClick={() => setFilter('')}>All</button>
          {categories.map(cat => (
            <button
              key={cat}
              className={`btn btn-sm ${filter === cat ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setFilter(filter === cat ? '' : cat)}
              style={{ textTransform: 'capitalize' }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div style={{ position: 'relative', marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0 12px' }}>
            <Search size={16} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search location (e.g. Dharavi, Mumbai, Vadodara)"
              value={searchQuery}
              onChange={e => handleSearchInput(e.target.value)}
              style={{
                flex: 1, padding: '10px 4px',
                border: 'none', background: 'transparent',
                color: 'var(--text-primary)', fontSize: '14px', outline: 'none',
              }}
            />
            {searchQuery && (
              <button className="btn btn-sm" onClick={() => {
                setSearchQuery(''); setSearchResults([]);
                if (searchMarkerRef.current && mapInstanceRef.current) {
                  mapInstanceRef.current.removeLayer(searchMarkerRef.current);
                  searchMarkerRef.current = null;
                }
              }} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
                <X size={16} />
              </button>
            )}
          </div>
          {searchResults.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000,
              background: 'var(--bg-card)', border: '1px solid var(--border-color)',
              borderRadius: '10px', marginTop: '4px', overflow: 'hidden',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            }}>
              {searchResults.map((r, i) => (
                <div
                  key={i}
                  onClick={() => flyToLocation(parseFloat(r.lat), parseFloat(r.lon), r.display_name.split(',')[0])}
                  style={{
                    padding: '10px 16px', cursor: 'pointer', fontSize: '13px',
                    borderBottom: i < searchResults.length - 1 ? '1px solid var(--border-color)' : 'none',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ fontWeight: 600 }}>Location: {r.display_name.split(',').slice(0, 2).join(', ')}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {r.display_name}
                  </div>
                </div>
              ))}
            </div>
          )}
          {searching && (
            <div style={{ position: 'absolute', right: '40px', top: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>Searching...</div>
          )}
        </div>

        {/* Map */}
        <div className="map-container" style={{ height: '600px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
          <div ref={mapRef} style={{ height: '100%', width: '100%' }}></div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '16px', marginTop: '12px', flexWrap: 'wrap', fontSize: '12px', color: 'var(--text-secondary)' }}>
          {Object.entries({
            medical: '#EF4444', food: '#F97316', shelter: '#3B82F6',
            water: '#06B6D4', rescue: '#A855F7', education: '#10B981',
            clothing: '#EAB308', sanitation: '#14B8A6',
          }).map(([cat, color]) => (
            <span key={cat} style={{ display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'capitalize' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block' }}></span>
              {cat}
            </span>
          ))}
          <span style={{ marginLeft: '16px' }}>Large circle = High urgency</span>
          {showWeather && <span style={{ marginLeft: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}><CloudRain size={12} color="var(--accent)" /> Weather overlay active</span>}
        </div>
      </div>
    </>
  );
}
