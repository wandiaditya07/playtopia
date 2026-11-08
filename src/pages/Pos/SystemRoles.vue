<template>
  <div class="pt-roles-page">
    <!-- Top Page Bar -->
    <div class="pt-page-bar d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
      <div>
        <h5 class="mb-0 fw-semibold text-dark">
          {{ activeTab === 'menus' ? 'Struktur Menu' : 'Role & Hak Akses' }}
        </h5>
        <div class="text-muted" style="font-size: 12.5px;">
          {{
            activeTab === 'menus'
              ? 'Pengaturan urutan, label, dan status aktif modul navigasi'
              : 'Pengaturan otorisasi akses menu berdasarkan masing-masing role pengguna'
          }}
        </div>
      </div>

      <div class="d-flex flex-wrap align-items-center gap-2">
        <button
          type="button"
          class="pt-btn-outline"
          :class="{ 'active-tab': activeTab === 'matrix' }"
          @click="activeTab = 'matrix'"
        >
          Matriks Hak Akses
        </button>
        <button
          type="button"
          class="pt-btn-outline"
          :class="{ 'active-tab': activeTab === 'menus' }"
          @click="activeTab = 'menus'"
        >
          Struktur Menu ({{ menus.length }})
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
              class="pt-role-card w-100 text-start"
              :class="{ active: selectedRoleId === r.id }"
              @click="selectedRoleId = r.id"
            >
              <div class="d-flex justify-content-between align-items-center mb-1">
                <span class="pt-tag">Role #{{ r.id }}</span>
                <span class="text-muted" style="font-size: 12px;">
                  <strong class="text-dark">{{ countEnabledMenus(r.id) }}</strong> / {{ menus.length }} Modul
                </span>
              </div>
              <div class="fw-semibold text-dark" style="font-size: 14.5px;">
                {{ r.name === 'Admin' ? 'Administrator' : r.name === 'Client' ? 'Owner / Client' : 'Staff / Kasir' }}
              </div>
              <div class="text-muted mt-1" style="font-size: 12px;">{{ r.description }}</div>
            </button>
          </div>
        </div>
      </div>

      <!-- Permission Matrix Table -->
      <div class="col-12">
        <div class="pt-panel">
          <div class="pt-panel-header d-flex flex-wrap justify-content-between align-items-center gap-2">
            <span class="fw-semibold text-dark">
              Konfigurasi Hak Akses Role: {{ selectedRole?.name }}
            </span>

            <div class="d-flex gap-2">
              <button
                type="button"
                class="pt-btn-outline"
                style="padding: 5px 11px; font-size: 12px;"
                :disabled="saving"
                @click="toggleAllForRole(true)"
              >
                Pilih Semua Lihat
              </button>
              <button
                type="button"
                class="pt-btn-primary"
                style="padding: 5px 13px; font-size: 12px;"
                :disabled="saving || !auth.can('system.roles', 'update')"
                @click="saveRolePermissions"
              >
                {{ saving ? 'Menyimpan...' : 'Simpan Perubahan' }}
              </button>
            </div>
          </div>

          <div class="table-responsive">
            <table class="table pt-table align-middle mb-0">
              <thead>
                <tr>
                  <th style="min-width: 260px;">Modul / Grup Menu</th>
                  <th>Kode</th>
                  <th>Path URL</th>
                  <th class="text-center">Lihat</th>
                  <th class="text-center">Tambah</th>
                  <th class="text-center">Ubah</th>
                  <th class="text-center">Hapus</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="group in groupedMenus" :key="group.id">
                  <tr class="pt-group-row">
                    <td class="fw-semibold text-dark">{{ group.label }}</td>
                    <td class="font-monospace text-muted" style="font-size: 12px;">{{ group.code }}</td>
                    <td class="font-monospace text-muted" style="font-size: 12px;">{{ group.route || '-' }}</td>
                    <td class="text-center">
                      <input v-model="permMap[group.id].can_read" type="checkbox" class="form-check-input">
                    </td>
                    <td class="text-center">
                      <input v-model="permMap[group.id].can_create" type="checkbox" class="form-check-input">
                    </td>
                    <td class="text-center">
                      <input v-model="permMap[group.id].can_update" type="checkbox" class="form-check-input">
                    </td>
                    <td class="text-center">
                      <input v-model="permMap[group.id].can_delete" type="checkbox" class="form-check-input">
                    </td>
                  </tr>

                  <tr v-for="child in group.children" :key="child.id">
                    <td class="ps-4 text-dark">{{ child.label }}</td>
                    <td class="font-monospace text-muted" style="font-size: 12px;">{{ child.code }}</td>
                    <td class="font-monospace text-muted" style="font-size: 12px;">{{ child.route }}</td>
                    <td class="text-center">
                      <input v-model="permMap[child.id].can_read" type="checkbox" class="form-check-input">
                    </td>
                    <td class="text-center">
                      <input v-model="permMap[child.id].can_create" type="checkbox" class="form-check-input">
                    </td>
                    <td class="text-center">
                      <input v-model="permMap[child.id].can_update" type="checkbox" class="form-check-input">
                    </td>
                    <td class="text-center">
                      <input v-model="permMap[child.id].can_delete" type="checkbox" class="form-check-input">
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 2: STRUKTUR GRUP MENU -->
    <div v-else class="pt-panel">
      <div class="pt-panel-header d-flex justify-content-between align-items-center">
        <span class="fw-semibold text-dark">Daftar Modul &amp; Struktur Navigasi</span>
        <span class="pt-tag">{{ menus.length }} Modul</span>
      </div>
      <div class="table-responsive">
        <table class="table pt-table align-middle mb-0">
          <thead>
            <tr>
              <th style="width: 70px;">ID</th>
              <th style="width: 120px;">Tipe</th>
              <th>Nama Modul</th>
              <th>Kode</th>
              <th style="width: 110px;">Urutan</th>
              <th style="width: 140px;">Status</th>
              <th class="text-end" style="width: 110px;">Tindakan</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in menus" :key="m.id">
              <td class="text-muted">#{{ m.id }}</td>
              <td>
                <span class="pt-dir-badge" :class="m.is_group ? 'in' : 'out'">
                  {{ m.is_group ? 'GRUP' : 'MODUL' }}
                </span>
              </td>
              <td>
                <input
                  v-model="m.label"
                  type="text"
                  class="form-control form-control-sm fw-medium"
                >
              </td>
              <td class="font-monospace text-muted" style="font-size: 12px;">{{ m.code }}</td>
              <td>
                <input
                  v-model.number="m.sort_order"
                  type="number"
                  class="form-control form-control-sm"
                >
              </td>
              <td>
                <div class="form-check form-switch mb-0">
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
                  class="pt-btn-outline"
                  style="padding: 4px 10px; font-size: 12px;"
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
const selectedRoleId = ref(2)
const saving = ref(false)
const savingMenuId = ref(null)
const feedback = ref(null)

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
    feedback.value = { type: 'danger', text: err.message || 'Gagal memuat matriks hak akses.' }
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
        text: `Hak akses untuk role ${selectedRole.value?.name} berhasil diperbarui.`
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
    feedback.value = { type: 'success', text: `Modul "${m.label}" berhasil diperbarui.` }
  } catch (err) {
    feedback.value = { type: 'danger', text: err.message }
  } finally {
    savingMenuId.value = null
  }
}

onMounted(loadMatrix)
</script>

<style scoped>
.pt-roles-page {
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

.pt-btn-outline.active-tab {
  background: #e0f2fe;
  color: #0284c7;
  border-color: #7dd3fc;
  font-weight: 600;
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

.pt-role-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 14px 16px;
  transition: all 0.15s ease;
}

.pt-role-card:hover {
  border-color: #94a3b8;
}

.pt-role-card.active {
  border-color: #0284c7;
  background: #f8fdff;
  box-shadow: 0 0 0 2px rgba(2, 132, 199, 0.12);
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
  padding: 10px 16px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 13px;
}

.pt-group-row td {
  background: #f8fafc;
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
</style>
