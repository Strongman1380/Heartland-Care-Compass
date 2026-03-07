import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
}

export function useKeyboardShortcuts({ enabled = true }: UseKeyboardShortcutsOptions = {}) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }

      const key = event.key.toLowerCase();
      const hasModifier = event.metaKey || event.ctrlKey;

      if (hasModifier && key === 'k') {
        event.preventDefault();
        return;
      }

      if (hasModifier && key === 'n') {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent('open-add-youth'));
        return;
      }

      if (hasModifier && key === 's') {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent('save-form'));
        return;
      }

      if (hasModifier && key === 'g') {
        event.preventDefault();
        navigate('/');
        return;
      }

      if (hasModifier && key === 'y') {
        event.preventDefault();
        navigate('/youth-list');
        return;
      }

      if (key === 'escape' && !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey) {
        event.preventDefault();
        navigate(-1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, navigate]);
}

export default useKeyboardShortcuts;
