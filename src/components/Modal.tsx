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
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          
          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-lg bg-white rounded-[32px] shadow-[16px_16px_0px_0px_rgba(15,23,42,0.15)] overflow-hidden border-2 border-line"
          >
            <div className="p-10">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black text-ink tracking-tight">{title}</h3>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 border-2 border-transparent hover:border-line"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="text-ink-muted leading-relaxed whitespace-pre-wrap text-base font-bold mb-10">
                {content}
              </div>
              
              <button
                onClick={onClose}
                className="btn-primary w-full"
              >
                我知道了
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
