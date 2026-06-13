import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Info, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DialogContext = createContext();

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
};

export const DialogProvider = ({ children }) => {
  const [dialogs, setDialogs] = useState([]);
  const dialogIdCounter = useRef(0);

  const removeDialog = useCallback((id) => {
    setDialogs((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const showConfirm = useCallback(({ title, message, confirmText = "Confirm", cancelText = "Cancel", type = "danger" }) => {
    return new Promise((resolve) => {
      const id = dialogIdCounter.current++;
      const handleConfirm = () => {
        resolve(true);
        removeDialog(id);
      };
      const handleCancel = () => {
        resolve(false);
        removeDialog(id);
      };

      setDialogs((prev) => [...prev, {
        id,
        kind: 'confirm',
        title,
        message,
        confirmText,
        cancelText,
        type,
        onConfirm: handleConfirm,
        onCancel: handleCancel,
      }]);
    });
  }, [removeDialog]);

  const showAlert = useCallback(({ title, message, type = "info" }) => {
    return new Promise((resolve) => {
      const id = dialogIdCounter.current++;
      const handleClose = () => {
        resolve();
        removeDialog(id);
      };

      setDialogs((prev) => [...prev, {
        id,
        kind: 'alert',
        title,
        message,
        type,
        onClose: handleClose,
      }]);
    });
  }, [removeDialog]);

  return (
    <DialogContext.Provider value={{ showConfirm, showAlert }}>
      {children}
      
      {/* Render Dialogs */}
      <AnimatePresence>
        {dialogs.map((dialog) => (
          <div key={dialog.id} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 sm:p-0">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border/50 overflow-hidden flex flex-col"
            >
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`mt-1 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                    dialog.type === 'danger' ? 'bg-red-500/10 text-red-500' :
                    dialog.type === 'warning' ? 'bg-amber-500/10 text-amber-500' :
                    dialog.type === 'success' ? 'bg-green-500/10 text-green-500' :
                    'bg-primary/10 text-primary'
                  }`}>
                    {dialog.type === 'danger' && <AlertTriangle className="w-5 h-5" />}
                    {dialog.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
                    {dialog.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
                    {(dialog.type === 'info' || !dialog.type) && <Info className="w-5 h-5" />}
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-lg font-bold mb-2">{dialog.title || (dialog.type === 'danger' ? 'Warning' : 'Alert')}</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap text-sm leading-relaxed">
                      {dialog.message}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-muted/30 px-6 py-4 flex items-center justify-end gap-3 border-t border-border/50">
                {dialog.kind === 'confirm' ? (
                  <>
                    <Button variant="ghost" onClick={dialog.onCancel} className="hover:bg-muted font-medium">
                      {dialog.cancelText}
                    </Button>
                    <Button 
                      onClick={dialog.onConfirm} 
                      className={`font-bold ${
                        dialog.type === 'danger' 
                          ? 'bg-red-500 hover:bg-red-600 text-white' 
                          : dialog.type === 'warning'
                          ? 'bg-amber-500 hover:bg-amber-600 text-white'
                          : 'bg-primary hover:bg-primary/90'
                      }`}
                    >
                      {dialog.confirmText}
                    </Button>
                  </>
                ) : (
                  <Button onClick={dialog.onClose} className="bg-primary hover:bg-primary/90 font-bold">
                    OK
                  </Button>
                )}
              </div>
            </motion.div>
          </div>
        ))}
      </AnimatePresence>
    </DialogContext.Provider>
  );
};
