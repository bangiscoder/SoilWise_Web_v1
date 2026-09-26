import React, { useState } from 'react';
import { X, Handshake, CheckCircle2, Building, Mail, Phone, User, Globe } from 'lucide-react';

interface PartnershipModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PARTNER_CATEGORIES = [
  'Certified Agronomist / Consultant',
  'Agricultural Research Institution',
  'Certified Seed Producer / Company',
  'Agricultural Extension Service / Agency',
  'NGO / Farmer Development Program',
  'Agri-Tech / Input Provider',
  'Farmer Cooperative Leader',
];

export const PartnershipModal: React.FC<PartnershipModalProps> = ({ isOpen, onClose }) => {
  const [partnerType, setPartnerType] = useState(PARTNER_CATEGORIES[0]);
  const [organization, setOrganization] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !email.trim()) return;
    setIsSubmitted(true);
  };

  const handleReset = () => {
    setIsSubmitted(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full my-8 shadow-2xl border border-stone-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#1b4332] text-white flex items-center justify-center">
              <Handshake className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-stone-900">
                Partner With SoilWise AI
              </h3>
              <p className="text-xs text-stone-500">
                Building the verified agricultural recommendation network
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

        {isSubmitted ? (
          <div className="p-6 sm:p-8 text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-8 h-8 text-emerald-700" />
            </div>

            <div className="space-y-1">
              <h4 className="text-lg font-bold text-stone-900">
                Partnership Interest Recorded
              </h4>
              <p className="text-xs text-stone-600 max-w-sm mx-auto leading-relaxed">
                Thank you for reaching out to help build localized, expert-validated recommendations. Our partnership team will contact you as the SoilWise AI partner network expands.
              </p>
            </div>

            <div className="p-4 bg-stone-50 rounded-xl text-left text-xs text-stone-600 border border-stone-200 space-y-1">
              <p><strong className="text-stone-800">Category:</strong> {partnerType}</p>
              {organization && <p><strong className="text-stone-800">Organization:</strong> {organization}</p>}
              <p><strong className="text-stone-800">Lead Contact:</strong> {contactName} ({email})</p>
            </div>

            <button
              onClick={handleReset}
              className="w-full py-3 bg-[#1b4332] text-white text-xs font-semibold rounded-xl hover:bg-[#143225] transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Your Organization Category *
              </label>
              <select
                value={partnerType}
                onChange={(e) => setPartnerType(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl text-stone-900 focus:ring-2 focus:ring-[#1b4332]"
              >
                {PARTNER_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Organization / Company / Institution Name
              </label>
              <input
                type="text"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder="e.g. National Agricultural Research Institute / Premier Seeds"
                className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl text-stone-900 focus:ring-2 focus:ring-[#1b4332]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Contact Person Name *
              </label>
              <input
                type="text"
                required
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="e.g. Dr. Amina Bello"
                className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl text-stone-900 focus:ring-2 focus:ring-[#1b4332]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. amina@institution.org"
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl text-stone-900 focus:ring-2 focus:ring-[#1b4332]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +234 800 000 0000"
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl text-stone-900 focus:ring-2 focus:ring-[#1b4332]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                How would you like to collaborate?
              </label>
              <textarea
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us about your seed varieties, research data, agronomy expertise or farmer outreach network..."
                className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl text-stone-900 focus:ring-2 focus:ring-[#1b4332]"
              />
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
                Submit Partnership Interest
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
