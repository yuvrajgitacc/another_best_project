import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const API_BASE = '/api/v1';

export default function MapPage() {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const myLocMarkerRef = useRef(null);
  const [needs, setNeeds] = useState([]);
  const [myLocation, setMyLocation] = useState(null);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);

  // Load needs for map
  async function loadNeeds() {
    try {
      const token = localStorage.getItem('vol_token');
      const params = new URLSearchParams();
      if (filter) params.set('category', filter);
      const res = await fetch(`${API_BASE}/needs/map?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNeeds(data);
      }
    } catch (e) {
      console.error('Failed to load needs:', e);
    }
    setLoading(false);
  }

  useEffect(() => { loadNeeds(); }, [filter]);

  // Auto-refresh every 30s
  useEffect(() => {
    const iv = setInterval(loadNeeds, 30000);
    return () => clearInterval(iv);
  }, [filter]);

  // Get user's live location
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
          // Remove old marker
          if (myLocMarkerRef.current) map.removeLayer(myLocMarkerRef.current);

          // Blue pulsing dot for "You"
          myLocMarkerRef.current = L.circleMarker([loc.lat, loc.lng], {
            radius: 10, fillColor: '#3B82F6', color: '#fff',
            weight: 3, opacity: 1, fillOpacity: 0.9,
          }).addTo(map);
          myLocMarkerRef.current.bindPopup('<b>📍 You are here</b>').openPopup();

          // Also add outer pulse ring
          L.circleMarker([loc.lat, loc.lng], {
            radius: 22, fillColor: '#3B82F6', color: '#3B82F6',
            weight: 1, opacity: 0.3, fillOpacity: 0.1,
          }).addTo(map);

          map.flyTo([loc.lat, loc.lng], 14, { duration: 1 });
        }
      },
      () => { setLocating(false); alert('Could not get location. Please enable GPS.'); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current).setView([19.076, 72.878], 12);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OSM &copy; CARTO', maxZoom: 19,
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    setTimeout(() => map.invalidateSize(), 200);

    return () => { if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; } };
  }, []);

  // Update markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    const catColors = {
      medical: '#EF4444', food: '#F97316', shelter: '#3B82F6',
      water: '#06B6D4', rescue: '#A855F7', education: '#10B981',
      clothing: '#EAB308', sanitation: '#14B8A6', other: '#6B7280',
    };
    const catIcons = {
      medical: '🏥', food: '🍚', shelter: '🏠', water: '💧',
      rescue: '🚨', education: '📚', clothing: '👕', sanitation: '🧹', other: '📋',
    };

    needs.forEach(n => {
      const color = catColors[n.category] || '#6B7280';
      const r = 5 + n.urgency * 1.5;

      const marker = L.circleMarker([n.latitude, n.longitude], {
        radius: r, fillColor: color, color: color,
        weight: 2, opacity: 0.9, fillOpacity: 0.5,
      });

      marker.bindPopup(`
        <div style="font-family:Inter,sans-serif;min-width:180px">
          <div style="font-weight:700;font-size:13px;margin-bottom:4px">${catIcons[n.category]} ${n.title}</div>
          <div style="font-size:11px;color:#888">
            Urgency: ${'🔴'.repeat(n.urgency)}${'⚪'.repeat(5-n.urgency)}<br/>
            People: <b>${n.people_affected}</b><br/>
            Status: <b>${n.status}</b>
          </div>
        </div>
      `);
      layer.addLayer(marker);

      if (n.urgency >= 4) {
        layer.addLayer(L.circleMarker([n.latitude, n.longitude], {
          radius: r + 8, fillColor: color, color: color,
          weight: 1, opacity: 0.25, fillOpacity: 0.08,
        }));
      }
    });

    if (needs.length > 0 && !myLocation) {
      map.fitBounds(L.latLngBounds(needs.map(n => [n.latitude, n.longitude])), { padding: [30, 30] });
    }
  }, [needs]);

  const cats = ['medical', 'food', 'shelter', 'water', 'rescue', 'education', 'clothing', 'sanitation'];
  const catIcons = { medical: '🏥', food: '🍚', shelter: '🏠', water: '💧', rescue: '🚨', education: '📚', clothing: '👕', sanitation: '🧹' };

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
        <button
          onClick={getMyLocation}
          disabled={locating}
          style={{
            padding: '8px 14px', borderRadius: '10px', border: 'none',
            background: 'linear-gradient(135deg, #3B82F6, #6366F1)', color: '#fff',
            fontSize: '12px', fontWeight: 600, cursor: 'pointer',
          }}
        >
          {locating ? '⏳ Locating...' : '📍 My Location'}
        </button>
      </div>

      {/* Category Filters */}
      <div style={{ display: 'flex', gap: '6px', padding: '0 16px 10px', overflowX: 'auto', flexShrink: 0 }}>
        <button
          onClick={() => setFilter('')}
          style={{
            padding: '5px 12px', borderRadius: '20px', border: '1px solid var(--border-color)',
            background: !filter ? 'var(--accent)' : 'transparent', color: !filter ? '#fff' : 'var(--text-secondary)',
            fontSize: '11px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
          }}
        >All</button>
        {cats.map(c => (
          <button
            key={c}
            onClick={() => setFilter(filter === c ? '' : c)}
            style={{
              padding: '5px 12px', borderRadius: '20px', border: '1px solid var(--border-color)',
              background: filter === c ? 'var(--accent)' : 'transparent',
              color: filter === c ? '#fff' : 'var(--text-secondary)',
              fontSize: '11px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >{catIcons[c]} {c}</button>
        ))}
      </div>

      {/* Map */}
      <div style={{ flex: 1, margin: '0 16px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
        <div ref={mapRef} style={{ height: '100%', width: '100%', minHeight: '400px' }}></div>
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex', gap: '10px', padding: '8px 16px', flexWrap: 'wrap',
        fontSize: '10px', color: 'var(--text-muted)',
      }}>
        <span>🔵 You</span>
        {Object.entries({ medical: '#EF4444', food: '#F97316', shelter: '#3B82F6', water: '#06B6D4', rescue: '#A855F7' })
          .map(([c, col]) => (
            <span key={c} style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: col, display: 'inline-block' }}></span>
              {c}
            </span>
          ))}
        <span>○ = High urgency</span>
      </div>
    </div>
  );
}
