import React, { useState, useEffect } from 'react';
import { CloudSun, Thermometer, Wind, RefreshCw, MapPin } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { Badge } from '../ui/Badge';

const PH_REGIONS = [
  { id: 'luzon', name: 'Luzon', lat: 15.4827, lon: 120.9699 },
  { id: 'visayas', name: 'Visayas', lat: 10.7202, lon: 122.5621 },
  { id: 'mindanao', name: 'Mindanao', lat: 7.1907, lon: 125.4553 }
];

export const WeatherRiskPredictor = () => {
  const { lang } = useLanguage();
  const [selectedRegion, setSelectedRegion] = useState(PH_REGIONS[0]);
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchLiveWeather = async (region) => {
    setLoading(true);
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${region.lat}&longitude=${region.lon}&current_weather=true`;
      const res = await fetch(url);
      const data = await res.json();
      setWeatherData(data.current_weather);
    } catch (err) {
      console.error("Error fetching live PH weather:", err);
      // Fallback fallback default
      setWeatherData({ temperature: 28.5, windspeed: 14.0, weathercode: 2 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveWeather(selectedRegion);
  }, [selectedRegion]);

  const calculatePestRisk = (currentWeather) => {
    if (!currentWeather) return { threat: 'Analyzing PH Weather...', riskLevel: 50, severity: 'Moderate', advisory: '' };

    const temp = currentWeather.temperature || 28;
    const code = currentWeather.weathercode || 0;

    // Rainy (codes 51-99)
    if (code >= 51) {
      return {
        conditionLabel: lang === 'tl' ? 'Maulan / Basa' : 'Rainy / Wet',
        threat: lang === 'tl' ? 'Uod na Harabas sa Palay at Mais (Fall Armyworm)' : 'Fall Armyworm (Spodoptera frugiperda)',
        riskLevel: Math.min(88, Math.round(temp * 2.8)),
        severity: 'Critical',
        advisory: lang === 'tl'
          ? 'Umuulan sa rehiyon. Ang basang dahon ay madaling pangitlogan ng uod. Bantayan ang mga usbong ng mais at palay.'
          : 'Active rainfall detected in the region. Wet foliage promotes larval egg hatch. Inspect young whorls for armyworm activity.'
      };
    }
    // Warm / Sunny (codes 0-1 & temp > 30)
    else if (temp >= 30) {
      return {
        conditionLabel: lang === 'tl' ? 'Mainit / Maaraw' : 'Hot & Sunny',
        threat: lang === 'tl' ? 'Uod ng Repolyo at Gulay (Diamondback Moth)' : 'Diamondback Moth (Plutella xylostella)',
        riskLevel: Math.min(82, Math.round(temp * 2.5)),
        severity: 'High',
        advisory: lang === 'tl'
          ? `Mataas ang temperatura sa Rehiyon (${temp}°C). Mabilis magparami ang mga peste sa gulayan. Mag-spray ng Neem oil o biological control.`
          : `High ambient temperature in Region (${temp}°C). Accelerates pest reproduction cycles in vegetable crops. Apply biological neem spray.`
      };
    }
    // Humid / Overcast / Moderate (codes 2-48)
    else {
      return {
        conditionLabel: lang === 'tl' ? 'Makulimlim / Humid' : 'Humid & Overcast',
        threat: lang === 'tl' ? 'Mantsa sa Palay (Rice Blast)' : 'Rice Blast (Pyricularia oryzae)',
        riskLevel: 75,
        severity: 'High',
        advisory: lang === 'tl'
          ? `Makulimlim at katamtamang lamig (${temp}°C). Pumapabor sa fungal spores ng Rice Blast. Panatilihing maayos ang daloy ng tubig.`
          : `Overcast conditions and moderate temp (${temp}°C). Favorable for fungal blast spore dispersal. Maintain optimal field water management.`
      };
    }
  };

  const riskModel = calculatePestRisk(weatherData);

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
                  <Wind className="w-3.5 h-3.5 text-sky-500" />
                  {weatherData.windspeed} km/h
                </span>
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
