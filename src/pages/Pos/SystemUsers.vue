<template>
  <div class="pt-users-page">
    <!-- Top Page Bar -->
    <div class="pt-page-bar d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
      <div>
        <h5 class="mb-0 fw-semibold text-dark">Manajemen Pengguna</h5>
        <div class="text-muted" style="font-size: 12.5px;">
          Pengaturan akun pengguna, penugasan role akses, dan cabang outlet
        </div>
      </div>

      <div class="d-flex align-items-center gap-2">
        <button
          type="button"
          class="pt-btn-primary"
          :disabled="!auth.can('system.users', 'create')"
          @click="openCreateModal"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Tambah Pengguna</span>
        </button>

        <button
          type="button"
          class="pt-btn-outline"
          @click="loadUsers"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          <span>Refresh</span>
        </button>
      </div>
    </div>

    <div
      v-if="feedback"
      class="pt-alert mb-3 d-flex align-items-center justify-content-between"
      :class="feedback.type === 'danger' ? 'pt-alert-danger' : 'pt-alert-success'"
    >
      <span>{{ feedback.text }}</span>
      <button type="button" class="btn-close btn-sm" @click="feedback = null" />
    </div>

    <div class="pt-panel">
      <div class="pt-panel-header d-flex justify-content-between align-items-center">
        <span class="fw-semibold text-dark">Daftar Akun Pengguna</span>
        <span class="pt-tag">{{ users.length }} Akun</span>
      </div>
      <div class="table-responsive">
        <table class="table pt-table align-middle mb-0">
          <thead>
            <tr>
              <th style="width: 70px;">ID</th>
              <th>Nama Lengkap</th>
              <th>Email Login</th>
              <th>Cabang Outlet</th>
              <th>Role Akses</th>
              <th>Status</th>
              <th>Login Terakhir</th>
              <th class="text-end">Tindakan</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="users.length === 0">
              <td colspan="8" class="text-center text-muted py-4">Belum ada data pengguna.</td>
            </tr>
            <tr v-for="u in users" :key="u.id">
              <td class="text-muted">#{{ u.id }}</td>
              <td class="fw-medium text-dark">{{ u.name }}</td>
              <td class="font-monospace text-dark">{{ u.email }}</td>
              <td>{{ u.outlet_name || 'Playtopia Senayan Park' }}</td>
              <td>
                <span class="pt-dir-badge" :class="u.role_name === 'Admin' ? 'in' : 'out'">
                  {{ u.role_name === 'Admin' ? 'Administrator' : u.role_name === 'Client' ? 'Owner / Client' : 'Staff / Kasir' }}
                </span>
              </td>
              <td>
                <span class="pt-status-badge" :class="u.is_active ? 'allowed' : 'denied'">
                  {{ u.is_active ? 'Aktif' : 'Nonaktif' }}
                </span>
              </td>
              <td class="text-muted" style="font-size: 12.5px;">
                {{ u.last_login_at ? fmtDateTime(u.last_login_at) : 'Belum pernah' }}
              </td>
              <td class="text-end">
                <button
                  type="button"
                  class="pt-btn-outline"
                  style="padding: 5px 11px; font-size: 12px;"
                  @click="openEditModal(u)"
                >
                  Ubah
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal Form User -->
    <div v-if="showModal" class="pt-modal-backdrop">
      <div class="pt-panel" style="max-width: 480px; width: 100%;">
        <div class="pt-panel-header d-flex justify-content-between align-items-center">
          <span class="fw-semibold text-dark">{{ editingUser ? 'Ubah Data Pengguna' : 'Tambah Pengguna Baru' }}</span>
          <button type="button" class="btn-close btn-sm" @click="showModal = false" />
        </div>
        <div class="p-3">
          <div class="mb-3">
            <label class="form-label small fw-semibold">Nama Lengkap</label>
            <input v-model.trim="form.name" type="text" class="form-control" placeholder="Nama lengkap">
          </div>
          <div class="mb-3">
            <label class="form-label small fw-semibold">Email Login</label>
            <input
              v-model.trim="form.email"
              type="email"
              class="form-control"
              :disabled="!!editingUser"
              placeholder="nama@playtopia.id"
            >
          </div>
          <div class="mb-3">
            <label class="form-label small fw-semibold">Role Akses</label>
            <select v-model.number="form.role_id" class="form-select">
              <option v-for="r in roles" :key="r.id" :value="r.id">
                {{ r.name }} — {{ r.description }}
              </option>
            </select>
          </div>
          <div class="mb-3">
            <label class="form-label small fw-semibold">
              Kata Sandi {{ editingUser ? '(Kosongkan jika tidak diubah)' : '(Minimal 4 karakter)' }}
            </label>
            <input v-model="form.password" type="password" class="form-control" placeholder="••••••••">
          </div>
          <div v-if="editingUser" class="form-check form-switch mb-3">
            <input id="usr-active" v-model="form.is_active" type="checkbox" class="form-check-input">
            <label for="usr-active" class="form-check-label small fw-medium">Status Akun Aktif</label>
          </div>
          <div class="d-flex justify-content-end gap-2">
            <button type="button" class="pt-btn-outline" @click="showModal = false">Batal</button>
            <button
              type="button"
              class="pt-btn-primary"
              :disabled="!canSubmitUser || saving"
              @click="submitUser"
            >
              {{ saving ? 'Menyimpan...' : 'Simpan Pengguna' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { api } from '@/utils/posApi'
import { fmtDateTime } from '@/utils/format'
import { usePosAuthStore } from '@/stores/posAuth'

const auth = usePosAuthStore()

const users = ref([])
const roles = ref([])
const showModal = ref(false)
const editingUser = ref(null)
const saving = ref(false)
const feedback = ref(null)

const form = reactive({
  name: '',
  email: '',
  role_id: 3,
  password: '',
  is_active: true
})

const canSubmitUser = computed(() => {
  if (!form.name.trim() || !form.role_id) return false
  if (!editingUser.value && (!form.email.trim() || form.password.length < 4)) return false
  return true
})

async function loadUsers() {
  try {
    const res = await api('/admin/users')
    if (res.success && res.data) {
      users.value = res.data.users || []
      roles.value = res.data.roles || []
    }
  } catch (err) {
    feedback.value = { type: 'danger', text: err.message }
  }
}

function openCreateModal() {
  editingUser.value = null
  form.name = ''
  form.email = ''
  form.role_id = 3
  form.password = ''
  form.is_active = true
  showModal.value = true
}

function openEditModal(u) {
  editingUser.value = u
  form.name = u.name
  form.email = u.email
  form.role_id = Number(u.role_id)
  form.password = ''
  form.is_active = Boolean(u.is_active)
  showModal.value = true
}

async function submitUser() {
  if (!canSubmitUser.value || saving.value) return
  saving.value = true
  try {
    if (editingUser.value) {
      await api(`/admin/users/${editingUser.value.id}`, {
        method: 'PUT',
        body: {
          name: form.name,
          role_id: form.role_id,
          is_active: form.is_active,
          password: form.password || undefined
        }
      })
      feedback.value = { type: 'success', text: `Data pengguna ${form.name} berhasil diperbarui.` }
    } else {
      await api('/admin/users', {
        method: 'POST',
        body: {
          name: form.name,
          email: form.email,
          role_id: form.role_id,
          password: form.password
        }
      })
      feedback.value = { type: 'success', text: `Akun baru ${form.email} berhasil ditambahkan.` }
    }
    showModal.value = false
    await loadUsers()
  } catch (err) {
    feedback.value = { type: 'danger', text: err.message }
  } finally {
    saving.value = false
  }
}

onMounted(loadUsers)
</script>

<style scoped>
.pt-users-page {
  max-width: 1400px;
}

.pt-page-bar {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 14px 18px;
}

.pt-btn-outline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 13px;
  font-size: 13px;
  font-weight: 500;
  color: #334155;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  transition: all 0.15s ease;
}

.pt-btn-outline:hover {
  background: #f8fafc;
  color: #0284c7;
  border-color: #94a3b8;
}

.pt-btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  font-size: 13px;
  font-weight: 500;
  color: #ffffff;
  background: #0284c7;
  border: 1px solid #0284c7;
  border-radius: 8px;
  transition: all 0.15s ease;
}

.pt-btn-primary:hover:not(:disabled) {
  background: #0369a1;
}

.pt-btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.pt-alert {
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
}

.pt-alert-success {
  background: #f0fdf4;
  color: #166534;
  border: 1px solid #bbf7d0;
}

.pt-alert-danger {
  background: #fef2f2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

.pt-panel {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
}

.pt-panel-header {
  padding: 13px 18px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 14px;
}

.pt-tag {
  font-size: 11.5px;
  font-weight: 600;
  color: #475569;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  padding: 3px 9px;
  border-radius: 6px;
}

.pt-table th {
  background: #f8fafc;
  font-size: 11.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: #64748b;
  border-bottom: 1px solid #e2e8f0;
  padding: 11px 16px;
}

.pt-table td {
  padding: 11px 16px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 13px;
}

.pt-dir-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 5px;
}

.pt-dir-badge.in {
  background: #e0f2fe;
  color: #0369a1;
}

.pt-dir-badge.out {
  background: #f1f5f9;
  color: #334155;
}

.pt-status-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 5px;
}

.pt-status-badge.allowed {
  background: #dcfce7;
  color: #15803d;
}

.pt-status-badge.denied {
  background: #fee2e2;
  color: #b91c1c;
}

.pt-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1055;
  padding: 16px;
}
</style>
