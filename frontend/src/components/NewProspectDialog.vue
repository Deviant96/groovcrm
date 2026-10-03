<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';
import { prospectApi } from '@/services';

const visible = defineModel<boolean>('visible', { default: false });

const router = useRouter();
const toast = useToast();
const companyName = ref('');
const saving = ref(false);
const error = ref('');

watch(visible, (v) => {
  if (v) {
    companyName.value = '';
    error.value = '';
  }
});

async function submit() {
  const name = companyName.value.trim();
  if (!name) {
    error.value = 'Company name is required';
    return;
  }
  saving.value = true;
  error.value = '';
  try {
    const { data } = await prospectApi.create({ companyName: name });
    visible.value = false;
    toast.add({ severity: 'success', summary: 'Prospect created', life: 2000 });
    router.push(`/prospects/${data.id}`);
  } catch (e: unknown) {
    error.value =
      (e as { response?: { data?: { error?: string } } })?.response?.data?.error ??
      'Could not create prospect';
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    header="New Prospect"
    :style="{ width: 'min(28rem, 92vw)' }"
    @keydown.enter.prevent="submit"
  >
    <div class="space-y-3">
      <div>
        <label class="mb-1.5 block text-sm font-medium text-gc-text" for="new-company">
          Company name
        </label>
        <InputText
          id="new-company"
          v-model="companyName"
          class="w-full"
          autofocus
          placeholder="Acme Studio"
        />
      </div>
      <p v-if="error" class="text-sm text-red-400">{{ error }}</p>
    </div>
    <template #footer>
      <Button label="Cancel" severity="secondary" text @click="visible = false" />
      <Button label="Create" icon="pi pi-plus" :loading="saving" @click="submit" />
    </template>
  </Dialog>
</template>
