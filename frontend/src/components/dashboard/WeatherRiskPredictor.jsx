import React, { useState, useEffect } from 'react';
import { Thermometer, Wind, Droplets, RefreshCw, MapPin } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { Badge } from '../ui/Badge';

const PH_REGIONS = [
  { id: 'costales', name: 'Costales Nature Farms (Majayjay, Laguna)', lat: 14.1436, lon: 121.5137 },
  { id: 'luzon', name: 'Luzon (Regional)', lat: 15.4827, lon: 120.9699 },
  { id: 'visayas', name: 'Visayas (Regional)', lat: 10.7202, lon: 122.5621 },
  { id: 'mindanao', name: 'Mindanao (Regional)', lat: 7.1907, lon: 125.4553 }
];

export const WeatherRiskPredictor = () => {
  const { lang } = useLanguage();
  const [selectedRegion, setSelectedRegion] = useState(PH_REGIONS[0]);
  const [weatherData, setWeatherData] = useState(null);
  const [isFallback, setIsFallback] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchLiveWeather = async (region) => {
    setLoading(true);
    setIsFallback(false);
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${region.lat}&longitude=${region.lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const cur = data.current || {};
      setWeatherData({
        temperature: cur.temperature_2m ?? 28.0,
        humidity: cur.relative_humidity_2m ?? 78,
        windspeed: cur.wind_speed_10m ?? 12.0,
        weathercode: cur.weather_code ?? 2,
      });
    } catch (err) {
      console.error("Error fetching live PH weather:", err);
      setIsFallback(true);
      setWeatherData({ temperature: 28.5, humidity: 80, windspeed: 14.0, weathercode: 2 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveWeather(selectedRegion);
  }, [selectedRegion]);

  const calculatePestRisk = (currentWeather, regionName) => {
    if (!currentWeather) return { threat: 'Analyzing PH Weather...', riskLevel: 50, severity: 'Moderate', advisory: '' };

    const temp = currentWeather.temperature ?? 28;
    const humidity = currentWeather.humidity ?? 75;
    const code = currentWeather.weathercode ?? 0;

    // Rainy or very high humidity (>85%): high fungal/bacterial blight risk for leafy greens
    if (code >= 51 || humidity >= 85) {
      const risk = Math.min(92, Math.round(50 + humidity * 0.45));
      return {
        conditionLabel: lang === 'tl' ? 'Maulan / Mataas na Halumigmig' : 'Wet / High Humidity',
        threat: lang === 'tl' ? 'Downy Mildew at Bacterial Soft Rot (Litsugas at Petsay)' : 'Downy Mildew & Bacterial Soft Rot (Lettuce & Bok Choy)',
        riskLevel: risk,
        severity: 'Critical',
        advisory: lang === 'tl'
          ? `Mataas ang halumigmig (${humidity}%) sa ${regionName}. Ang basang dahon ay mabilis kapitan ng Downy Mildew at Soft Rot sa litsugas at petsay. Iwasan ang overhead watering at maglagay ng Trichoderma bio-fungicide.`
          : `Wet or high-humidity conditions (${humidity}% RH) in ${regionName} strongly favor Downy Mildew and Bacterial Soft Rot on Lettuce, Bok Choy, and Mustard Greens. Switch to morning drip irrigation and apply preventative bio-fungicide.`
      };
    }
    // Warm / Sunny (>= 30°C): fast insect reproduction for crucifer/leafy pests
    if (temp >= 30) {
      const risk = Math.min(86, Math.round(temp * 2.5));
      return {
        conditionLabel: lang === 'tl' ? 'Mainit / Maaraw' : 'Hot & Dry',
        threat: lang === 'tl' ? 'Diamondback Moth at Striped Flea Beetle (Petsay at Mustasa)' : 'Diamondback Moth & Striped Flea Beetle (Brassicas)',
        riskLevel: risk,
        severity: 'High',
        advisory: lang === 'tl'
          ? `Mataas ang temperatura (${temp}°C) sa ${regionName}. Mabilis dumami ang Diamondback Moth at Flea Beetle sa petsay at mustasa. Mag-install ng 32-mesh net at mag-spray ng Bacillus thuringiensis (Bt) sa dapithapon.`
          : `Warm temperatures (${temp}°C) in ${regionName} accelerate Diamondback Moth and Striped Flea Beetle cycles in Bok Choy and Mustard Greens. Check undersides of leaves and apply Bt kurstaki or neem oil at dusk.`
      };
    }
    // Mild / Overcast
    return {
      conditionLabel: lang === 'tl' ? 'Katamtaman / Makulimlim' : 'Mild & Overcast',
      threat: lang === 'tl' ? 'Green Peach Aphid at Serpentine Leafminer' : 'Green Peach Aphid & Serpentine Leafminer',
      riskLevel: Math.min(74, Math.round(35 + humidity * 0.45)),
      severity: 'Moderate',
      advisory: lang === 'tl'
        ? `Katamtamang klima (${temp}°C, ${humidity}% RH) sa ${regionName}. Bantayan ang ilalim ng dahon ng litsugas at mustasa para sa aphids at leafminers. Gumamit ng yellow sticky traps at insecticidal soap.`
        : `Moderate conditions (${temp}°C, ${humidity}% RH) in ${regionName} support Green Peach Aphid and Leafminer activity on leafy greens. Maintain yellow sticky traps and inspect new shoots twice weekly.`
    };
  };

  const riskModel = calculatePestRisk(weatherData, selectedRegion.name);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-sm space-y-3 transition-colors">

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5 gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
            {lang === 'tl' ? 'Tunay na Panahon sa Pilipinas & Pagsusuri ng Banta' : 'Live Philippine Weather Pest Risk Forecast'}
          </h3>
        </div>


        {/* Region Selector */}
        <div className="flex items-center gap-2">
          <select
            value={selectedRegion.id}
            onChange={(e) => {
              const r = PH_REGIONS.find(reg => reg.id === e.target.value);
              if (r) setSelectedRegion(r);
            }}
            className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-[11px] font-semibold rounded px-2 py-1 focus:outline-none"
          >
            {PH_REGIONS.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>

          <button
            onClick={() => fetchLiveWeather(selectedRegion)}
            className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            title="Refresh Live Weather"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Real-time Weather Banner */}
      <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-3 font-mono">
            <span className="flex items-center gap-1 font-bold text-slate-800 dark:text-slate-200">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              {selectedRegion.name}
            </span>
            {weatherData && (
              <>
                <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                  <Thermometer className="w-3.5 h-3.5 text-red-500" />
                  <strong>{weatherData.temperature}°C</strong>
                </span>
                <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                  <Droplets className="w-3.5 h-3.5 text-blue-500" />
                  {weatherData.humidity}% RH
                </span>
                <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                  <Wind className="w-3.5 h-3.5 text-sky-500" />
                  {weatherData.windspeed} km/h
                </span>
                {isFallback && (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                    ({lang === 'tl' ? 'Offline Estimate' : 'Offline Estimate'})
                  </span>
                )}
              </>
            )}
          </div>

          <Badge variant={riskModel.severity === 'Critical' ? 'critical' : riskModel.severity === 'High' ? 'danger' : 'warning'} className="text-[10px]">
            {lang === 'tl' ? `Banta: ${riskModel.riskLevel}% (${riskModel.conditionLabel})` : `Risk Index: ${riskModel.riskLevel}% (${riskModel.conditionLabel})`}
          </Badge>
        </div>

        {/* Threat Name */}
        <div className="text-xs font-bold text-slate-900 dark:text-slate-100 pt-1">
          {lang === 'tl' ? 'Pangunahing Pesteng Babantayan' : 'Primary Target Pest'}: <span className="text-emerald-700 dark:text-emerald-400">{riskModel.threat}</span>
        </div>

        {/* Risk Meter Bar */}
        <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${riskModel.riskLevel > 80 ? 'bg-red-600' : riskModel.riskLevel > 60 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
            style={{ width: `${riskModel.riskLevel}%` }}
          />
        </div>

        {/* Advisory */}
        <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
          <strong>{lang === 'tl' ? 'Payo ng Department of Agriculture' : 'Agricultural Extension Advisory'}:</strong> {riskModel.advisory}
        </p>
      </div>

    </div>
  );
};
