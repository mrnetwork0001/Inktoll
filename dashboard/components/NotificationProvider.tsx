'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AlertOptions {
  title?: string;
  confirmText?: string;
}

interface PromptOptions {
  title?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
}

interface Toast {
  id: string;
  message: React.ReactNode;
  type: 'success' | 'error' | 'info';
}

interface NotificationContextType {
  showAlert: (message: string, options?: AlertOptions) => Promise<void>;
  showPrompt: (message: string, options?: PromptOptions) => Promise<string | null>;
  showToast: (message: React.ReactNode, type?: 'success' | 'error' | 'info') => void;
  dismissToast: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  // Alert State
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertTitle, setAlertTitle] = useState('Inktoll Message');
  const [alertConfirmText, setAlertConfirmText] = useState('OK');
  const [alertResolver, setAlertResolver] = useState<(() => void) | null>(null);

  // Prompt State
  const [promptOpen, setPromptOpen] = useState(false);
  const [promptMessage, setPromptMessage] = useState('');
  const [promptTitle, setPromptTitle] = useState('Input Required');
  const [promptPlaceholder, setPromptPlaceholder] = useState('');
  const [promptValue, setPromptValue] = useState('');
  const [promptConfirmText, setPromptConfirmText] = useState('Submit');
  const [promptCancelText, setPromptCancelText] = useState('Cancel');
  const [promptResolver, setPromptResolver] = useState<((val: string | null) => void) | null>(null);

  // Toast State
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showAlert = (message: string, options?: AlertOptions) => {
    setAlertMessage(message);
    setAlertTitle(options?.title || 'System Notification');
    setAlertConfirmText(options?.confirmText || 'OK');
    setAlertOpen(true);
    return new Promise<void>((resolve) => {
      setAlertResolver(() => resolve);
    });
  };

  const handleAlertClose = () => {
    setAlertOpen(false);
    if (alertResolver) alertResolver();
  };

  const showPrompt = (message: string, options?: PromptOptions) => {
    setPromptMessage(message);
    setPromptTitle(options?.title || 'Action Required');
    setPromptPlaceholder(options?.placeholder || 'Enter value...');
    setPromptValue(options?.defaultValue || '');
    setPromptConfirmText(options?.confirmText || 'OK');
    setPromptCancelText(options?.cancelText || 'Cancel');
    setPromptOpen(true);
    return new Promise<string | null>((resolve) => {
      setPromptResolver(() => resolve);
    });
  };

  const handlePromptSubmit = () => {
    setPromptOpen(false);
    if (promptResolver) promptResolver(promptValue);
  };

  const handlePromptCancel = () => {
    setPromptOpen(false);
    if (promptResolver) promptResolver(null);
  };

  const showToast = (message: React.ReactNode, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto-dismiss after 6 seconds so user has time to click the link
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ showAlert, showPrompt, showToast, dismissToast }}>
      {children}

      {/* 1. Alert Modal */}
      {alertOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div className="glass-card" style={{
            width: '90%',
            maxWidth: '450px',
            padding: '2rem',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'var(--bg-card)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
            animation: 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              {alertTitle}
            </h3>
            <p style={{ margin: 0, fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              {alertMessage}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                className="btn btn-primary"
                onClick={handleAlertClose}
                style={{ padding: '0.7rem 2.2rem', borderRadius: '50px', fontWeight: 'bold' }}
              >
                {alertConfirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Prompt Modal */}
      {promptOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div className="glass-card" style={{
            width: '90%',
            maxWidth: '480px',
            padding: '2rem',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'var(--bg-card)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
            animation: 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              {promptTitle}
            </h3>
            <p style={{ margin: 0, fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              {promptMessage}
            </p>
            <input
              type="text"
              value={promptValue}
              onChange={(e) => setPromptValue(e.target.value)}
              placeholder={promptPlaceholder}
              autoFocus
              style={{
                width: '100%',
                padding: '0.9rem 1.25rem',
                borderRadius: '12px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                fontSize: '1rem',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'all 0.2s ease-in-out'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handlePromptSubmit();
                if (e.key === 'Escape') handlePromptCancel();
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.5rem' }}>
              <button
                className="btn"
                onClick={handlePromptCancel}
                style={{
                  padding: '0.7rem 1.8rem',
                  borderRadius: '50px',
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                {promptCancelText}
              </button>
              <button
                className="btn btn-primary"
                onClick={handlePromptSubmit}
                style={{ padding: '0.7rem 2.2rem', borderRadius: '50px', fontWeight: 'bold' }}
              >
                {promptConfirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Toast Notifications Overlay */}
      <div style={{
        position: 'fixed',
        bottom: '2rem',
        right: '2rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        zIndex: 999999,
        pointerEvents: 'none'
      }}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              padding: '1rem 1.5rem',
              borderRadius: '12px',
              background: 'var(--bg-card)',
              backdropFilter: 'blur(16px)',
              borderLeft: `4px solid ${
                toast.type === 'success'
                  ? 'var(--primary)'
                  : toast.type === 'error'
                  ? 'var(--primary)'
                  : 'var(--primary)'
              }`,
              borderTop: '1px solid var(--border)',
              borderRight: '1px solid var(--border)',
              borderBottom: '1px solid var(--border)',
              color: 'var(--text-primary)',
              fontSize: '0.95rem',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.8rem',
              pointerEvents: 'auto',
              animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>
              {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}
            </span>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', flex: 1 }}>{toast.message}</span>
            <button 
              onClick={() => dismissToast(toast.id)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '1.2rem',
                padding: '0 0 0 0.5rem',
                lineHeight: 1
              }}
            >
              &times;
            </button>
          </div>
        ))}
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes slideInRight {
          from { transform: translateX(120%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}
