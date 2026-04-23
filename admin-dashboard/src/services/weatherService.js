/**
 * weatherService.js
 * OpenWeatherMap integration — tile layers + weather alerts + disaster detection
 * Free tier: 60 calls/min, 1M calls/month
 */

const OWM_TILE_BASE = 'https://tile.openweathermap.org/map';

export function getOWMTileUrl(layer, apiKey) {
  return `${OWM_TILE_BASE}/${layer}/{z}/{x}/{y}.png?appid=${apiKey}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// DISASTER CLASSIFICATION ENGINE
// Maps OWM weather data → structured disaster alerts
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Disaster definitions — each has:
 *   id, name, icon, color, severity (1-5),
 *   description, action (what volunteers/admin should do)
 */
export const DISASTER_TYPES = {
  CYCLONE:     { id: 'CYCLONE',     name: 'Cyclone / Hurricane',   icon: '🌀', color: '#A855F7', severity: 5 },
  FLOOD:       { id: 'FLOOD',       name: 'Flash Flood',            icon: '🌊', color: '#3B82F6', severity: 5 },
  TSUNAMI:     { id: 'TSUNAMI',     name: 'Tsunami Warning',        icon: '🌊', color: '#1D4ED8', severity: 5, desc: 'Coastal storm surge detected — move inland' },
  TORNADO:     { id: 'TORNADO',     name: 'Tornado / Waterspout',   icon: '🌪️', color: '#8B5CF6', severity: 5 },
  EXTREME_HEAT:{ id: 'EXTREME_HEAT',name: 'Extreme Heat Wave',      icon: '🔥', color: '#EF4444', severity: 4 },
  DROUGHT:     { id: 'DROUGHT',     name: 'Drought Risk',           icon: '☀️', color: '#F97316', severity: 3 },
  DUST_STORM:  { id: 'DUST_STORM',  name: 'Dust / Sand Storm',      icon: '🌫️', color: '#B45309', severity: 4 },
  THUNDERSTORM:{ id: 'THUNDERSTORM',name: 'Severe Thunderstorm',    icon: '⛈️', color: '#F59E0B', severity: 4 },
  HEAVY_RAIN:  { id: 'HEAVY_RAIN',  name: 'Heavy Rainfall Alert',   icon: '🌧️', color: '#06B6D4', severity: 3 },
  DENSE_FOG:   { id: 'DENSE_FOG',   name: 'Dense Fog Advisory',     icon: '🌁', color: '#64748B', severity: 2 },
  SNOWSTORM:   { id: 'SNOWSTORM',   name: 'Snowstorm / Blizzard',   icon: '🌨️', color: '#93C5FD', severity: 4 },
};

/**
 * Recommended volunteer/admin actions for each disaster type
 */
const DISASTER_ACTIONS = {
  CYCLONE:      'Evacuate coastal zones immediately. Pre-position rescue teams inland.',
  FLOOD:        'Avoid low-lying areas. Deploy boat rescue teams. Open flood shelters.',
  TSUNAMI:      'Issue coastal evacuation NOW. Move to higher ground (>30m elevation).',
  TORNADO:      'Seek sturdy shelter immediately. Avoid open fields and vehicles.',
  EXTREME_HEAT: 'Open cooling centers. Distribute water. Check on elderly populations.',
  DROUGHT:      'Activate water rationing protocols. Identify alternative water sources.',
  DUST_STORM:   'Stay indoors. Distribute masks. Disable air intake systems.',
  THUNDERSTORM: 'Avoid tall trees and open areas. Secure loose infrastructure.',
  HEAVY_RAIN:   'Monitor waterway levels. Pre-stage rescue equipment in flood-prone zones.',
  DENSE_FOG:    'Reduce road operations. Use caution during transport of supplies.',
  SNOWSTORM:    'Pre-warm shelters. Ensure supply stockpiles. Check on isolated communities.',
};

/**
 * Given raw OWM weather API response, returns an array of active DisasterAlert objects.
 * Each alert: { ...DISASTER_TYPE, action, alertLevel, temp, wind_kmh, rain1h, humidity, desc, icon, timestamp }
 */
export function detectDisasters(weatherData) {
  if (!weatherData) return [];

  const code     = weatherData.weather?.[0]?.id    || 800;
  const desc     = weatherData.weather?.[0]?.description || '';
  const icon     = weatherData.weather?.[0]?.icon  || '01d';
  const temp     = weatherData.main?.temp          || 0;
  const humidity = weatherData.main?.humidity      || 0;
  const wind     = weatherData.wind?.speed         || 0;   // m/s
  const rain1h   = weatherData.rain?.['1h']        || 0;   // mm/h
  const snow1h   = weatherData.snow?.['1h']        || 0;
  const pressure = weatherData.main?.pressure      || 1013;

  const active = [];
  const now = new Date().toISOString();

  const add = (type, extra = {}) => {
    active.push({
      ...DISASTER_TYPES[type],
      action: DISASTER_ACTIONS[type],
      description: extra.description || desc,
      icon,
      timestamp: now,
      wind_kmh: Math.round(wind * 3.6),
      rain1h,
      temp: Math.round(temp),
      humidity,
      pressure,
      alertLevel: DISASTER_TYPES[type].severity >= 5 ? 'critical' :
                  DISASTER_TYPES[type].severity >= 4 ? 'high' :
                  DISASTER_TYPES[type].severity >= 3 ? 'medium' : 'low',
      ...extra,
    });
  };

  // ── Tornado / Waterspout (OWM code 781) ──────────────────────────────────
  if (code === 781) add('TORNADO');

  // ── Cyclone / Hurricane — extreme wind ≥ 33 m/s (Beaufort 12) ────────────
  if (wind >= 33) add('CYCLONE', { description: `Hurricane-force winds at ${Math.round(wind * 3.6)} km/h` });
  else if (wind >= 24.5) add('CYCLONE', { description: `Storm-force winds at ${Math.round(wind * 3.6)} km/h`, severity: 4 });

  // ── Flash Flood — violent rain (≥7.5mm/h) or flood codes ─────────────────
  if (rain1h >= 7.5 || code === 522 || code === 531 || code === 504)
    add('FLOOD', { description: `${rain1h}mm/h rainfall — flash flood risk` });

  // ── Tsunami Warning — extreme coastal storm surge proxy ──────────────────
  // (OWM doesn't have a dedicated tsunami code; we flag when pressure drops
  //  sharply + violent rain + high wind — a severe coastal storm scenario)
  if (pressure < 960 && wind >= 20 && rain1h >= 5)
    add('TSUNAMI', { description: 'Severe coastal storm conditions — tsunami watch issued' });

  // ── Severe Thunderstorms (200–232) ────────────────────────────────────────
  if (code >= 200 && code <= 232) {
    const violent = code >= 210 && code <= 221;
    add('THUNDERSTORM', {
      description: violent ? 'Violent thunderstorm with lightning' : desc,
      severity: violent ? 5 : 4,
    });
  }

  // ── Heavy Rainfall (light-moderate rain not already caught as flood) ──────
  if (rain1h >= 2.5 && rain1h < 7.5 && code >= 500 && code <= 521)
    add('HEAVY_RAIN', { description: `Moderate rainfall at ${rain1h}mm/h` });

  // ── Dust / Sand Storm (761, 762) ──────────────────────────────────────────
  if (code === 761 || code === 762)
    add('DUST_STORM', { description: 'Visibility severely reduced by dust/sand' });

  // ── Extreme Heat Wave ─────────────────────────────────────────────────────
  if (temp >= 45) add('EXTREME_HEAT', { description: `Temperature ${Math.round(temp)}°C — life-threatening heat` });
  else if (temp >= 42) add('EXTREME_HEAT', { description: `Temperature ${Math.round(temp)}°C — extreme heat advisory`, severity: 3 });

  // ── Drought — high temp + very low humidity + no rain ────────────────────
  if (temp >= 38 && humidity <= 20 && rain1h === 0 && code >= 800)
    add('DROUGHT', { description: `${Math.round(temp)}°C with ${humidity}% humidity — drought conditions` });

  // ── Snowstorm / Blizzard ──────────────────────────────────────────────────
  if (snow1h >= 5 || code === 622 || code === 612)
    add('SNOWSTORM', { description: snow1h > 0 ? `Heavy snowfall: ${snow1h}mm/h` : desc });

  // ── Dense Fog ─────────────────────────────────────────────────────────────
  if (code === 741 || (code >= 751 && code <= 771))
    add('DENSE_FOG', { description: 'Dense fog — visibility < 200m' });

  // Sort by severity (highest first)
  return active.sort((a, b) => b.severity - a.severity);
}

/**
 * Fetch current weather + run disaster detection.
 * Returns { weather, disasters, alertLevel, alertColor, alertLabel, icon, ... }
 */
export async function fetchWeatherWithAlerts(lat, lng, apiKey) {
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`
    );
    if (!res.ok) throw new Error(`OWM ${res.status}`);
    const data = await res.json();

    const disasters = detectDisasters(data);
    const rain1h    = data.rain?.['1h'] || 0;
    const wind      = data.wind?.speed  || 0;
    const code      = data.weather?.[0]?.id || 800;

    // General alert level (for non-disaster weather)
    let alertLevel = 'none';
    if (disasters.some(d => d.severity >= 5))    alertLevel = 'red';
    else if (disasters.some(d => d.severity >= 4)) alertLevel = 'orange';
    else if (disasters.some(d => d.severity >= 3)) alertLevel = 'yellow';
    else if (rain1h >= 2.5 || wind >= 17)          alertLevel = 'orange';
    else if (rain1h > 0 || wind >= 10)             alertLevel = 'yellow';

    const alertMap = {
      red:    { color: '#EF4444', label: '🔴 RED ALERT — Extreme Conditions', bg: 'rgba(239,68,68,0.15)' },
      orange: { color: '#F97316', label: '🟠 ORANGE ALERT — Severe Weather',  bg: 'rgba(249,115,22,0.12)' },
      yellow: { color: '#F59E0B', label: '🟡 YELLOW ALERT — Adverse Weather', bg: 'rgba(245,158,11,0.10)' },
      none:   { color: '#10B981', label: '🟢 All Clear — No Alerts',           bg: 'rgba(16,185,129,0.08)' },
    };

    return {
      temp:       Math.round(data.main?.temp       || 0),
      feels_like: Math.round(data.main?.feels_like || 0),
      humidity:   data.main?.humidity  || 0,
      pressure:   data.main?.pressure  || 1013,
      wind_speed: Math.round(wind * 3.6),
      rain1h,
      description: data.weather?.[0]?.description || '',
      icon:        data.weather?.[0]?.icon || '01d',
      cityName:    data.name || '',
      alertLevel,
      disasters,
      ...alertMap[alertLevel],
    };
  } catch (err) {
    console.error('Weather fetch failed:', err);
    return null;
  }
}

/**
 * Demo weather snapshot — used when no API key is configured.
 * Simulates a cyclone + flood scenario for UI development.
 */
export function getDemoWeatherAlert() {
  return {
    temp: 38, feels_like: 43, humidity: 88, pressure: 972,
    wind_speed: 94, rain1h: 8.2, description: 'violent storm',
    icon: '11d', cityName: 'India', alertLevel: 'red',
    color: '#EF4444', label: '🔴 RED ALERT — Extreme Conditions',
    bg: 'rgba(239,68,68,0.15)',
    disasters: [
      {
        ...DISASTER_TYPES.CYCLONE, alertLevel: 'critical', severity: 5,
        action: DISASTER_ACTIONS.CYCLONE,
        description: 'Hurricane-force winds at 94 km/h',
        wind_kmh: 94, rain1h: 8.2, temp: 38, humidity: 88, pressure: 972,
        icon: '11d', timestamp: new Date().toISOString(),
      },
      {
        ...DISASTER_TYPES.FLOOD, alertLevel: 'critical', severity: 5,
        action: DISASTER_ACTIONS.FLOOD,
        description: '8.2mm/h rainfall — flash flood risk',
        wind_kmh: 94, rain1h: 8.2, temp: 38, humidity: 88, pressure: 972,
        icon: '11d', timestamp: new Date().toISOString(),
      },
      {
        ...DISASTER_TYPES.THUNDERSTORM, alertLevel: 'high', severity: 4,
        action: DISASTER_ACTIONS.THUNDERSTORM,
        description: 'Violent thunderstorm with lightning',
        wind_kmh: 94, rain1h: 8.2, temp: 38, humidity: 88, pressure: 972,
        icon: '11d', timestamp: new Date().toISOString(),
      },
    ],
  };
}

/** Weather layer tile definitions */
export const WEATHER_LAYERS = [
  { id: 'precipitation_new', name: 'Rain / Precipitation', emoji: '🌧️', desc: 'Rainfall intensity overlay' },
  { id: 'clouds_new',        name: 'Cloud Cover',          emoji: '☁️', desc: 'Cloud density overlay' },
  { id: 'wind_new',          name: 'Wind Speed',           emoji: '💨', desc: 'Wind speed overlay' },
  { id: 'temp_new',          name: 'Temperature',          emoji: '🌡️', desc: 'Surface temperature overlay' },
  { id: 'pressure_new',      name: 'Pressure',             emoji: '🔵', desc: 'Atmospheric pressure overlay' },
];

export const INDIA_CENTER = { lat: 20.5937, lng: 78.9629 };

/** @deprecated — kept for backward compat, use fetchWeatherWithAlerts instead */
export const fetchWeatherAlert = fetchWeatherWithAlerts;
