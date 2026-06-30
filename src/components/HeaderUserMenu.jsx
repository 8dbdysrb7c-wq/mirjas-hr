import React, { useEffect, useRef, useState } from 'react';
import { CircleUserRound, LogOut, Settings2 } from 'lucide-react';
import ProfileModal from './ProfileModal';

const HeaderUserMenu = ({ user, onLogout, onUpdateUser }) => {
  const containerRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSaved = (updatedUser) => {
    if (onUpdateUser) {
      onUpdateUser(updatedUser);
    }
    setIsProfileOpen(false);
    setIsOpen(false);
  };

  return (
    <>
      <div className="user-menu" ref={containerRef}>
        <button
          type="button"
          className={`header-icon-button ${isOpen ? 'active' : ''}`}
          onClick={() => setIsOpen((current) => !current)}
          aria-label="الحساب"
        >
          <CircleUserRound size={19} />
        </button>

        {isOpen && (
          <div className="user-menu-panel animate-fade-in">
            <button
              type="button"
              className="user-menu-item"
              onClick={() => {
                setIsProfileOpen(true);
                setIsOpen(false);
              }}
            >
              <Settings2 size={16} />
              <span>تغيير بيانات المستخدم</span>
            </button>

            <button
              type="button"
              className="user-menu-item user-menu-item-danger"
              onClick={onLogout}
            >
              <LogOut size={16} />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        )}
      </div>

      <ProfileModal
        open={isProfileOpen}
        user={user}
        onClose={() => setIsProfileOpen(false)}
        onSaved={handleSaved}
      />
    </>
  );
};

export default HeaderUserMenu;
