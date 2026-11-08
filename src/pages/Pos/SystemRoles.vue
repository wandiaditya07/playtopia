<template>
  <div class="system-roles-page">
    <!-- Header -->
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 bg-white p-3 rounded-4 shadow-sm border">
      <div>
        <div class="d-flex align-items-center gap-2">
          <h4 class="mb-0 fw-bold text-dark">
            🛡️ Manajemen Role &amp; Pemisahan Grup Menu (RBAC)
          </h4>
          <span class="badge badge-play-sky">Real-Time Database</span>
        </div>
        <small class="text-muted">
          Atur hak akses (Read, Create, Update, Delete) setiap Role per Grup Menu. Perubahan langsung memperbarui menu sidebar secara dinamis.
        </small>
      </div>
      <div class="d-flex gap-2">
        <button
          type="button"
          class="btn btn-sm fw-bold"
          :class="activeTab === 'matrix' ? 'btn-play-sky' : 'btn-outline-primary'"
          @click="activeTab = 'matrix'"
        >
          🔐 Matriks Permission per Role
        </button>
        <button
          type="button"
          class="btn btn-sm fw-bold"
          :class="activeTab === 'menus' ? 'btn-play-pink' : 'btn-outline-primary'"
          @click="activeTab = 'menus'"
        >
          📂 Struktur Grup Menu ({{ menus.length }})
        </button>
      </div>
    </div>

    <div v-if="feedback" class="alert alert-dismissible mb-3" :class="'alert-' + feedback.type">
      <span>{{ feedback.text }}</span>
      <button type="button" class="btn-close" @click="feedback = null" />
    </div>

    <!-- TAB 1: ROLE PERMISSION MATRIX -->
    <div v-if="activeTab === 'matrix'" class="row g-3">
      <!-- Role Selector Cards -->
      <div class="col-12">
        <div class="row g-3">
          <div
            v-for="r in roles"
            :key="r.id"
            class="col-md-4"
          >
            <button
              type="button"
              class="card w-100 text-start p-3 transition-all"
              :class="selectedRoleId === r.id ? 'border-primary shadow-md bg-info-subtle' : 'bg-white'"
              style="border-width: 2px;"
              @click="selectedRoleId = r.id"
            >
              <div class="d-flex justify-content-between align-items-center mb-1">
                <span class="badge" :class="r.id === 2 ? 'badge-play-sky' : r.id === 1 ? 'badge-play-amber' : 'badge-play-pink'">
                  Role ID #{{ r.id }}
                </span>
                <span class="small fw-bold text-primary">
                  {{ countEnabledMenus(r.id) }} / {{ menus.length }} Menu Aktif
                </span>
              </div>
              <h5 class="fw-bold text-dark mb-1">
                {{ r.name === 'Admin' ? '🛡️ Admin (Konfigurasi Penuh)' : r.name === 'Client' ? '👑 Client / Owner (Bisnis & Laporan)' : '🧑‍💼 Staff / Kasir (Operasional POS)' }}
              </h5>
              <small class="text-muted">{{ r.description }}</small>
            </button>
          </div>
        </div>
      </div>

      <!-- Permission Matrix grouped by Menu Group -->
      <div class="col-12">
        <div class="card">
          <div class="card-header card-header-sky py-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div>
              <strong class="fs-6">
                Daftar Grup Menu &amp; Hak Akses untuk Role: {{ selectedRole?.name }}
              </strong>
            </div>
            <div class="d-flex gap-2">
              <button
                type="button"
                class="btn btn-sm btn-light fw-bold text-primary"
                :disabled="saving"
                @click="toggleAllForRole(true)"
              >
                ✓ Centang Semua Read
              </button>
              <button
                type="button"
                class="btn btn-sm btn-warning fw-bold text-dark shadow-sm"
                :disabled="saving || !auth.can('system.roles', 'update')"
                @click="saveRolePermissions"
              >
                <span v-if="saving" class="spinner-border spinner-border-sm me-1" />
                {{ saving ? 'Menyimpan...' : '💾 Simpan Permission Role Ini' }}
              </button>
            </div>
          </div>

          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th style="min-width: 260px;">Grup Menu / Modul</th>
                    <th>Kode Menu</th>
                    <th>Route URL</th>
                    <th class="text-center">👁️ Tampil (Read)</th>
                    <th class="text-center">➕ Tambah (Create)</th>
                    <th class="text-center">✏️ Ubah (Update)</th>
                    <th class="text-center">🗑️ Hapus (Delete)</th>
                  </tr>
                </thead>
                <tbody>
                  <template v-for="group in groupedMenus" :key="group.id">
                    <!-- Group Header Row -->
                    <tr class="table-info">
                      <td class="fw-bold text-dark">
                        📂 GRUP: {{ group.label }}
                      </td>
                      <td class="font-monospace small">{{ group.code }}</td>
                      <td class="font-monospace small text-muted">{{ group.route || '(Group Container)' }}</td>
                      <td class="text-center">
                        <input
                          v-model="permMap[group.id].can_read"
                          type="checkbox"
                          class="form-check-input"
                        >
                      </td>
                      <td class="text-center">
                        <input
                          v-model="permMap[group.id].can_create"
                          type="checkbox"
                          class="form-check-input"
                        >
                      </td>
                      <td class="text-center">
                        <input
                          v-model="permMap[group.id].can_update"
                          type="checkbox"
                          class="form-check-input"
                        >
                      </td>
                      <td class="text-center">
                        <input
                          v-model="permMap[group.id].can_delete"
                          type="checkbox"
                          class="form-check-input"
                        >
                      </td>
                    </tr>

                    <!-- Child Menu Rows -->
                    <tr
                      v-for="child in group.children"
                      :key="child.id"
                    >
                      <td class="ps-4">
                        <span class="text-primary me-1">↳</span>
                        <strong class="text-dark">{{ child.label }}</strong>
                      </td>
                      <td class="font-monospace small text-muted">{{ child.code }}</td>
                      <td class="font-monospace small text-primary">{{ child.route }}</td>
                      <td class="text-center">
                        <input
                          v-model="permMap[child.id].can_read"
                          type="checkbox"
                          class="form-check-input"
                        >
                      </td>
                      <td class="text-center">
                        <input
                          v-model="permMap[child.id].can_create"
                          type="checkbox"
                          class="form-check-input"
                        >
                      </td>
                      <td class="text-center">
                        <input
                          v-model="permMap[child.id].can_update"
                          type="checkbox"
                          class="form-check-input"
                        >
                      </td>
                      <td class="text-center">
                        <input
                          v-model="permMap[child.id].can_delete"
                          type="checkbox"
                          class="form-check-input"
                        >
                      </td>
                    </tr>
                  </template>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 2: STRUKTUR GRUP MENU -->
    <div v-else class="card">
      <div class="card-header card-header-pink py-3 d-flex justify-content-between align-items-center">
        <span class="fw-bold">📂 Pengaturan Label, Urutan &amp; Status Aktif Menu</span>
        <span class="badge bg-white text-danger">Tabel: menus</span>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>ID</th>
                <th>Tipe</th>
                <th>Label Menu</th>
                <th>Kode</th>
                <th>Urutan (Sort)</th>
                <th>Status Aktif</th>
                <th class="text-end">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in menus" :key="m.id">
                <td>#{{ m.id }}</td>
                <td>
                  <span class="badge" :class="m.is_group ? 'badge-play-sky' : 'badge-play-mint'">
                    {{ m.is_group ? 'GRUP INDUK' : 'SUB-MENU' }}
                  </span>
                </td>
                <td>
                  <input
                    v-model="m.label"
                    type="text"
                    class="form-control form-control-sm fw-bold"
                  >
                </td>
                <td class="font-monospace small">{{ m.code }}</td>
                <td style="width: 110px;">
                  <input
                    v-model.number="m.sort_order"
                    type="number"
                    class="form-control form-control-sm"
                  >
                </td>
                <td>
                  <div class="form-check form-switch">
                    <input
                      v-model="m.is_active_bool"
                      type="checkbox"
                      class="form-check-input"
                    >
                    <label class="form-check-label small">{{ m.is_active_bool ? 'Aktif' : 'Nonaktif' }}</label>
                  </div>
                </td>
                <td class="text-end">
                  <button
                    type="button"
                    class="btn btn-sm btn-play-sky"
                    :disabled="savingMenuId === m.id"
                    @click="saveMenuRow(m)"
                  >
                    {{ savingMenuId === m.id ? '...' : 'Simpan' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '@/utils/posApi'
import { usePosAuthStore } from '@/stores/posAuth'

const route = useRoute()
const auth = usePosAuthStore()

const activeTab = ref(route.path.includes('/menus') ? 'menus' : 'matrix')
const roles = ref([])
const menus = ref([])
const permissionsRaw = ref([])
const selectedRoleId = ref(2) // default Admin
const saving = ref(false)
const savingMenuId = ref(null)
const feedback = ref(null)

// Reactive map: { [menu_id]: { can_read, can_create, can_update, can_delete } }
const permMap = reactive({})

const selectedRole = computed(() => roles.value.find(r => r.id === selectedRoleId.value))

const groupedMenus = computed(() => {
  const parents = menus.value.filter(m => !m.parent_id)
  return parents.map(p => ({
    ...p,
    children: menus.value.filter(c => c.parent_id === p.id)
  }))
})

function syncPermMapForRole(roleId) {
  for (const m of menus.value) {
    const found = permissionsRaw.value.find(
      p => Number(p.role_id) === Number(roleId) && Number(p.menu_id) === Number(m.id)
    )
    permMap[m.id] = {
      can_read: found ? Boolean(found.can_read) : false,
      can_create: found ? Boolean(found.can_create) : false,
      can_update: found ? Boolean(found.can_update) : false,
      can_delete: found ? Boolean(found.can_delete) : false
    }
  }
}

watch(selectedRoleId, (newId) => {
  syncPermMapForRole(newId)
})

watch(() => route.path, (p) => {
  activeTab.value = p.includes('/menus') ? 'menus' : 'matrix'
})

function countEnabledMenus(roleId) {
  return permissionsRaw.value.filter(p => Number(p.role_id) === Number(roleId) && Number(p.can_read) === 1).length
}

function toggleAllForRole(val) {
  for (const m of menus.value) {
    if (permMap[m.id]) permMap[m.id].can_read = val
  }
}

async function loadMatrix() {
  try {
    const res = await api('/admin/roles-matrix')
    if (res.success && res.data) {
      roles.value = res.data.roles || []
      menus.value = (res.data.menus || []).map(m => ({
        ...m,
        is_active_bool: Boolean(m.is_active)
      }))
      permissionsRaw.value = res.data.permissions || []
      syncPermMapForRole(selectedRoleId.value)
    }
  } catch (err) {
    feedback.value = { type: 'danger', text: err.message || 'Gagal memuat matriks role.' }
  }
}

async function saveRolePermissions() {
  saving.value = true
  feedback.value = null
  try {
    const permissions = menus.value.map(m => ({
      menu_id: m.id,
      can_read: permMap[m.id]?.can_read ? 1 : 0,
      can_create: permMap[m.id]?.can_create ? 1 : 0,
      can_update: permMap[m.id]?.can_update ? 1 : 0,
      can_delete: permMap[m.id]?.can_delete ? 1 : 0
    }))

    const res = await api('/admin/roles-matrix', {
      method: 'PUT',
      body: {
        role_id: selectedRoleId.value,
        permissions
      }
    })

    if (res.success) {
      await loadMatrix()
      await auth.refreshMenus()
      feedback.value = {
        type: 'success',
        text: `Hak akses untuk role ${selectedRole.value?.name} berhasil disimpan & sidebar diperbarui!`
      }
    }
  } catch (err) {
    feedback.value = { type: 'danger', text: err.message }
  } finally {
    saving.value = false
  }
}

async function saveMenuRow(m) {
  savingMenuId.value = m.id
  try {
    await api(`/admin/menus/${m.id}`, {
      method: 'PUT',
      body: {
        label: m.label,
        icon: m.icon,
        sort_order: m.sort_order,
        is_active: m.is_active_bool ? 1 : 0
      }
    })
    await auth.refreshMenus()
    feedback.value = { type: 'success', text: `Menu "${m.label}" berhasil diperbarui.` }
  } catch (err) {
    feedback.value = { type: 'danger', text: err.message }
  } finally {
    savingMenuId.value = null
  }
}

onMounted(loadMatrix)
</script>
