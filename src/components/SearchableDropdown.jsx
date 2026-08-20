import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search } from 'lucide-react';
import { matchesSearch, useDebounce } from '../utils/searchEngine';

const SearchableDropdown = ({ options, value, onChange, placeholder, onBlur, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm);
  const [dropdownCoords, setDropdownCoords] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const menuRef = useRef(null);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedOutsideContainer = containerRef.current && !containerRef.current.contains(event.target);
      const clickedOutsideMenu = menuRef.current && !menuRef.current.contains(event.target);
      
      if (clickedOutsideContainer && clickedOutsideMenu) {
        setIsOpen(false);
        if (onBlur) onBlur(searchTerm);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onBlur, searchTerm]);

  // Calculate and update position dynamically on scroll and resize
  useEffect(() => {
    const updateCoords = () => {
      if (isOpen && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const targetHeight = 450;

        let top = rect.bottom + window.scrollY + 4;
        let isUpward = false;
        let calculatedMaxHeight = targetHeight;

        if (spaceBelow < targetHeight && spaceAbove > spaceBelow) {
          top = rect.top + window.scrollY - 4;
          isUpward = true;
          // Calculate max height to not exceed top edge (with some margin)
          calculatedMaxHeight = Math.min(targetHeight, spaceAbove - 20);
        } else {
          // Calculate max height to not exceed bottom edge (with some margin)
          calculatedMaxHeight = Math.min(targetHeight, spaceBelow - 20);
        }

        setDropdownCoords({
          top,
          left: rect.left + window.scrollX,
          width: rect.width,
          isUpward,
          maxHeight: Math.max(calculatedMaxHeight, 150) // Ensure at least 150px
        });
      }
    };

    if (isOpen) {
      updateCoords();
      window.addEventListener('scroll', updateCoords, true);
      window.addEventListener('resize', updateCoords);
    }

    return () => {
      window.removeEventListener('scroll', updateCoords, true);
      window.removeEventListener('resize', updateCoords);
    };
  }, [isOpen]);

  // Sync searchTerm with value prop
  useEffect(() => {
    setSearchTerm(value || '');
  }, [value]);

  const filteredOptions = options.filter(option => matchesSearch(option, debouncedSearchTerm));

  const handleInputChange = (e) => {
    const newVal = e.target.value;
    setSearchTerm(newVal);
    onChange(newVal);
    if (!isOpen) setIsOpen(true);
  };

  const handleOptionClick = (option) => {
    setSearchTerm(option);
    onChange(option);
    setIsOpen(false);
    if (onBlur) onBlur(option);
  };

  const menuContent = isOpen ? (
    <div 
      ref={menuRef}
      style={{
        position: 'absolute',
        top: `${dropdownCoords.top}px`,
        left: `${dropdownCoords.left}px`,
        width: `${dropdownCoords.width}px`,
        transform: dropdownCoords.isUpward ? 'translateY(-100%)' : 'none',
        zIndex: 999999, // Super high z-index to stay above modals
        backgroundColor: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
        maxHeight: dropdownCoords.maxHeight ? `${dropdownCoords.maxHeight}px` : '450px',
        overflowY: 'auto',
        listStyle: 'none',
        padding: '0',
        margin: '0',
        textAlign: 'right'
      }}
    >
      {filteredOptions.length > 0 ? (
        <ul style={{ listStyle: 'none', margin: 0, padding: '2px 0' }}>
          {filteredOptions.map((option, idx) => (
            <li
              key={idx}
              style={{
                padding: '6px 12px',
                cursor: 'pointer',
                fontSize: '13px',
                lineHeight: '1.4',
                color: '#1e293b',
                borderBottom: idx < filteredOptions.length - 1 ? '1px solid #f1f5f9' : 'none'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#f0fdfa';
                e.target.style.color = '#0d9488';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = '#1e293b';
              }}
              onClick={() => handleOptionClick(option)}
            >
              {option}
            </li>
          ))}
        </ul>
      ) : (
        <div style={{ padding: '12px 16px', fontSize: '14px', color: '#64748b', textAlign: 'center' }}>
          لا توجد نتائج مطابقة
        </div>
      )}
    </div>
  ) : null;

  return (
    <div style={{ position: 'relative', width: '100%' }} ref={containerRef}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          ref={inputRef}
          type="text"
          className="input-field"
          style={{ 
            padding: '0.5rem 2rem', 
            fontSize: '0.875rem', 
            width: '100%', 
            border: '1px solid #e2e8f0',
            borderRadius: '0.5rem',
            outline: 'none',
            textAlign: 'center',
            backgroundColor: disabled ? '#f8fafc' : 'white',
            color: disabled ? '#94a3b8' : 'inherit',
            cursor: disabled ? 'not-allowed' : 'text'
          }}
          placeholder={placeholder || 'ابحث أو اختر...'}
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => { if (!disabled) setIsOpen(true); }}
          disabled={disabled}
        />
        <button 
          type="button"
          style={{ 
            position: 'absolute', 
            right: '0.5rem', /* Move arrow to the right for RTL */
            color: disabled ? '#cbd5e1' : '#94a3b8', 
            background: 'none', 
            border: 'none', 
            cursor: disabled ? 'not-allowed' : 'pointer',
            padding: '0.25rem'
          }}
          onClick={() => {
            if (disabled) return;
            setIsOpen(!isOpen);
            if (!isOpen) inputRef.current?.focus();
          }}
          disabled={disabled}
        >
          <ChevronDown size={16} />
        </button>
      </div>

      {/* Render the menu in a portal at the body level */}
      {isOpen && createPortal(menuContent, document.body)}
    </div>
  );
};

export default SearchableDropdown;
