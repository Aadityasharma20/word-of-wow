import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export function Modal({ isOpen, onClose, title, children, maxWidth = '540px' }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem', animation: 'fadeIn 0.2s ease',
    }}>
      <div onClick={(e) => e.stopPropagation()} className="glass" style={{
        width: '100%', maxWidth, maxHeight: '85vh', overflow: 'auto',
        padding: '1.5rem', animation: 'slideUp 0.3s ease',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: '1rem',
        }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{title}</h3>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '0.3rem' }}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
