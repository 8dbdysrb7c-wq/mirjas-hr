import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export const Modal = ({ isOpen, onClose, title, children, maxWidth = '500px' }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="modal-overlay" style={{ zIndex: 10500 }}>
        <motion.div 
          className="modal-content flex flex-col max-h-[90vh]" 
          style={{ maxWidth }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex justify-between items-center p-4 sm:p-5 border-b border-gray-100 shrink-0">
            <h3 className="font-bold text-lg text-slate-800 mb-0">{title}</h3>
            <button 
              type="button" 
              onClick={onClose} 
              className="icon-btn hover:bg-gray-100 rounded-full p-2 transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>
          <div className="p-4 sm:p-5 overflow-y-auto">
            {children}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
