import React, { useState } from 'react';
import { X, UserCheck, CheckCircle2, Calendar, Phone, Mail, FileText, Clock, HelpCircle } from 'lucide-react';
import { FarmLocation } from '../types/soilwise';

interface AgronomistConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
  location?: FarmLocation;
}

const CONSULTATION_TYPES = [
  'Soil & Soil Health',
  'Crop Selection',
  'Improved Seed',
  'Farm Management',
  'Climate & Weather',
  'General Agricultural Advice',
];

const CONSULTATION_METHODS = [
  'Phone Call',
  'WhatsApp',
  'Online Consultation',
];

export const AgronomistConsultationModal: React.FC<AgronomistConsultationModalProps> = ({
  isOpen,
  onClose,
  location,
}) => {
  const [consultationType, setConsultationType] = useState(CONSULTATION_TYPES[0]);
  const [method, setMethod] = useState(CONSULTATION_METHODS[0]);
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('Morning (8:00 AM – 12:00 PM)');
  const [description, setDescription] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    setIsSubmitted(true);
  };

  const handleReset = () => {
    setIsSubmitted(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full my-8 shadow-2xl border border-stone-200 overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#1b4332] text-white flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-stone-900">
                Consult a Certified Agronomist
              </h3>
              <p className="text-xs text-stone-500">
                Get professional guidance based on your farm information.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-stone-200 flex items-center justify-center text-stone-500 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        {isSubmitted ? (
          <div className="p-6 sm:p-8 text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-8 h-8 text-emerald-700" />
            </div>

            <div className="space-y-1">
              <h4 className="text-lg font-bold text-stone-900">
                Consultation Request Recorded
              </h4>
              <p className="text-xs text-stone-600 max-w-sm mx-auto leading-relaxed">
                This is currently a demonstration of the planned SoilWise AI expert-consultation service. Real expert matching will be introduced as the SoilWise AI partner network develops.
              </p>
            </div>

            <div className="p-4 bg-stone-50 rounded-xl text-left text-xs text-stone-600 border border-stone-200 space-y-1">
              <p><strong className="text-stone-800">Topic:</strong> {consultationType}</p>
              <p><strong className="text-stone-800">Channel:</strong> {method}</p>
              <p><strong className="text-stone-800">Contact:</strong> {name} ({phone})</p>
              {location && (
                <p><strong className="text-stone-800">Location:</strong> {location.address?.fullAddress || `${location.latitude.toFixed(4)}°, ${location.longitude.toFixed(4)}°`}</p>
              )}
            </div>

            <button
              onClick={handleReset}
              className="w-full py-3 bg-[#1b4332] text-white text-xs font-semibold rounded-xl hover:bg-[#143225] transition-colors cursor-pointer"
            >
              Close Window
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* Consultation Type */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Consultation Type
              </label>
              <select
                value={consultationType}
                onChange={(e) => setConsultationType(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl text-stone-900 focus:ring-2 focus:ring-[#1b4332]"
              >
                {CONSULTATION_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Preferred Consultation Method */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Preferred Consultation Method
              </label>
              <div className="grid grid-cols-3 gap-2">
                {CONSULTATION_METHODS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    className={`py-2 px-2.5 text-[11px] rounded-xl font-medium border text-center transition-colors cursor-pointer ${
                      method === m
                        ? 'bg-[#1b4332] text-white border-[#1b4332]'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Preferred Date & Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Preferred Date
                </label>
                <input
                  type="date"
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl text-stone-900 focus:ring-2 focus:ring-[#1b4332]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Preferred Time Window
                </label>
                <select
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl text-stone-900 focus:ring-2 focus:ring-[#1b4332]"
                >
                  <option value="Morning (8:00 AM – 12:00 PM)">Morning (8:00 AM – 12:00 PM)</option>
                  <option value="Afternoon (12:00 PM – 4:00 PM)">Afternoon (12:00 PM – 4:00 PM)</option>
                  <option value="Evening (4:00 PM – 7:00 PM)">Evening (4:00 PM – 7:00 PM)</option>
                </select>
              </div>
            </div>

            {/* Short Description */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Short Description
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly describe what you would like help with (e.g. crop choice based on soil pH, fertilizer management, planting date)..."
                className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl text-stone-900 focus:ring-2 focus:ring-[#1b4332]"
              />
            </div>

            {/* Contact Details */}
            <div className="pt-2 border-t border-stone-200/80 space-y-3">
              <span className="block text-xs font-bold text-stone-800 uppercase tracking-wider">
                Your Contact Information
              </span>

              <div>
                <label className="block text-[11px] font-medium text-stone-700 mb-0.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ibrahim Danjuma"
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl text-stone-900 focus:ring-2 focus:ring-[#1b4332]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-stone-700 mb-0.5">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +234 803 123 4567"
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl text-stone-900 focus:ring-2 focus:ring-[#1b4332]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-stone-700 mb-0.5">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. ibrahim@example.com"
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl text-stone-900 focus:ring-2 focus:ring-[#1b4332]"
                  />
                </div>
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900">
              <strong className="font-semibold">Note: </strong>
              This is a demonstration of the planned SoilWise AI human expert booking flow. No fees are charged in this MVP.
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-medium text-stone-700 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#1b4332] hover:bg-[#143225] text-white text-xs font-bold rounded-xl transition-colors shadow-xs cursor-pointer active:scale-98"
              >
                Request Consultation
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
