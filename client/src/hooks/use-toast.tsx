import toast from 'react-hot-toast';

export { toast };

// Custom hook for advanced toast functionality
export const useToast = () => {
  const showSuccess = (message: string, duration?: number) => {
    return toast.success(message, { duration });
  };

  const showError = (message: string, duration?: number) => {
    return toast.error(message, { duration });
  };

  const showInfo = (message: string, duration?: number) => {
    return toast(message, { 
      duration,
      style: {
        background: '#3b82f6',
        color: '#ffffff',
      },
    });
  };

  const showWarning = (message: string, duration?: number) => {
    return toast(message, { 
      duration,
      style: {
        background: '#f59e0b',
        color: '#ffffff',
      },
    });
  };

  const showCustom = (message: string, options?: any) => {
    return toast(message, options);
  };

  const dismiss = (toastId?: string) => {
    if (toastId) {
      toast.dismiss(toastId);
    } else {
      toast.dismiss();
    }
  };

  const loading = (message: string) => {
    return toast.loading(message);
  };

  return {
    showSuccess,
    showError,
    showInfo,
    showWarning,
    showCustom,
    dismiss,
    loading
  };
};

export default useToast;