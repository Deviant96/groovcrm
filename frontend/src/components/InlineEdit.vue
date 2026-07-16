<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Textarea from 'primevue/textarea';
import DatePicker from 'primevue/datepicker';
import Select from 'primevue/select';

const props = defineProps<{
  modelValue: string | number | boolean | Date | null | undefined;
  label: string;
  type?: 'text' | 'number' | 'textarea' | 'date' | 'select' | 'boolean';
  options?: { label: string; value: string }[];
  placeholder?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: unknown];
  save: [value: unknown];
}>();

const editing = ref(false);
const draft = ref<unknown>(props.modelValue);
const inputEl = ref<HTMLElement | null>(null);

const display = computed(() => {
  if (props.type === 'boolean') return props.modelValue ? 'Yes' : 'No';
  if (props.type === 'date' && props.modelValue) {
    return new Date(props.modelValue as string | Date).toLocaleDateString();
  }
  if (props.type === 'select' && props.options) {
    return props.options.find((o) => o.value === props.modelValue)?.label ?? props.modelValue ?? '—';
  }
  return props.modelValue || '—';
});

async function startEdit() {
  editing.value = true;
  draft.value =
    props.type === 'date' && props.modelValue ? new Date(props.modelValue as string) : props.modelValue;
  await nextTick();
  const el = inputEl.value?.querySelector?.('input, textarea') as HTMLElement | null;
  el?.focus();
}

function cancel() {
  editing.value = false;
  draft.value = props.modelValue;
}

function save() {
  let value = draft.value;
  if (props.type === 'date' && value instanceof Date) {
    value = value.toISOString();
  }
  emit('update:modelValue', value);
  emit('save', value);
  editing.value = false;
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Enter' && props.type !== 'textarea') {
    e.preventDefault();
    save();
  }
  if (e.key === 'Escape') {
    e.preventDefault();
    cancel();
  }
}
</script>

<template>
  <div class="group">
    <div class="text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">{{ label }}</div>
    <div v-if="!editing" class="rounded-lg px-2 py-1.5 -mx-2 cursor-pointer transition hover:bg-green-50" @dblclick="startEdit">
      <span class="text-sm text-gray-900 break-all">{{ display }}</span>
      <span class="ml-2 text-[10px] text-gray-400 opacity-0 group-hover:opacity-100">dbl-click</span>
    </div>
    <div v-else ref="inputEl" class="flex flex-col gap-2" @keydown="onKey">
      <Textarea v-if="type === 'textarea'" v-model="draft as string" rows="3" class="w-full" />
      <InputNumber v-else-if="type === 'number'" v-model="draft as number" class="w-full" :min="0" :max="100" />
      <DatePicker v-else-if="type === 'date'" v-model="draft as Date" class="w-full" show-icon date-format="dd M yy" />
      <Select
        v-else-if="type === 'select'"
        v-model="draft"
        :options="options"
        option-label="label"
        option-value="value"
        class="w-full"
      />
      <Select
        v-else-if="type === 'boolean'"
        v-model="draft"
        :options="[
          { label: 'Yes', value: true },
          { label: 'No', value: false },
        ]"
        option-label="label"
        option-value="value"
        class="w-full"
      />
      <InputText v-else v-model="draft as string" class="w-full" :placeholder="placeholder" />
      <div class="flex gap-2">
        <button type="button" class="text-xs text-green-700 font-medium" @click="save">Save (Enter)</button>
        <button type="button" class="text-xs text-gray-500" @click="cancel">Cancel (Esc)</button>
      </div>
    </div>
  </div>
</template>
