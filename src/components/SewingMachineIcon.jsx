import React from 'react';

const SewingMachineIcon = ({ size = 24, color = "currentColor", className = "" }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 200 200" 
    fill={color} 
    className={className}
  >
    {/* Base plates */}
    <rect x="20" y="160" width="160" height="10" rx="2" />
    <rect x="25" y="150" width="140" height="10" />
    
    {/* Main Body Silhouette */}
    <path d="
      M 140 150 
      V 90 
      C 140 70, 110 60, 80 80 
      C 60 93, 45 85, 45 70 
      V 65 
      H 35 
      V 130 
      C 35 145, 50 145, 50 130 
      V 105 
      C 50 90, 70 85, 90 85 
      C 110 85, 120 90, 120 110 
      V 150 
      Z" 
    />
    
    {/* Left-side thread lever */}
    <path d="M 35 100 C 20 100, 20 90, 35 90 Z" />
    
    {/* Center circle detail */}
    <circle cx="125" cy="95" r="8" fill="transparent" stroke={color} strokeWidth="3" />
    
    {/* Spool pins on top */}
    <rect x="110" y="50" width="6" height="20" rx="3" />
    <path d="M 105 58 H 121 V 61 H 105 Z" />
    <rect x="42" y="55" width="4" height="10" rx="2" />
    
    {/* Thread swoops (using thin paths) */}
    <path d="M 110 55 C 80 60, 60 50, 44 55" fill="none" stroke={color} strokeWidth="1" />
    
    {/* Needle & foot */}
    <rect x="43" y="130" width="3" height="20" />
    <rect x="38" y="147" width="13" height="3" />
    
    {/* Back thread guide */}
    <rect x="33" y="115" width="2" height="15" />
    <circle cx="34" cy="115" r="3" />
    
    {/* Wheel Connector */}
    <rect x="140" y="75" width="10" height="20" />
    
    {/* Hand Wheel (Vertical block) */}
    <rect x="146" y="60" width="10" height="50" rx="5" />
    <rect x="142" y="70" width="4" height="30" />
    
    {/* Crank mechanism */}
    <path d="M 151 85 H 160 V 105 H 180 C 195 105, 195 95, 180 95 H 165 V 80 H 151 Z" />
  </svg>
);

export default SewingMachineIcon;
