import React from 'react';
import { X, Code, Database, Globe, Layers, CheckCircle } from 'lucide-react';
import { FarmAnalysisResult } from '../types/soilwise';

interface ApiDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAnalysis?: FarmAnalysisResult | null;
}

export const ApiDocsModal: React.FC<ApiDocsModalProps> = ({
  isOpen,
  onClose,
  currentAnalysis,
}) => {
  if (!isOpen) return null;

  const sampleSchema = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: 'SoilWiseAI_FarmAnalysisSchema',
    version: '1.0.0',
    type: 'object',
    required: ['id', 'analysisDate', 'soilData', 'location', 'soilTexture', 'rainfallOutlook'],
    properties: {
      id: { type: 'string', description: 'Unique analysis session identifier' },
      analysisDate: { type: 'string', format: 'date', description: 'Selected analysis reference date (YYYY-MM-DD)' },
      soilData: {
        type: 'object',
        required: ['ph', 'nitrogen', 'phosphorus', 'potassium', 'ec'],
        properties: {
          ph: { type: 'number', minimum: 1.0, maximum: 14.0 },
          nitrogen: { type: 'number', minimum: 0, unit: 'mg/kg' },
          phosphorus: { type: 'number', minimum: 0, unit: 'mg/kg' },
          potassium: { type: 'number', minimum: 0, unit: 'mg/kg' },
          ec: { type: 'number', minimum: 0, unit: 'dS/m' },
        },
      },
      location: {
        type: 'object',
        required: ['latitude', 'longitude'],
        properties: {
          latitude: { type: 'number', minimum: -90, maximum: 90 },
          longitude: { type: 'number', minimum: -180, maximum: 180 },
          address: { type: 'object' },
          landmark: { type: ['object', 'null'] },
          elevationMeters: { type: ['number', 'null'] },
        },
      },
      soilTexture: {
        type: 'object',
        properties: {
          clayPercent: { type: ['number', 'null'] },
          sandPercent: { type: ['number', 'null'] },
          siltPercent: { type: ['number', 'null'] },
          texturalClass: { type: ['string', 'null'] },
          isAvailable: { type: 'boolean' },
        },
      },
      rainfallOutlook: {
        type: 'object',
        properties: {
          seasonalOutlook: { type: 'string' },
          expectedOnset: { type: ['string', 'null'] },
          expectedCessation: { type: ['string', 'null'] },
          estimatedSeasonDurationDays: { type: ['number', 'null'] },
          estimatedRemainingDaysText: { type: 'string' },
          approximatePeakPeriod: { type: 'string' },
          rainfallOnsetStatus: {
            type: 'string',
            enum: ['Early', 'Normal', 'Delayed', 'Possible false start', 'Not available'],
          },
        },
      },
    },
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[88vh] flex flex-col shadow-2xl border border-stone-200">
        {/* Modal Header */}
        <div className="p-5 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#1b4332] text-white flex items-center justify-center">
              <Code className="w-4 h-4 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">
                Data Architecture & API Schema
              </h3>
              <p className="text-xs text-stone-500">
                Modular agricultural intelligence contract for developer onboarding
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-stone-100 flex items-center justify-center text-stone-500 hover:text-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-6 text-xs text-stone-700">
          <div>
            <h4 className="font-semibold text-stone-900 text-sm mb-2 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-[#1b4332]" />
              Architectural Principle: Collect &rarr; Enrich &rarr; Structure
            </h4>
            <p className="leading-relaxed">
              SoilWise AI separates user input ingestion from environmental enrichment and decision modeling. In MVP V1, soil test results are strictly user-supplied, while environmental, elevation, texture, and rainfall attributes are enriched asynchronously from public models.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-stone-900 text-sm mb-2 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-[#1b4332]" />
              Integrated Public APIs in V1
            </h4>
            <ul className="space-y-2">
              <li className="p-2.5 bg-stone-50 rounded-lg border border-stone-200">
                <span className="font-bold text-stone-800">OpenStreetMap Nominatim:</span> Reverse geocoding of coordinates to human-readable administrative zones and local landmarks.
              </li>
              <li className="p-2.5 bg-stone-50 rounded-lg border border-stone-200">
                <span className="font-bold text-stone-800">ISRIC SoilGrids 2.0:</span> 250m gridded clay, sand, and silt soil profile fractions (0–5cm depth).
              </li>
              <li className="p-2.5 bg-stone-50 rounded-lg border border-stone-200">
                <span className="font-bold text-stone-800">Open-Meteo API:</span> High-resolution elevation queries and historical/seasonal precipitation models.
              </li>
            </ul>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-stone-900 text-sm flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#1b4332]" />
                {currentAnalysis ? 'Current Analysis Live JSON Payload' : 'Modular Data Contract JSON Schema'}
              </h4>
            </div>
            <pre className="bg-stone-900 text-stone-100 p-3.5 rounded-xl overflow-x-auto text-[11px] font-mono leading-relaxed max-h-64">
              {JSON.stringify(currentAnalysis || sampleSchema, null, 2)}
            </pre>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-stone-200 bg-stone-50 rounded-b-2xl flex items-center justify-between">
          <span className="text-[11px] text-stone-500">
            Compliant with SoilWise Android MVP V1 Data Specs
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#1b4332] text-white rounded-lg text-xs font-medium hover:bg-[#143225] transition-colors"
          >
            Close Documentation
          </button>
        </div>
      </div>
    </div>
  );
};
