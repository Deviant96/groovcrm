import { useClipboard, useTimeoutFn } from '@vueuse/core';
import { useToast } from 'primevue/usetoast';
import { ref } from 'vue';

export function useCopy() {
  const toast = useToast();
  const { copy, copied, isSupported } = useClipboard();
  const flash = ref(false);

  async function copyText(text: string, label = 'Copied') {
    if (!isSupported.value) {
      toast.add({ severity: 'warn', summary: 'Clipboard unavailable', life: 2500 });
      return;
    }
    await copy(text);
    flash.value = true;
    useTimeoutFn(() => {
      flash.value = false;
    }, 1200);
    toast.add({ severity: 'success', summary: label, life: 2000 });
  }

  return { copyText, copied, flash };
}
