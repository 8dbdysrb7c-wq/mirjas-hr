import React, { useState } from 'react';
import HRBonuses from './HRBonuses';
import HRViolations from './HRViolations';
import { Gift, AlertTriangle } from 'lucide-react';

const HRBonusesAndViolations = ({ user, refreshCounts, onFiltersChange }) => {
  const [activeSubTab, setActiveSubTab] = useState('violations');

  return (
    <div className="space-y-6">
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', direction: 'rtl' }}>
        <button
          onClick={() => setActiveSubTab('bonuses')}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 28px', 
            borderRadius: '50px', fontWeight: 'bold', fontSize: '15px', transition: 'all 0.2s', 
            background: activeSubTab === 'bonuses' ? '#157f87' : '#f1f5f9', 
            color: activeSubTab === 'bonuses' ? 'white' : '#64748b', 
            boxShadow: activeSubTab === 'bonuses' ? '0 6px 16px rgba(21, 127, 135, 0.3)' : 'none', 
            border: 'none', cursor: 'pointer' 
          }}
        >
          <Gift size={20} strokeWidth={2.5} /> تسجيل المكافآت
        </button>
        <button
          onClick={() => setActiveSubTab('violations')}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 28px', 
            borderRadius: '50px', fontWeight: 'bold', fontSize: '15px', transition: 'all 0.2s', 
            background: activeSubTab === 'violations' ? '#157f87' : '#f1f5f9', 
            color: activeSubTab === 'violations' ? 'white' : '#64748b', 
            boxShadow: activeSubTab === 'violations' ? '0 6px 16px rgba(21, 127, 135, 0.3)' : 'none', 
            border: 'none', cursor: 'pointer' 
          }}
        >
          <AlertTriangle size={20} strokeWidth={2.5} /> تسجيل المخالفات
        </button>
      </div>

      <div className="mt-4">
        {activeSubTab === 'bonuses' && <HRBonuses user={user} refreshCounts={refreshCounts} />}
        {activeSubTab === 'violations' && <HRViolations user={user} refreshCounts={refreshCounts} onFiltersChange={onFiltersChange} />}
      </div>
    </div>
  );
};

export default HRBonusesAndViolations;
