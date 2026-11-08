<template>
  <div class="system-users-page">
    <!-- Header -->
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 bg-white p-3 rounded-3 shadow-sm border">
      <div>
        <h5 class="mb-0 fw-bold text-dark">
          Manajemen Pengguna &amp; Penugasan Role
        </h5>
        <small class="text-muted">
          Kelola akun Admin, Owner (Client), dan Staff Kasir beserta penugasan outlet dan role grup menunya.
        </small>
      </div>
      <button
        type="button"
        class="btn btn-primary btn-sm fw-semibold"
        :disabled="!auth.can('system.users', 'create')"
        @click="openCreateModal"
      >
        + Tambah Akun Baru
      </button>
    </div>

    <div v-if="feedback" class="alert alert-dismissible mb-3" :class="'alert-' + feedback.type">
      <span>{{ feedback.text }}</span>
      <button type="button" class="btn-close" @click="feedback = null" />
    </div>

    <div class="card">
      <div class="card-header card-header-sky py-3 d-flex justify-content-between align-items-center">
        <span class="fw-bold">Daftar Akun Pengguna Playtopia ({{ users.length }})</span>
        <span class="badge bg-white text-primary">Tabel: users &amp; roles</span>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nama Lengkap</th>
                <th>Email Login</th>
                <th>Cabang Outlet</th>
                <th>Role Akses</th>
                <th>Status</th>
                <th>Login Terakhir</th>
                <th class="text-end">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="u in users" :key="u.id">
                <td>#{{ u.id }}</td>
                <td class="fw-bold text-dark">{{ u.name }}</td>
                <td class="font-monospace text-primary">{{ u.email }}</td>
                <td>{{ u.outlet_name || 'Playtopia Senayan Park' }}</td>
                <td>
                  <span
                    class="badge"
                    :class="u.role_name === 'Admin' ? 'badge-play-sky' : u.role_name === 'Client' ? 'badge-play-amber' : 'badge-play-pink'"
                  >
                    {{ u.role_name === 'Admin' ? 'Admin' : u.role_name === 'Client' ? 'Owner (Client)' : 'Kasir (Staff)' }}
                  </span>
                </td>
                <td>
                  <span class="badge" :class="u.is_active ? 'bg-success' : 'bg-secondary'">
                    {{ u.is_active ? 'AKTIF' : 'NONAKTIF' }}
                  </span>
                </td>
                <td class="small text-muted">{{ u.last_login_at ? fmtDateTime(u.last_login_at) : 'Belum pernah' }}</td>
                <td class="text-end">
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-primary"
                    @click="openEditModal(u)"
                  >
                    Edit Role / Akun
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal Form User -->
    <div v-if="showModal" class="pos-backdrop">
      <div class="card pos-dialog" style="max-width: 500px;">
        <div class="card-header card-header-sky py-3 d-flex justify-content-between align-items-center">
          <strong>{{ editingUser ? '✏️ Edit Pengguna' : '➕ Tambah Pengguna Baru' }}</strong>
          <button type="button" class="btn-close btn-close-white" @click="showModal = false" />
        </div>
        <div class="card-body">
          <div class="mb-3">
            <label class="form-label small fw-bold">Nama Lengkap</label>
            <input v-model.trim="form.name" type="text" class="form-control" placeholder="Nama lengkap">
          </div>
          <div class="mb-3">
            <label class="form-label small fw-bold">Email Login</label>
            <input
              v-model.trim="form.email"
              type="email"
              class="form-control"
              :disabled="!!editingUser"
              placeholder="nama@playtopia.id"
            >
          </div>
          <div class="row g-2 mb-3">
            <div class="col-sm-6">
              <label class="form-label small fw-bold">Pilih Role</label>
              <select v-model.number="form.role_id" class="form-select">
                <option v-for="r in roles" :key="r.id" :value="r.id">
                  {{ r.name }} ({{ r.description }})
                </option>
              </select>
            </div>
            <div class="col-sm-6">
              <label class="form-label small fw-bold">No. HP</label>
              <input v-model.trim="form.phone" type="text" class="form-control" placeholder="0812...">
            </div>
          </div>
          <div class="mb-3">
            <label class="form-label small fw-bold">
              Password {{ editingUser ? '(Kosongkan jika tidak diubah)' : '(Wajib min. 4 karakter)' }}
            </label>
            <input v-model="form.password" type="password" class="form-control" placeholder="••••••••">
          </div>
          <div v-if="editingUser" class="form-check form-switch mb-3">
            <input id="usr-active" v-model="form.is_active" type="checkbox" class="form-check-input">
            <label for="usr-active" class="form-check-label">Akun Aktif</label>
          </div>
          <div class="d-flex justify-content-end gap-2">
            <button type="button" class="btn btn-outline-secondary" @click="showModal = false">Batal</button>
            <button
              type="button"
              class="btn btn-play-sky fw-bold"
              :disabled="!canSubmitUser || saving"
              @click="submitUser"
            >
              {{ saving ? 'Menyimpan...' : '✓ Simpan Pengguna' }}
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
  phone: '',
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
  form.phone = ''
  form.role_id = 3
  form.password = ''
  form.is_active = true
  showModal.value = true
}

function openEditModal(u) {
  editingUser.value = u
  form.name = u.name
  form.email = u.email
  form.phone = u.phone || ''
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
          phone: form.phone,
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
          phone: form.phone,
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

