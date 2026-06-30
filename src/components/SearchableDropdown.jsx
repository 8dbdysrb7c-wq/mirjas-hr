import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search } from 'lucide-react';

const SearchableDropdown = ({ options, value, onChange, placeholder, onBlur }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
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
        if (onBlur) onBlur();
      }
    };

    // Close on any scroll event to avoid detached floating menu
    const handleScroll = (e) => {
      // Don't close if scrolling inside the menu itself
      if (menuRef.current && menuRef.current.contains(e.target)) return;
      if (isOpen) {
        setIsOpen(false);
        if (onBlur) onBlur();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true); // Use capture phase to catch all scrolls
      window.addEventListener('resize', handleScroll);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isOpen, onBlur]);

  // Calculate position when opening
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownCoords({
        top: rect.bottom + window.scrollY + 4, // 4px margin
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  }, [isOpen]);

  // Sync searchTerm with value prop
  useEffect(() => {
    setSearchTerm(value || '');
  }, [value]);

  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    if (onBlur) onBlur();
  };

  const menuContent = isOpen ? (
    <div 
      ref={menuRef}
      style={{
        position: 'absolute',
        top: `${dropdownCoords.top}px`,
        left: `${dropdownCoords.left}px`,
        width: `${dropdownCoords.width}px`,
        zIndex: 999999, // Super high z-index to stay above modals
        backgroundColor: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
        maxHeight: '250px',
        overflowY: 'auto',
        listStyle: 'none',
        padding: '0',
        margin: '0',
        textAlign: 'right'
      }}
    >
      {filteredOptions.length > 0 ? (
        <ul style={{ listStyle: 'none', margin: 0, padding: '4px 0' }}>
          {filteredOptions.map((option, idx) => (
            <li
              key={idx}
              style={{
                padding: '10px 16px',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#1e293b',
                borderBottom: idx < filteredOptions.length - 1 ? '1px solid #f8fafc' : 'none'
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
            textAlign: 'center'
          }}
          placeholder={placeholder || 'ابحث أو اختر...'}
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
        />
        <button 
          type="button"
          style={{ 
            position: 'absolute', 
            right: '0.5rem', /* Move arrow to the right for RTL */
            color: '#94a3b8', 
            background: 'none', 
            border: 'none', 
            cursor: 'pointer',
            padding: '0.25rem'
          }}
          onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen) inputRef.current?.focus();
          }}
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
