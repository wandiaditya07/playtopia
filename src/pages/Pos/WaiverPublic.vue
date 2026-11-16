<template>
  <div class="waiver-page min-vh-100 py-4 px-3 d-flex align-items-center justify-content-center">
    <div class="waiver-card card border-0 shadow-lg w-100" style="max-width: 520px; border-radius: 18px; overflow: hidden;">
      <!-- Top Brand Header -->
      <div class="waiver-header text-center p-4 text-white">
        <div class="bg-white d-inline-block px-3 py-2 rounded-3 mb-2 shadow-sm">
          <img :src="PlaytopiaLogo" alt="Playtopia" style="height: 34px; object-fit: contain;" />
        </div>
        <h5 class="fw-bold mb-1">Form Registrasi &amp; Waiver Bermain</h5>
        <div class="small opacity-75">Cukup diisi 1 kali saja &middot; Berlaku untuk kunjungan selanjutnya</div>
      </div>

      <div class="card-body p-4">
        <!-- SUCCESS STATE: QR Code & Registration Details -->
        <div v-if="savedWaiver" class="text-center">
          <div class="badge bg-success-subtle text-success px-3 py-2 rounded-pill mb-2 fw-semibold">
            ✓ Data Waiver Terdaftar Permanen
          </div>
          <h5 class="fw-bold text-dark mb-1">{{ savedWaiver.parent_name }}</h5>
          <div class="text-muted small mb-3">No. HP / WhatsApp: <strong>{{ savedWaiver.phone }}</strong></div>

          <div class="p-3 bg-light rounded-4 border d-inline-block mb-3">
            <QrImage :value="savedWaiver.registration_code" :size="180" />
            <div class="font-monospace fw-bold text-primary mt-2" style="font-size: 18px; letter-spacing: 1px;">
              {{ savedWaiver.registration_code }}
            </div>
          </div>

          <div class="text-start bg-light p-3 rounded-3 border mb-3">
            <div class="small fw-bold text-secondary text-uppercase mb-2">Daftar Nama Anak Terdaftar:</div>
            <div
              v-for="(ch, idx) in savedWaiver.children"
              :key="idx"
              class="d-flex justify-content-between align-items-center py-1 border-bottom last-border-0"
            >
              <span class="fw-semibold text-dark">{{ idx + 1 }}. {{ ch.name }}</span>
              <span class="badge bg-white text-secondary border">{{ ch.age }} Tahun</span>
            </div>
          </div>

          <div class="alert alert-info small text-start py-2 px-3 mb-3">
            <strong>Petunjuk di Kasir:</strong> Tunjukkan QR Code di atas kepada Kasir, atau cukup sebutkan Nomor HP Anda (<strong>{{ savedWaiver.phone }}</strong>). Nama anak akan otomatis masuk ke tiket &amp; layar Monitor Timer.
          </div>

          <div class="d-flex gap-2">
            <button type="button" class="btn btn-outline-primary w-50 fw-semibold" @click="editCurrentWaiver">
              Ubah / Tambah Anak
            </button>
            <button type="button" class="btn btn-primary w-50 fw-semibold" @click="resetForm">
              Isi Baru
            </button>
          </div>
        </div>

        <!-- FORM STATE -->
        <form v-else @submit.prevent="submitWaiver">
          <!-- Quick Lookup for Returning Parents -->
          <div class="p-3 rounded-3 bg-light border mb-3">
            <label class="form-label small fw-bold text-dark mb-1">Sudah Pernah Mengisi Sebelumnya?</label>
            <div class="input-group input-group-sm">
              <input
                v-model.trim="lookupQuery"
                type="tel"
                class="form-control"
                placeholder="Ketik No. HP atau Kode Waiver..."
                @keyup.enter.prevent="lookupExisting"
              />
              <button
                type="button"
                class="btn btn-outline-primary fw-semibold"
                :disabled="lookingUp || !lookupQuery"
                @click="lookupExisting"
              >
                {{ lookingUp ? 'Mencari...' : 'Cek Data' }}
              </button>
            </div>
            <small v-if="lookupMsg" class="d-block mt-1 text-primary fw-medium" style="font-size: 11.5px;">
              {{ lookupMsg }}
            </small>
          </div>

          <div v-if="errorMsg" class="alert alert-danger py-2 px-3 small mb-3">
            {{ errorMsg }}
          </div>

          <!-- Data Orang Tua -->
          <div class="mb-3">
            <label class="form-label small fw-bold text-dark mb-1">Nama Lengkap Orang Tua / Pendamping <span class="text-danger">*</span></label>
            <input
              v-model.trim="form.parent_name"
              type="text"
              class="form-control"
              placeholder="Contoh: Ibu Rina / Bapak Andi"
              required
            />
          </div>

          <div class="row g-2 mb-3">
            <div class="col-7">
              <label class="form-label small fw-bold text-dark mb-1">Nomor WhatsApp / HP <span class="text-danger">*</span></label>
              <input
                v-model.trim="form.phone"
                type="tel"
                class="form-control font-monospace"
                placeholder="08123456789"
                required
              />
            </div>
            <div class="col-5">
              <label class="form-label small fw-bold text-dark mb-1">Email (Opsional)</label>
              <input
                v-model.trim="form.email"
                type="email"
                class="form-control"
                placeholder="email@gmail.com"
              />
            </div>
          </div>

          <!-- Daftar Nama Anak -->
          <div class="mb-3">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <label class="form-label small fw-bold text-dark m-0">
                Data Nama Anak (Tampil di Timer) <span class="text-danger">*</span>
              </label>
              <button
                type="button"
                class="btn btn-sm btn-outline-primary py-0 px-2 fw-semibold"
                style="font-size: 12px;"
                @click="addChildRow"
              >
                + Tambah Anak
              </button>
            </div>

            <div
              v-for="(child, index) in form.children"
              :key="index"
              class="d-flex gap-2 align-items-center mb-2"
            >
              <div class="flex-grow-1">
                <input
                  v-model.trim="child.name"
                  type="text"
                  class="form-control"
                  :placeholder="`Nama Panggilan / Lengkap Anak #${index + 1}`"
                  required
                />
              </div>
              <div style="width: 105px;">
                <div class="input-group">
                  <input
                    v-model.number="child.age"
                    type="number"
                    min="1"
                    max="17"
                    class="form-control text-center px-1"
                  />
                  <span class="input-group-text px-2 small">Thn</span>
                </div>
              </div>
              <button
                v-if="form.children.length > 1"
                type="button"
                class="btn btn-outline-danger btn-sm px-2"
                title="Hapus baris"
                @click="removeChildRow(index)"
              >
                ✕
              </button>
            </div>
          </div>

          <!-- Peraturan & Checkbox Persetujuan -->
          <div class="p-3 rounded-3 border bg-light mb-3" style="font-size: 12px;">
            <div class="fw-bold text-dark mb-1">Syarat &amp; Ketentuan Keselamatan Bermain (Waiver):</div>
            <ul class="mb-2 ps-3 text-secondary" style="line-height: 1.5;">
              <li>Anak wajib didampingi orang tua/wali dan memakai kaus kaki anti-slip selama di area bermain.</li>
              <li>Toleransi waktu keluar adalah 10 menit. Kelebihan waktu bermain di atas 10 menit dikenakan biaya tambahan 1 jam.</li>
              <li>Maksimal izin keluar-masuk (*re-entry*) ke toilet adalah 2 kali per tiket.</li>
              <li>Orang tua bertanggung jawab penuh atas kesehatan dan keselamatan anak selama bermain di area Playtopia.</li>
            </ul>

            <div class="form-check mt-2 pt-2 border-top">
              <input
                id="agree-waiver-check"
                v-model="form.agreed"
                class="form-check-input"
                type="checkbox"
                required
              />
              <label class="form-check-label fw-bold text-dark" for="agree-waiver-check" style="cursor: pointer;">
                Saya telah membaca dan menyetujui seluruh aturan keselamatan bermain di atas.
              </label>
            </div>
          </div>

          <button
            type="submit"
            class="btn btn-primary w-100 py-2 fw-bold shadow-sm"
            style="font-size: 15px; border-radius: 10px;"
            :disabled="submitting || !form.agreed"
          >
            {{ submitting ? 'Menyimpan Data...' : 'Simpan & Tampilkan QR Waiver' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { api } from '@/utils/posApi'
import QrImage from '@/components/PosLayout/QrImage.vue'
import PlaytopiaLogo from '@/assets/playtopia-logo.png'

const savedWaiver = ref(null)
const submitting = ref(false)
const lookingUp = ref(false)
const lookupQuery = ref('')
const lookupMsg = ref('')
const errorMsg = ref('')

const form = reactive({
  parent_name: '',
  phone: '',
  email: '',
  children: [{ name: '', age: 5 }],
  agreed: false
})

function addChildRow() {
  form.children.push({ name: '', age: 5 })
}

function removeChildRow(idx) {
  if (form.children.length > 1) {
    form.children.splice(idx, 1)
  }
}

async function lookupExisting() {
  if (!lookupQuery.value) return
  lookingUp.value = true
  lookupMsg.value = ''
  errorMsg.value = ''
  try {
    const res = await api(`/waivers/public/lookup?q=${encodeURIComponent(lookupQuery.value)}`, { auth: false })
    if (res.success && res.data) {
      savedWaiver.value = res.data
    } else {
      lookupMsg.value = 'Nomor HP belum terdaftar. Silakan isi form di bawah ini (cukup 1 kali).'
      if (/^\d+$/.test(lookupQuery.value)) {
        form.phone = lookupQuery.value
      }
    }
  } catch (err) {
    errorMsg.value = err.message || 'Gagal mengecek data waiver.'
  } finally {
    lookingUp.value = false
  }
}

function editCurrentWaiver() {
  if (!savedWaiver.value) return
  form.parent_name = savedWaiver.value.parent_name || ''
  form.phone = savedWaiver.value.phone || ''
  form.email = savedWaiver.value.email || ''
  form.children = Array.isArray(savedWaiver.value.children) && savedWaiver.value.children.length > 0
    ? savedWaiver.value.children.map(c => ({ name: c.name, age: c.age || 5 }))
    : [{ name: '', age: 5 }]
  form.agreed = true
  savedWaiver.value = null
}

function resetForm() {
  form.parent_name = ''
  form.phone = ''
  form.email = ''
  form.children = [{ name: '', age: 5 }]
  form.agreed = false
  lookupQuery.value = ''
  lookupMsg.value = ''
  errorMsg.value = ''
  savedWaiver.value = null
}

async function submitWaiver() {
  errorMsg.value = ''
  submitting.value = true
  try {
    const res = await api('/waivers/public', {
      method: 'POST',
      auth: false,
      body: {
        parent_name: form.parent_name,
        phone: form.phone,
        email: form.email,
        children: form.children,
        agreed: form.agreed
      }
    })
    if (res.success && res.data) {
      savedWaiver.value = res.data
    }
  } catch (err) {
    errorMsg.value = err.message || 'Gagal menyimpan registrasi waiver.'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.waiver-page {
  background: linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 50%, #fce7f3 100%);
}

.waiver-header {
  background: linear-gradient(135deg, #00364d 0%, #0284c7 100%);
}
</style>

