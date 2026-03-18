import { useId, useState, useCallback } from 'react';

export function useAccessibleButton(
  onClick: () => void,
  options: {
    label?: string;
    description?: string;
    disabled?: boolean;
    loading?: boolean;
  } = {}
) {
  const buttonId = useId();
  const labelId = options.description ? `${buttonId}-label` : undefined;
  const descId = options.description ? `${buttonId}-desc` : undefined;

  const handleClick = useCallback(() => {
    if (!options.disabled && !options.loading) {
      onClick();
    }
  }, [onClick, options.disabled, options.loading]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  }, [handleClick]);

  return {
    buttonProps: {
      id: buttonId,
      'aria-label': options.label,
      'aria-labelledby': labelId,
      'aria-describedby': descId,
      'aria-disabled': options.disabled || options.loading,
      disabled: options.disabled || options.loading,
      onClick: handleClick,
      onKeyDown: handleKeyDown,
      role: 'button',
      tabIndex: options.disabled ? -1 : 0,
    },
    labelProps: labelId ? { id: labelId } : undefined,
    descProps: descId ? { id: descId } : undefined,
  };
}

export function useAccessibleDialog(
  isOpen: boolean,
  onClose: () => void,
  options: {
    label?: string;
    description?: string;
  } = {}
) {
  const dialogId = useId();
  const titleId = `${dialogId}-title`;
  const descId = options.description ? `${dialogId}-desc` : undefined;

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  return {
    dialogProps: {
      id: dialogId,
      role: 'dialog',
      'aria-modal': true,
      'aria-labelledby': titleId,
      'aria-describedby': descId,
      onKeyDown: handleKeyDown,
    },
    titleProps: {
      id: titleId,
    },
    descProps: descId ? { id: descId } : undefined,
    isOpen,
  };
}

export function useAccessibleForm(
  onSubmit: (data: Record<string, any>) => void,
  options: {
    validation?: (data: Record<string, any>) => Record<string, string>;
  } = {}
) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const handleSubmit = useCallback((event: React.FormEvent) => {
    event.preventDefault();

    const validationErrors = options.validation ? options.validation(formData) : {};
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length === 0) {
      onSubmit(formData);
    }
  }, [formData, onSubmit, options.validation]);

  const handleChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [errors]);

  const handleBlur = useCallback((field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  }, []);

  return {
    formData,
    errors,
    touched,
    handleSubmit,
    handleChange,
    handleBlur,
    setFormData,
  };
}

export function useScreenReaderAnnouncement() {
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.style.position = 'absolute';
    announcement.style.left = '-10000px';
    announcement.style.width = '1px';
    announcement.style.height = '1px';
    announcement.style.overflow = 'hidden';

    document.body.appendChild(announcement);
    announcement.textContent = message;

    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }, []);

  return { announce };
}