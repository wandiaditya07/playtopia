<template>
  <img
    v-if="src"
    :src="src"
    :width="size"
    :height="size"
    :alt="alt"
  >
  <div
    v-else
    class="d-inline-flex align-items-center justify-content-center bg-light text-muted small"
    :style="{ width: size + 'px', height: size + 'px' }"
  >
    QR...
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import QRCode from 'qrcode'

const props = defineProps({
  value: { type: String, required: true },
  size: { type: Number, default: 160 },
  alt: { type: String, default: 'QR Code' }
})

const src = ref('')

watch(
  () => [props.value, props.size],
  async () => {
    try {
      src.value = await QRCode.toDataURL(props.value, { width: props.size * 2, margin: 1 })
    } catch {
      src.value = ''
    }
  },
  { immediate: true }
)
</script>

