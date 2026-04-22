import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import { needs as needsApi, analytics } from '../services/api';

export default function MapPage() {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const heatLayerRef = useRef(null);
  const [mapNeeds, setMapNeeds] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [heatmapData, setHeatmapData] = useState([]);
  const pollRef = useRef(null);

  useEffect(() => { loadMapData(); }, [filter]);

  // Auto-refresh map every 30s
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

  // Initialize map once
  useEffect(() => {
    if (!mapRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView([19.076, 72.878], 12);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 19,
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    setTimeout(() => { map.invalidateSize(); }, 200);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersLayerRef.current = null;
        heatLayerRef.current = null;
      }
    };
  }, []);

  // Update markers when data changes
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
    const catIcons = {
      medical: '🏥', food: '🍚', shelter: '🏠', water: '💧',
      rescue: '🚨', education: '📚', clothing: '👕', sanitation: '🧹', other: '📋',
    };

    mapNeeds.forEach(need => {
      const color = catColors[need.category] || '#6B7280';
      const radius = 6 + (need.urgency * 2);

      const marker = L.circleMarker([need.latitude, need.longitude], {
        radius,
        fillColor: color,
        color: color,
        weight: 2,
        opacity: 0.9,
        fillOpacity: 0.6,
      });

      marker.bindPopup(`
        <div style="font-family: Inter, sans-serif; min-width: 220px;">
          <h4 style="margin: 0 0 4px; font-size: 14px;">${catIcons[need.category] || '📋'} ${need.title}</h4>
          <p style="margin: 0; color: #666; font-size: 12px;">
            Category: <strong>${need.category}</strong><br/>
            Urgency: <strong>${'🔴'.repeat(need.urgency)}${'⚪'.repeat(5 - need.urgency)}</strong> (${need.urgency}/5)<br/>
            People: <strong>${need.people_affected}</strong><br/>
            Status: <strong>${need.status}</strong>
          </p>
        </div>
      `);

      markersLayer.addLayer(marker);

      if (need.urgency >= 4) {
        const pulse = L.circleMarker([need.latitude, need.longitude], {
          radius: radius + 8, fillColor: color, color: color,
          weight: 1, opacity: 0.3, fillOpacity: 0.1,
        });
        markersLayer.addLayer(pulse);
      }
    });

    if (mapNeeds.length > 0) {
      const bounds = L.latLngBounds(mapNeeds.map(n => [n.latitude, n.longitude]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [mapNeeds]);

  // Toggle heatmap layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove existing heatmap
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    if (showHeatmap && heatmapData.length > 0) {
      const heatPoints = heatmapData.map(p => [
        p.latitude, p.longitude, p.intensity || 50
      ]);

      heatLayerRef.current = L.heatLayer(heatPoints, {
        radius: 35,
        blur: 25,
        maxZoom: 17,
        max: 100,
        gradient: {
          0.2: '#2563EB',
          0.4: '#06B6D4',
          0.6: '#10B981',
          0.8: '#F97316',
          1.0: '#EF4444',
        },
      }).addTo(map);
    }
  }, [showHeatmap, heatmapData]);

  const categories = ['medical', 'food', 'shelter', 'water', 'rescue', 'education', 'clothing', 'sanitation'];
  const catIcons = { medical: '🏥', food: '🍚', shelter: '🏠', water: '💧', rescue: '🚨', education: '📚', clothing: '👕', sanitation: '🧹' };

  return (
    <>
      <div className="page-header">
        <div>
          <h2>🗺️ Live Crisis Map</h2>
          <div className="subtitle">
            {loading ? 'Loading...' : `${mapNeeds.length} active needs on map`}
            <span style={{ marginLeft: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>🟢 Auto-refresh 30s</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className={`btn btn-sm ${showHeatmap ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setShowHeatmap(!showHeatmap)}
          >
            🔥 {showHeatmap ? 'Hide' : 'Show'} Heatmap
          </button>
          <button className="btn btn-primary" onClick={loadMapData}>↻ Refresh</button>
        </div>
      </div>

      <div className="page-body">
        {/* Filter buttons */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <button
            className={`btn btn-sm ${!filter ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilter('')}
          >
            All
          </button>
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

        {/* Map */}
        <div
          className="map-container"
          style={{
            height: '600px',
            borderRadius: '12px',
            overflow: 'hidden',
            border: '1px solid var(--border-color)',
          }}
        >
          <div ref={mapRef} style={{ height: '100%', width: '100%' }}></div>
        </div>

        {/* Legend */}
        <div style={{
          display: 'flex', gap: '16px', marginTop: '12px',
          flexWrap: 'wrap', fontSize: '12px', color: 'var(--text-secondary)',
        }}>
          {Object.entries({
            medical: '#EF4444', food: '#F97316', shelter: '#3B82F6',
            water: '#06B6D4', rescue: '#A855F7', education: '#10B981',
            clothing: '#EAB308', sanitation: '#14B8A6',
          }).map(([cat, color]) => (
            <span key={cat} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{
                width: 10, height: 10, borderRadius: '50%',
                background: color, display: 'inline-block',
              }}></span>
              {cat}
            </span>
          ))}
          <span style={{ marginLeft: '16px' }}>○ Large circle = High urgency</span>
          {showHeatmap && (
            <span style={{ marginLeft: '8px' }}>
              🔥 Heatmap: <span style={{ color: '#2563EB' }}>Low</span> → <span style={{ color: '#F97316' }}>Med</span> → <span style={{ color: '#EF4444' }}>High</span> density
            </span>
          )}
        </div>
      </div>
    </>
  );
}
