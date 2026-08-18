import React, { createContext, useState, useContext } from 'react';

const AlertContext = createContext();

export function useAlert() {
  return useContext(AlertContext);
}

export function AlertProvider({ children }) {
  const [modalAlert, setModalAlert] = useState({ show: false, type: 'success', title: '', message: '' });

  const showAlert = (type, title, message) => {
    setModalAlert({ show: true, type, title, message });
  };

  const closeAlert = () => {
    setModalAlert({ ...modalAlert, show: false });
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      
      {/* Global Custom Modal Popup */}
      {modalAlert.show && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all animate-scale-up">
            <div className={`h-2 ${modalAlert.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}></div>
            <div className="p-6 text-center">
              <div className={`mx-auto flex items-center justify-center h-16 w-16 rounded-full mb-5 ${modalAlert.type === 'error' ? 'bg-red-100 text-red-500' : 'bg-green-100 text-green-500'}`}>
                {modalAlert.type === 'error' ? (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                ) : (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                )}
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">{modalAlert.title}</h3>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed">{modalAlert.message}</p>
              <button 
                onClick={closeAlert}
                className={`w-full py-3 rounded-xl font-semibold text-white shadow-md transition-transform active:scale-95 focus:outline-none ${modalAlert.type === 'error' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' : 'bg-green-500 hover:bg-green-600 shadow-green-500/20'}`}
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </AlertContext.Provider>
  );
}
