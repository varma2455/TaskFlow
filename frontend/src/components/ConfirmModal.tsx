import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isDanger?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
  onClose?: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = true,
  isDanger,
  isLoading = false,
  onConfirm,
  onCancel,
  onClose,
}) => {
  const handleDismiss = onCancel || onClose || (() => {});
  const destructive = isDanger !== undefined ? isDanger : isDestructive;
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-elevated border border-[#EAE6DF] overflow-hidden text-charcoal-900">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div
              className={`p-3 rounded-full shrink-0 ${
                destructive ? 'bg-rose-100 text-rose-600' : 'bg-brand-100 text-brand-600'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-charcoal-900">{title}</h3>
              <p className="mt-1.5 text-xs text-charcoal-600 leading-relaxed">{message}</p>
            </div>
            <button
              onClick={handleDismiss}
              className="text-charcoal-400 hover:text-charcoal-700 transition p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-[#EAE6DF]">
            <button
              type="button"
              onClick={handleDismiss}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-semibold text-charcoal-600 bg-ivory-200 hover:bg-ivory-300 rounded-xl transition"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className={`px-4 py-2 text-xs font-semibold text-white rounded-xl transition flex items-center gap-2 ${
                destructive
                  ? 'bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400'
                  : 'bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400'
              }`}
            >
              {isLoading && (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
