/**
 * SoilWise AI - Real-Time Agricultural Weather & Extreme Climate Alert Service
 * 
 * Analyzes high-resolution Open-Meteo forecasts, local coordinates, and NiMet agroecological
 * climate zones to generate automated notifications for potential extreme weather events:
 * - Flash Floods & Torrential Deluges
 * - Severe Heatwaves & Thermal Stress
 * - Squall Lines & Destructive Windstorms
 * - Prolonged Agricultural Dry Spells / Drought
 * - Harmattan Aridity & Dust Incursions
 * - Safe / Optimal Operational Windows
 */

import { SevenDayForecastResult, DailyForecastDay } from './openMeteoWeatherService';
import { FarmLocation } from '../types/soilwise';

export type AlertSeverity = 'critical' | 'warning' | 'advisory' | 'optimal';

export type ExtremeEventType = 
  | 'flash_flood'
  | 'heatwave'
  | 'windstorm'
  | 'dry_spell'
  | 'harmattan_aridity'
  | 'favorable_conditions';

export interface WeatherAlert {
  id: string;
  type: ExtremeEventType;
  severity: AlertSeverity;
  title: string;
  shortSummary: string;
  detailedNotice: string;
  timeline: string;
  affectedDays: string[];
  metrics: {
    label: string;
    value: string;
    threshold: string;
  }[];
  mitigationSteps: string[];
  recommendedActions: string[];
  locationContext: string;
  timestamp: string;
}

/**
 * Evaluates real-time weather forecast against calibrated agroclimatic thresholds
 */
export function evaluateWeatherAlerts(
  forecast: SevenDayForecastResult | null,
  location: FarmLocation,
  simulatedScenario?: 'flood' | 'heatwave' | 'wind' | 'drought' | null
): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];
  const now = new Date();
  const locationLabel = `${location.lga ? `${location.lga}, ` : ''}${location.state ? `${location.state} State` : 'Nigeria'} (${location.latitude.toFixed(2)}°N, ${location.longitude.toFixed(2)}°E)`;

  // Support manual testing / demonstration scenario if requested by user
  if (simulatedScenario === 'flood') {
    return [
      {
        id: 'sim-flood-01',
        type: 'flash_flood',
        severity: 'critical',
        title: 'Torrential Rainfall & Flash Flood Deluge Alert',
        shortSummary: 'Severe convective storms with intense rainfall accumulation (>62mm) predicted within the next 24-36 hours.',
        detailedNotice: 'A high-intensity tropical convective storm system is forecasted across this farm location. Saturated soil conditions pose severe risks of topsoil erosion, nitrogen/potassium leaching, and root asphyxiation.',
        timeline: 'Next 24 to 36 Hours (High Confidence)',
        affectedDays: ['Tomorrow', 'Day 2'],
        metrics: [
          { label: 'Forecast Precipitation', value: '64.5 mm', threshold: 'Critical > 45 mm' },
          { label: 'Rain Probability', value: '95%', threshold: 'High > 75%' },
          { label: 'Surface Runoff Risk', value: 'Extreme', threshold: 'Topsoil Washout' }
        ],
        mitigationSteps: [
          'Dig or clear emergency contour trenches and drainage ditches to divert standing water away from crop beds.',
          'Postpone all chemical fertilizer or manure broadcasts immediately to avoid total nutrient runoff wash.',
          'Harvest any mature produce (leafy greens, tomatoes, pepper, maize) today before field accessibility is compromised.',
          'Elevate stored harvest bags and chemical inputs in storage sheds at least 30cm off ground level.'
        ],
        recommendedActions: [
          'Avoid heavy machinery on wet fields to prevent deep soil compaction.',
          'Inspect field perimeter bunds and check for gully formation.'
        ],
        locationContext: locationLabel,
        timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
  }

  if (simulatedScenario === 'heatwave') {
    return [
      {
        id: 'sim-heat-01',
        type: 'heatwave',
        severity: 'critical',
        title: 'Extreme Heatwave & Thermal Crop Stress Warning',
        shortSummary: 'Sustained daytime temperatures exceeding 41.5°C with severe atmospheric evapotranspiration (ET0 > 7.2mm/day).',
        detailedNotice: 'Severe heatwave conditions can induce pollen desiccation, blossom abortion in flowering crops (maize tasseling, legumes), and rapid moisture depletion from the root zone.',
        timeline: 'Next 48 to 72 Hours',
        affectedDays: ['Today', 'Tomorrow', 'Day 3'],
        metrics: [
          { label: 'Max Temperature', value: '41.8°C', threshold: 'Critical > 38°C' },
          { label: 'Reference ET0', value: '7.4 mm/day', threshold: 'Severe > 5.5 mm' },
          { label: 'Pollen Viability Risk', value: 'Severe', threshold: 'Blossom Drop' }
        ],
        mitigationSteps: [
          'Apply 5-8cm of organic crop residue or dry grass mulch to preserve vital root-zone moisture.',
          'Schedule irrigation strictly during early morning (05:30 - 08:00) or late dusk to reduce evaporative losses.',
          'Provide temporary nursery shade netting for delicate seedlings and transplanted horticultural crops.',
          'Refrain from foliar spraying or herbicidal treatment during peak sunlight hours (11:00 - 16:00).'
        ],
        recommendedActions: [
          'Ensure livestock and farm labor have ample shaded hydration stations.',
          'Check soil moisture at 15cm depth every morning.'
        ],
        locationContext: locationLabel,
        timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
  }

  if (!forecast || !forecast.days || forecast.days.length === 0) {
    return alerts;
  }

  const days = forecast.days;
  const current = forecast.current;

  // 1. FLASH FLOOD & HEAVY DELUGE EVALUATION
  // Check daily precipitation > 40mm or 3-day sum > 75mm
  const highRainDays = days.filter(d => d.precipitationMm >= 35);
  const maxRainDay = days.reduce((prev, curr) => curr.precipitationMm > prev.precipitationMm ? curr : prev, days[0]);
  const threeDayAccumulation = days.slice(0, 3).reduce((acc, d) => acc + d.precipitationMm, 0);

  if (maxRainDay.precipitationMm >= 50 || threeDayAccumulation >= 75) {
    alerts.push({
      id: `alert-flood-${maxRainDay.date}`,
      type: 'flash_flood',
      severity: 'critical',
      title: 'Severe Rainfall & Flash Flood Risk Alert',
      shortSummary: `Intense precipitation forecast with up to ${maxRainDay.precipitationMm.toFixed(1)} mm on ${maxRainDay.dayName}. Accumulated 3-day rainfall reaches ${threeDayAccumulation.toFixed(1)} mm.`,
      detailedNotice: `Heavy convective rainfall is predicted for ${locationLabel}. High runoff risk can cause topsoil loss, root waterlogging, and fertilizer leaching.`,
      timeline: `Impacting ${maxRainDay.dayName} (${maxRainDay.date})`,
      affectedDays: highRainDays.map(d => `${d.dayName} (${d.precipitationMm.toFixed(0)}mm)`),
      metrics: [
        { label: 'Peak 24h Rainfall', value: `${maxRainDay.precipitationMm.toFixed(1)} mm`, threshold: 'Danger > 50 mm' },
        { label: '3-Day Total Rain', value: `${threeDayAccumulation.toFixed(1)} mm`, threshold: 'Saturated > 75 mm' },
        { label: 'Rain Probability', value: `${maxRainDay.precipitationProbabilityPercent}%`, threshold: 'High > 70%' }
      ],
      mitigationSteps: [
        'Clear all in-field drainage paths and furrow exits to discharge flood waters.',
        'Halt fertilizer or foliar spray broadcasting until 48 hours post-deluge.',
        'Harvest ripe produce and vegetables prior to heavy downpour to avoid rot.'
      ],
      recommendedActions: [
        'Protect open seed beds with straw mulch to prevent soil crusting.',
        'Move mechanized equipment to elevated ground.'
      ],
      locationContext: locationLabel,
      timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  } else if (maxRainDay.precipitationMm >= 35 || threeDayAccumulation >= 55) {
    alerts.push({
      id: `alert-rain-moderate-${maxRainDay.date}`,
      type: 'flash_flood',
      severity: 'warning',
      title: 'Moderate to Heavy Rainfall Advisory',
      shortSummary: `Significant rain event expected: ${maxRainDay.precipitationMm.toFixed(1)} mm on ${maxRainDay.dayName}.`,
      detailedNotice: `Substantial soil moisture recharge expected. Moderate risk of surface water ponding on poorly drained clay soils.`,
      timeline: `${maxRainDay.dayName} (${maxRainDay.date})`,
      affectedDays: [maxRainDay.dayName],
      metrics: [
        { label: 'Peak Day Rainfall', value: `${maxRainDay.precipitationMm.toFixed(1)} mm`, threshold: 'Warning > 35 mm' },
        { label: 'Rain Probability', value: `${maxRainDay.precipitationProbabilityPercent}%`, threshold: 'High' }
      ],
      mitigationSteps: [
        'Check field drainage outlets to ensure water drains freely within 24 hours.',
        'Avoid pesticide spraying on ${maxRainDay.dayName} to prevent chemical wash-off.'
      ],
      recommendedActions: ['Prepare rainwater harvesting systems to store surplus water.'],
      locationContext: locationLabel,
      timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  }

  // 2. EXTREME HEATWAVE EVALUATION
  const maxTemp = Math.max(...days.map(d => d.tempMaxC), current?.temperatureC || 0);
  const hotDays = days.filter(d => d.tempMaxC >= 38);

  if (maxTemp >= 39.5) {
    const hottestDay = days.find(d => d.tempMaxC === maxTemp) || days[0];
    alerts.push({
      id: `alert-heat-critical-${hottestDay.date}`,
      type: 'heatwave',
      severity: 'critical',
      title: 'Critical Heatwave & Thermal Stress Warning',
      shortSummary: `Extreme temperature spike reaching ${maxTemp.toFixed(1)}°C with severe atmospheric moisture demand.`,
      detailedNotice: `Excessive thermal stress can cause pollen sterility in cereals (maize, sorghum, millet), rapid blossom drop, and high seedling mortality.`,
      timeline: `Peak expected on ${hottestDay.dayName} (${maxTemp.toFixed(1)}°C)`,
      affectedDays: hotDays.map(d => `${d.dayName} (${d.tempMaxC.toFixed(0)}°C)`),
      metrics: [
        { label: 'Peak Temperature', value: `${maxTemp.toFixed(1)}°C`, threshold: 'Critical > 39°C' },
        { label: 'Atmospheric ET0', value: `${hottestDay.et0EvapotranspirationMm.toFixed(1)} mm/day`, threshold: 'High > 5.5 mm' }
      ],
      mitigationSteps: [
        'Apply thick organic mulch (straw, leaves) around root zones immediately.',
        'Irrigate early morning (before 08:00) or dusk to minimize evaporative loss.',
        'Shade vulnerable nursery beds and newly transplanted crops.'
      ],
      recommendedActions: ['Ensure ample water supply for field irrigation and farm workers.'],
      locationContext: locationLabel,
      timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  } else if (maxTemp >= 37.5) {
    alerts.push({
      id: `alert-heat-warning-${days[0]?.date}`,
      type: 'heatwave',
      severity: 'warning',
      title: 'High Temperature & Evaporation Advisory',
      shortSummary: `Temperatures approaching ${maxTemp.toFixed(1)}°C over the next several days.`,
      detailedNotice: `Accelerated soil drying and moisture depletion expected. Increase watering cycles for high-value horticultural crops.`,
      timeline: 'Next 3 to 5 Days',
      affectedDays: days.filter(d => d.tempMaxC >= 36).map(d => d.dayName),
      metrics: [
        { label: 'Max Forecast Temp', value: `${maxTemp.toFixed(1)}°C`, threshold: 'Warning > 37°C' }
      ],
      mitigationSteps: [
        'Avoid spraying systemic herbicides during midday heat.',
        'Monitor soil moisture at root level and top up irrigation.'
      ],
      recommendedActions: ['Inspect crops for signs of wilting in early afternoon.'],
      locationContext: locationLabel,
      timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  }

  // 3. SQUALL LINE & SEVERE WINDSTORM EVALUATION
  const maxWind = Math.max(...days.map(d => d.windSpeedMaxKmh), current?.windSpeedKmh || 0);
  const stormyDays = days.filter(d => d.windSpeedMaxKmh >= 40 || [95, 96, 99].includes(d.weatherCode));

  if (maxWind >= 45 || stormyDays.length > 0) {
    const windiestDay = days.find(d => d.windSpeedMaxKmh === maxWind) || days[0];
    alerts.push({
      id: `alert-wind-${windiestDay.date}`,
      type: 'windstorm',
      severity: maxWind >= 55 ? 'critical' : 'warning',
      title: 'Destructive Wind Gusts & Squall Line Alert',
      shortSummary: `Squall winds reaching ${maxWind.toFixed(0)} km/h forecast with convective storm activity.`,
      detailedNotice: `Strong wind gusts threaten to cause stalk lodging in tall maize and sorghum, snap cassava branches, and damage temporary shade structures.`,
      timeline: `Anticipated on ${windiestDay.dayName}`,
      affectedDays: stormyDays.map(d => `${d.dayName} (${d.windSpeedMaxKmh.toFixed(0)} km/h)`),
      metrics: [
        { label: 'Max Wind Speed', value: `${maxWind.toFixed(0)} km/h`, threshold: 'Severe > 45 km/h' },
        { label: 'Lodging Threat', value: 'High', threshold: 'Tall Cereals' }
      ],
      mitigationSteps: [
        'Stake tall indeterminate crops, fruit saplings, and vulnerable vegetables.',
        'Secure greenhouse sheets, nursery netting, and temporary storage sheds.',
        'Avoid agrochemical spraying (pesticide drift hazard).'
      ],
      recommendedActions: ['Prune excess brittle branches from windbreak trees.'],
      locationContext: locationLabel,
      timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  }

  // 4. EXTENDED DRY SPELL EVALUATION
  const totalRainNext7Days = days.reduce((sum, d) => sum + d.precipitationMm, 0);
  const dryDaysCount = days.filter(d => d.precipitationMm < 1).length;

  if (dryDaysCount >= 6 && totalRainNext7Days < 3 && maxTemp >= 34) {
    alerts.push({
      id: `alert-drought-spell-${days[0]?.date}`,
      type: 'dry_spell',
      severity: 'advisory',
      title: 'Extended Dry Spell Notice (Zero Rain in 7-Day Window)',
      shortSummary: `Total rainfall forecast over next 7 days is only ${totalRainNext7Days.toFixed(1)} mm with ${dryDaysCount} dry days.`,
      detailedNotice: `A prolonged mid-season dry spell can retard vegetative development and induce premature flowering. Irrigation and moisture preservation are critical.`,
      timeline: 'Throughout the 7-day forecast cycle',
      affectedDays: ['Full 7-Day Window'],
      metrics: [
        { label: '7-Day Total Rain', value: `${totalRainNext7Days.toFixed(1)} mm`, threshold: 'Drought < 5 mm' },
        { label: 'Consecutive Dry Days', value: `${dryDaysCount} Days`, threshold: 'Critical >= 5 Days' }
      ],
      mitigationSteps: [
        'Apply organic mulching to suppress soil evaporation.',
        'Prioritize supplemental irrigation on high-value cash crops.',
        'Weed aggressively to remove competition for scarce soil moisture.'
      ],
      recommendedActions: ['Consider drought-tolerant foliar biostimulants.'],
      locationContext: locationLabel,
      timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  }

  // 5. IF NO EXTREME CONDITIONS DETECTED: OPTIMAL ALL-CLEAR STATUS
  if (alerts.length === 0) {
    alerts.push({
      id: `alert-favorable-${days[0]?.date || 'today'}`,
      type: 'favorable_conditions',
      severity: 'optimal',
      title: 'Optimal Field Weather & Low Climate Risk',
      shortSummary: `No extreme weather anomalies detected for ${location.lga || location.state || 'your farm'}. Field operations favorable.`,
      detailedNotice: `Favorable agricultural conditions: moderate temperatures (avg ${forecast.summary.avgTempMaxC.toFixed(0)}°C), manageable rainfall (${forecast.summary.totalPrecipitationMm.toFixed(1)} mm total), and mild winds. Ideal for standard planting, weeding, and fertilizer application.`,
      timeline: 'Next 7 Days',
      affectedDays: ['Current Forecast Cycle'],
      metrics: [
        { label: 'Max Temperature', value: `${forecast.summary.avgTempMaxC.toFixed(0)}°C`, threshold: 'Normal (26-35°C)' },
        { label: 'Weekly Rain', value: `${forecast.summary.totalPrecipitationMm.toFixed(1)} mm`, threshold: 'Moderate' },
        { label: 'Field Suitability', value: 'High', threshold: 'Safe' }
      ],
      mitigationSteps: [
        'Proceed with scheduled field operations (fertilizing, spraying, planting).',
        'Maintain routine soil moisture monitoring.'
      ],
      recommendedActions: ['Ideal time for seed bed preparation and weeding.'],
      locationContext: locationLabel,
      timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  }

  return alerts;
}
