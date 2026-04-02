export const Header: React.FC = () => {
  return (
    <div className="bg-white rounded-xl p-5 mb-5 shadow-md">
      {/* Header Top */}
      <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-4">
        <div>
          <div className="text-2xl font-bold text-[#4A6741]">🏥 MyDigitalClinic</div>
          <div className="text-xs text-gray-500 mt-1">
            HIPAA & DPDPA Compliant Therapy Practice Management
          </div>
        </div>

        {/* Trial Badge */}
        <div className="bg-gradient-to-b from-red-500 to-red-700 text-white px-5 py-3 rounded-lg font-bold text-center">
          <div className="text-2xl mb-1">21 Days</div>
          <div className="text-xs opacity-90">Free Trial Only</div>
          <div className="text-[10px] mt-1">Then Full Payment Required</div>
        </div>
      </div>

      {/* Compliance Banner */}
      <div className="bg-blue-50 border-l-4 border-blue-600 p-3 rounded text-sm text-blue-900">
        <div className="font-bold mb-1">🔒 Data Security & Privacy</div>
        <div className="text-xs">
          DPDPA 2023 Compliant | AES-256 Encrypted | 24-hour Auto-Purge | Therapist
          Data Ownership
        </div>
      </div>
    </div>
  );
};

export default Header;
