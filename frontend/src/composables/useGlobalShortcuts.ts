import { onKeyStroke, useMagicKeys } from '@vueuse/core';
import { watch } from 'vue';

export function useGlobalShortcuts(handlers: {
  onSearch?: () => void;
  onNew?: () => void;
  onEscape?: () => void;
}) {
  const keys = useMagicKeys();

  watch(keys['Meta+K'], (v) => {
    if (v) handlers.onSearch?.();
  });
  watch(keys['Ctrl+K'], (v) => {
    if (v) handlers.onSearch?.();
  });

  onKeyStroke('/', (e) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
    e.preventDefault();
    handlers.onSearch?.();
  });

  onKeyStroke('Escape', () => handlers.onEscape?.());
}
