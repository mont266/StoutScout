import React from 'react';
import { createPortal } from 'react-dom';

const KofiModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/60 z-[1200] flex items-center justify-center p-4 animate-modal-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg h-[90vh] max-h-[700px] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white">Support Stoutly</h3>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors p-2 rounded-full"
            aria-label="Close donation modal"
          >
            <i className="fas fa-times fa-lg"></i>
          </button>
        </div>
        <iframe
          id='kofiframe'
          src='https://ko-fi.com/stoutly/?hide_header=true&amp;embed=true'
          className="w-full h-full border-0"
          title='Support Stoutly on Ko-fi'
        ></iframe>
      </div>
    </div>,
    document.getElementById('modal-root')
  );
};

export default KofiModal;
