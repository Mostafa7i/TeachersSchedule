'use client';

// components/ui/ConfirmDialog.js
import Modal from './Modal';

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'تأكيد العملية',
  message,
  confirmLabel = 'تأكيد',
  cancelLabel = 'إلغاء',
  variant = 'danger',
  loading = false,
}) {
  const variantClasses = {
    danger: 'bg-red-600 hover:bg-red-700',
    warning: 'bg-amber-500 hover:bg-amber-600',
    primary: 'bg-blue-600 hover:bg-blue-700',
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 ${variantClasses[variant]}`}
          >
            {loading ? 'جاري التنفيذ...' : confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-gray-600 text-sm">{message}</p>
    </Modal>
  );
}
