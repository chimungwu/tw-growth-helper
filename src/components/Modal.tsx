import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, content }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          
          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-[32px] sm:rounded-[48px] shadow-2xl flex flex-col overflow-hidden border border-line/50"
          >
            {/* Header */}
            <div className="px-6 py-6 sm:px-12 sm:pt-12 sm:pb-6 flex items-center justify-between border-b border-slate-50">
              <h3 className="text-xl sm:text-3xl font-black text-ink font-display">{title}</h3>
              <button
                onClick={onClose}
                className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-50 hover:bg-slate-100 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all active:scale-90 shrink-0"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400" />
              </button>
            </div>
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-12 sm:py-8">
              <div className="text-slate-600 font-bold leading-relaxed whitespace-pre-wrap text-base sm:text-xl">
                {content}
              </div>
            </div>
            
            {/* Footer */}
            <div className="px-6 py-6 sm:px-12 sm:pb-12 sm:pt-6 border-t border-slate-50">
              <button
                onClick={onClose}
                className="w-full bg-accent text-white py-4 sm:py-6 rounded-2xl sm:rounded-[32px] font-black shadow-xl sm:shadow-2xl shadow-accent/30 hover:brightness-105 active:scale-[0.98] transition-all text-sm sm:text-base uppercase tracking-widest"
              >
                確認
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
