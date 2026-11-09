<template>
  <div class="pt-roles-page">
    <!-- Top Page Bar -->
    <div class="pt-page-bar d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
      <div>
        <h5 class="mb-0 fw-semibold text-dark">
          {{ activeTab === 'menus' ? 'Struktur Navigasi Menu' : 'Manajemen Role, Hak Akses Menu & Pengguna' }}
        </h5>
        <div class="text-muted" style="font-size: 12.5px;">
          {{
            activeTab === 'menus'
              ? 'Pengaturan urutan, label, dan status aktif modul navigasi'
              : 'Kelola grup role dinamis, matriks otorisasi modul menu, dan penempatan akun pengguna dalam satu tampilan'
          }}
        </div>
      </div>

      <div class="d-flex flex-wrap align-items-center gap-2">
        <button
          v-if="activeTab === 'matrix'"
          type="button"
          class="pt-btn-primary"
          @click="openCreateRoleModal"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Tambah Role Baru
        </button>

        <button
          type="button"
          class="pt-btn-outline"
          :class="{ 'active-tab': activeTab === 'matrix' }"
          @click="activeTab = 'matrix'"
        >
          Matriks Role &amp; Akses ({{ roles.length }})
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

    <!-- Tab: RBAC Matrix -->
    <div v-if="activeTab === 'matrix'" class="row g-3">
      <!-- Role Selector Cards -->
      <div class="col-12">
        <div class="row g-3">
          <div
            v-for="r in roles"
            :key="r.id"
            class="col-md-6 col-xl-4"
          >
            <div
              class="pt-role-card h-100 d-flex flex-column justify-content-between"
              :class="{ active: selectedRoleId === r.id }"
              role="button"
              tabindex="0"
              @click="selectedRoleId = r.id"
            >
              <div>
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <div class="d-flex align-items-center gap-2">
                    <span class="pt-tag">Role #{{ r.id }}</span>
                    <span
                      class="pt-role-type-badge"
                      :class="isSystemRole(r) ? 'system' : 'custom'"
                    >
                      {{ isSystemRole(r) ? 'Sistem' : 'Custom' }}
                    </span>
                  </div>

                  <div class="d-flex align-items-center gap-1" @click.stop>
                    <button
                      type="button"
                      class="pt-icon-btn"
                      title="Ubah Informasi Role"
                      @click="openEditRoleModal(r)"
                    >
                      <svg width="13.5" height="13.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                      </svg>
                    </button>
                    <button
                      v-if="!isSystemRole(r)"
                      type="button"
                      class="pt-icon-btn danger"
                      title="Hapus Role Custom"
                      @click="confirmDeleteRole(r)"
                    >
                      <svg width="13.5" height="13.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div class="fw-semibold text-dark" style="font-size: 15px;">
                  {{ formatRoleDisplayName(r) }}
                </div>
                <div class="text-muted mt-1" style="font-size: 12px; line-height: 1.45;">
                  {{ r.description || '-' }}
                </div>
              </div>

              <div class="pt-role-metrics d-flex align-items-center justify-content-between mt-3 pt-2">
                <div class="d-flex align-items-center gap-1 text-muted" style="font-size: 12px;">
                  <svg width="13.5" height="13.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
                  </svg>
                  <span><strong class="text-dark">{{ countEnabledMenus(r.id) }}</strong> / {{ menus.length }} Modul</span>
                </div>

                <div class="d-flex align-items-center gap-1 text-muted" style="font-size: 12px;">
                  <svg width="13.5" height="13.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <span><strong class="text-dark">{{ countUsersInRole(r.id) }}</strong> Pengguna</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Menu permissions -->
      <div class="col-lg-8">
        <div class="pt-panel h-100">
          <div class="pt-panel-header d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div>
              <div class="fw-semibold text-dark">
                Matriks Modul Menu — Role: {{ selectedRole ? formatRoleDisplayName(selectedRole) : '-' }}
              </div>
              <div class="text-muted" style="font-size: 12px;">
                Centang modul yang diizinkan untuk diakses oleh pengguna dengan role ini
              </div>
            </div>

            <div class="d-flex flex-wrap gap-2">
              <button
                type="button"
                class="pt-btn-outline"
                style="padding: 5px 10px; font-size: 12px;"
                :disabled="saving"
                @click="toggleAllForRole(true)"
              >
                Pilih Semua Lihat
              </button>
              <button
                type="button"
                class="pt-btn-outline"
                style="padding: 5px 10px; font-size: 12px;"
                :disabled="saving"
                @click="toggleAllForRole(false)"
              >
                Kosongkan
              </button>
              <button
                type="button"
                class="pt-btn-primary"
                style="padding: 5px 13px; font-size: 12px;"
                :disabled="saving || !auth.can('system.roles', 'update')"
                @click="saveRolePermissions"
              >
                {{ saving ? 'Menyimpan...' : 'Simpan Hak Akses' }}
              </button>
            </div>
          </div>

          <div class="table-responsive">
            <table class="table pt-table align-middle mb-0">
              <thead>
                <tr>
                  <th style="min-width: 240px;">Modul / Grup Menu</th>
                  <th>Kode</th>
                  <th class="text-center" style="width: 72px;">Lihat</th>
                  <th class="text-center" style="width: 72px;">Tambah</th>
                  <th class="text-center" style="width: 72px;">Ubah</th>
                  <th class="text-center" style="width: 72px;">Hapus</th>
                  <th class="text-end" style="width: 90px;">Grup</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="group in groupedMenus" :key="group.id">
                  <tr class="pt-group-row">
                    <td class="fw-semibold text-dark">
                      {{ group.label }}
                    </td>
                    <td class="font-monospace text-muted" style="font-size: 11.5px;">{{ group.code }}</td>
                    <td class="text-center">
                      <input
                        v-if="permMap[group.id]"
                        v-model="permMap[group.id].can_read"
                        type="checkbox"
                        class="form-check-input"
                      >
                    </td>
                    <td class="text-center">
                      <input
                        v-if="permMap[group.id]"
                        v-model="permMap[group.id].can_create"
                        type="checkbox"
                        class="form-check-input"
                      >
                    </td>
                    <td class="text-center">
                      <input
                        v-if="permMap[group.id]"
                        v-model="permMap[group.id].can_update"
                        type="checkbox"
                        class="form-check-input"
                      >
                    </td>
                    <td class="text-center">
                      <input
                        v-if="permMap[group.id]"
                        v-model="permMap[group.id].can_delete"
                        type="checkbox"
                        class="form-check-input"
                      >
                    </td>
                    <td class="text-end">
                      <button
                        v-if="group.children.length > 0"
                        type="button"
                        class="pt-mini-link"
                        @click="toggleMenuGroup(group)"
                      >
                        {{ isGroupFullyRead(group) ? 'Batal Grup' : 'Pilih Grup' }}
                      </button>
                    </td>
                  </tr>

                  <tr v-for="child in group.children" :key="child.id">
                    <td class="ps-4 text-dark">
                      <div>{{ child.label }}</div>
                      <div class="font-monospace text-muted" style="font-size: 11px;">{{ child.route }}</div>
                    </td>
                    <td class="font-monospace text-muted" style="font-size: 11.5px;">{{ child.code }}</td>
                    <td class="text-center">
                      <input
                        v-if="permMap[child.id]"
                        v-model="permMap[child.id].can_read"
                        type="checkbox"
                        class="form-check-input"
                      >
                    </td>
                    <td class="text-center">
                      <input
                        v-if="permMap[child.id]"
                        v-model="permMap[child.id].can_create"
                        type="checkbox"
                        class="form-check-input"
                      >
                    </td>
                    <td class="text-center">
                      <input
                        v-if="permMap[child.id]"
                        v-model="permMap[child.id].can_update"
                        type="checkbox"
                        class="form-check-input"
                      >
                    </td>
                    <td class="text-center">
                      <input
                        v-if="permMap[child.id]"
                        v-model="permMap[child.id].can_delete"
                        type="checkbox"
                        class="form-check-input"
                      >
                    </td>
                    <td class="text-end">
                      <button
                        type="button"
                        class="pt-mini-link muted"
                        @click="toggleFullRowCrud(child.id)"
                      >
                        CRUD
                      </button>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Users in role -->
      <div class="col-lg-4">
        <div class="pt-panel h-100 d-flex flex-column">
          <div class="pt-panel-header d-flex justify-content-between align-items-center">
            <div>
              <div class="fw-semibold text-dark">
                Pengguna Role: {{ selectedRole?.name }}
              </div>
              <div class="text-muted" style="font-size: 12px;">
                Daftar akun yang memegang otorisasi role ini
              </div>
            </div>
            <span class="pt-tag">{{ usersInSelectedRole.length }} Akun</span>
          </div>

          <div class="p-3 border-bottom bg-light-subtle">
            <label class="form-label small fw-medium text-secondary mb-1">
              Masukkan Pengguna Lain ke Role {{ selectedRole?.name }}
            </label>
            <div class="d-flex gap-2">
              <select
                v-model="assignUserId"
                class="form-select form-select-sm"
                :disabled="usersOutsideSelectedRole.length === 0 || assigningUser"
              >
                <option value="">
                  {{
                    usersOutsideSelectedRole.length === 0
                      ? 'Semua user sudah di role ini'
                      : '-- Pilih akun pengguna --'
                  }}
                </option>
                <option
                  v-for="u in usersOutsideSelectedRole"
                  :key="u.id"
                  :value="u.id"
                >
                  {{ u.name }} ({{ u.role_name }})
                </option>
              </select>
              <button
                type="button"
                class="pt-btn-outline"
                style="padding: 5px 11px; font-size: 12px; white-space: nowrap;"
                :disabled="!assignUserId || assigningUser"
                @click="assignExistingUserToRole"
              >
                {{ assigningUser ? '...' : 'Masukkan' }}
              </button>
            </div>

            <button
              type="button"
              class="pt-btn-outline w-100 justify-content-center mt-2"
              style="padding: 6px 12px; font-size: 12.5px;"
              @click="openCreateUserInRoleModal"
            >
              <svg width="13.5" height="13.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" />
              </svg>
              Buat Akun Baru di Role {{ selectedRole?.name }}
            </button>
          </div>

          <!-- List of users currently assigned to this role -->
          <div class="p-3 flex-grow-1">
            <div
              v-if="usersInSelectedRole.length === 0"
              class="text-center text-muted py-4"
              style="font-size: 13px;"
            >
              Belum ada pengguna yang ditempatkan pada role <strong>{{ selectedRole?.name }}</strong>.
            </div>

            <div v-else class="d-flex flex-column gap-2">
              <div
                v-for="u in usersInSelectedRole"
                :key="u.id"
                class="pt-user-card d-flex align-items-center justify-content-between gap-2"
              >
                <div class="d-flex align-items-center gap-2 overflow-hidden">
                  <div class="pt-user-avatar">
                    {{ (u.name || 'U').charAt(0).toUpperCase() }}
                  </div>
                  <div class="overflow-hidden">
                    <div class="fw-semibold text-dark text-truncate" style="font-size: 13px;">
                      {{ u.name }}
                    </div>
                    <div class="text-muted text-truncate" style="font-size: 11.5px;">
                      {{ u.email }} · {{ u.outlet_name || 'Outlet #1' }}
                    </div>
                  </div>
                </div>

                <div class="d-flex align-items-center gap-2 flex-shrink-0">
                  <span
                    class="pt-status-pill"
                    :class="u.is_active ? 'active' : 'inactive'"
                  >
                    {{ u.is_active ? 'Aktif' : 'Nonaktif' }}
                  </span>

                  <select
                    class="form-select form-select-sm pt-role-move-select"
                    :value="u.role_id"
                    title="Pindahkan ke Role Lain"
                    @change="quickMoveUserRole(u, $event.target.value)"
                  >
                    <option v-for="rOpt in roles" :key="rOpt.id" :value="rOpt.id">
                      {{ rOpt.name }}
                    </option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <!-- Summary Footer -->
          <div class="px-3 py-2 border-top bg-light-subtle d-flex justify-content-between align-items-center" style="font-size: 12px;">
            <span class="text-muted">Alur Hirarki Otorisasi:</span>
            <span class="fw-medium text-dark">Modul Menu ⊂ Role {{ selectedRole?.name }} ⊂ {{ usersInSelectedRole.length }} User</span>
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

    <!-- MODAL 1: TAMBAH / UBAH ROLE -->
    <div v-if="roleModal.open" class="pt-modal-backdrop" @click.self="roleModal.open = false">
      <div class="pt-modal-dialog">
        <div class="pt-panel-header d-flex justify-content-between align-items-center">
          <span class="fw-semibold text-dark">
            {{ roleModal.isEdit ? `Ubah Role #${roleModal.id}` : 'Tambah Role Baru' }}
          </span>
          <button type="button" class="btn-close btn-sm" @click="roleModal.open = false" />
        </div>

        <form class="p-3" @submit.prevent="submitRoleModal">
          <div class="mb-3">
            <label class="form-label small fw-medium text-secondary">Nama Role</label>
            <input
              v-model="roleModal.name"
              type="text"
              class="form-control form-control-sm"
              placeholder="Contoh: Supervisor, Kasir Cafe, Auditor, Leader Gate"
              :disabled="roleModal.isEdit && roleModal.isSystem"
              required
            >
            <div v-if="roleModal.isEdit && roleModal.isSystem" class="text-muted mt-1" style="font-size: 11.5px;">
              Nama kode role bawaan sistem dikunci untuk menjaga kompatibilitas modul.
            </div>
          </div>

          <div class="mb-3">
            <label class="form-label small fw-medium text-secondary">Deskripsi Otorisasi</label>
            <input
              v-model="roleModal.description"
              type="text"
              class="form-control form-control-sm"
              placeholder="Contoh: Akses operasional supervisor, laporan harian, dan pembatalan tiket"
              required
            >
          </div>

          <div v-if="!roleModal.isEdit" class="mb-3">
            <label class="form-label small fw-medium text-secondary">
              Salin Template Hak Akses Awal (Opsional)
            </label>
            <select v-model="roleModal.cloneFromRoleId" class="form-select form-select-sm">
              <option :value="0">Default (Hanya Modul Dashboard)</option>
              <option v-for="r in roles" :key="r.id" :value="r.id">
                Salin dari Role {{ r.name }} ({{ countEnabledMenus(r.id) }} Modul)
              </option>
            </select>
          </div>

          <div class="d-flex justify-content-end gap-2 pt-2 border-top">
            <button type="button" class="pt-btn-outline" @click="roleModal.open = false">
              Batal
            </button>
            <button type="submit" class="pt-btn-primary" :disabled="roleModal.submitting">
              {{ roleModal.submitting ? 'Menyimpan...' : (roleModal.isEdit ? 'Simpan Perubahan' : 'Buat Role') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal: User -->
    <div v-if="userModal.open" class="pt-modal-backdrop" @click.self="userModal.open = false">
      <div class="pt-modal-dialog">
        <div class="pt-panel-header d-flex justify-content-between align-items-center">
          <span class="fw-semibold text-dark">
            Buat Pengguna Baru — Role: {{ selectedRole?.name }}
          </span>
          <button type="button" class="btn-close btn-sm" @click="userModal.open = false" />
        </div>

        <form class="p-3" @submit.prevent="submitCreateUserInRole">
          <div class="mb-2">
            <label class="form-label small fw-medium text-secondary">Nama Lengkap</label>
            <input
              v-model="userModal.name"
              type="text"
              class="form-control form-control-sm"
              placeholder="Contoh: Rina Supervisor"
              required
            >
          </div>

          <div class="mb-2">
            <label class="form-label small fw-medium text-secondary">Email Login</label>
            <input
              v-model="userModal.email"
              type="email"
              class="form-control form-control-sm"
              placeholder="rina@playtopia.id"
              required
            >
          </div>

          <div class="row g-2 mb-3">
            <div class="col-sm-6">
              <label class="form-label small fw-medium text-secondary">Password Awal</label>
              <input
                v-model="userModal.password"
                type="password"
                class="form-control form-control-sm"
                placeholder="Minimal 6 karakter"
                minlength="4"
                required
              >
            </div>
            <div class="col-sm-6">
              <label class="form-label small fw-medium text-secondary">Outlet Penempatan</label>
              <select v-model.number="userModal.outlet_id" class="form-select form-select-sm">
                <option v-for="o in outlets" :key="o.id" :value="o.id">
                  {{ o.name }}
                </option>
              </select>
            </div>
          </div>

          <div class="d-flex justify-content-end gap-2 pt-2 border-top">
            <button type="button" class="pt-btn-outline" @click="userModal.open = false">
              Batal
            </button>
            <button type="submit" class="pt-btn-primary" :disabled="userModal.submitting">
              {{ userModal.submitting ? 'Menyimpan...' : 'Buat & Masukkan ke Role' }}
            </button>
          </div>
        </form>
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
const users = ref([])
const outlets = ref([])

const selectedRoleId = ref(2)
const saving = ref(false)
const savingMenuId = ref(null)
const assigningUser = ref(false)
const assignUserId = ref('')
const feedback = ref(null)

const permMap = reactive({})

const roleModal = reactive({
  open: false,
  isEdit: false,
  isSystem: false,
  id: null,
  name: '',
  description: '',
  cloneFromRoleId: 3,
  submitting: false
})

const userModal = reactive({
  open: false,
  name: '',
  email: '',
  password: '',
  outlet_id: 1,
  submitting: false
})

const selectedRole = computed(() => roles.value.find(r => Number(r.id) === Number(selectedRoleId.value)))

const usersInSelectedRole = computed(() =>
  users.value.filter(u => Number(u.role_id) === Number(selectedRoleId.value))
)

const usersOutsideSelectedRole = computed(() =>
  users.value.filter(u => Number(u.role_id) !== Number(selectedRoleId.value))
)

const groupedMenus = computed(() => {
  const parents = menus.value.filter(m => !m.parent_id)
  return parents.map(p => ({
    ...p,
    children: menus.value.filter(c => c.parent_id === p.id)
  }))
})

function isSystemRole(role) {
  return Boolean(role?.is_system) || [1, 2, 3].includes(Number(role?.id))
}

function formatRoleDisplayName(role) {
  if (!role) return '-'
  if (role.name === 'Admin') return 'Administrator (Admin)'
  if (role.name === 'Client') return 'Owner / Client'
  if (role.name === 'Staff') return 'Staff / Kasir'
  return role.name
}

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
  assignUserId.value = ''
  syncPermMapForRole(newId)
})

watch(() => route.path, (p) => {
  activeTab.value = p.includes('/menus') ? 'menus' : 'matrix'
})

function countEnabledMenus(roleId) {
  return permissionsRaw.value.filter(
    p => Number(p.role_id) === Number(roleId) && Number(p.can_read) === 1
  ).length
}

function countUsersInRole(roleId) {
  return users.value.filter(u => Number(u.role_id) === Number(roleId)).length
}

function toggleAllForRole(val) {
  for (const m of menus.value) {
    if (permMap[m.id]) {
      permMap[m.id].can_read = val
      if (!val) {
        permMap[m.id].can_create = false
        permMap[m.id].can_update = false
        permMap[m.id].can_delete = false
      }
    }
  }
}

function isGroupFullyRead(group) {
  const ids = [group.id, ...group.children.map(c => c.id)]
  return ids.every(id => permMap[id]?.can_read)
}

function toggleMenuGroup(group) {
  const nextVal = !isGroupFullyRead(group)
  const ids = [group.id, ...group.children.map(c => c.id)]
  for (const id of ids) {
    if (permMap[id]) {
      permMap[id].can_read = nextVal
    }
  }
}

function toggleFullRowCrud(menuId) {
  const row = permMap[menuId]
  if (!row) return
  const allChecked = row.can_read && row.can_create && row.can_update && row.can_delete
  row.can_read = !allChecked
  row.can_create = !allChecked
  row.can_update = !allChecked
  row.can_delete = !allChecked
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
      users.value = res.data.users || []
      outlets.value = res.data.outlets?.length ? res.data.outlets : [{ id: 1, name: 'Playtopia Senayan Park' }]

      if (!roles.value.some(r => Number(r.id) === Number(selectedRoleId.value)) && roles.value.length > 0) {
        selectedRoleId.value = roles.value[0].id
      }
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
        text: `Hak akses modul untuk role "${selectedRole.value?.name}" berhasil disimpan.`
      }
    }
  } catch (err) {
    feedback.value = { type: 'danger', text: err.message }
  } finally {
    saving.value = false
  }
}

function openCreateRoleModal() {
  roleModal.isEdit = false
  roleModal.isSystem = false
  roleModal.id = null
  roleModal.name = ''
  roleModal.description = ''
  roleModal.cloneFromRoleId = selectedRoleId.value || 3
  roleModal.open = true
}

function openEditRoleModal(role) {
  roleModal.isEdit = true
  roleModal.isSystem = isSystemRole(role)
  roleModal.id = role.id
  roleModal.name = role.name
  roleModal.description = role.description || ''
  roleModal.open = true
}

async function submitRoleModal() {
  roleModal.submitting = true
  feedback.value = null
  try {
    if (roleModal.isEdit) {
      const res = await api(`/admin/roles/${roleModal.id}`, {
        method: 'PUT',
        body: {
          name: roleModal.name,
          description: roleModal.description
        }
      })
      roleModal.open = false
      await loadMatrix()
      feedback.value = { type: 'success', text: res.message || 'Role berhasil diperbarui.' }
    } else {
      const res = await api('/admin/roles', {
        method: 'POST',
        body: {
          name: roleModal.name,
          description: roleModal.description,
          clone_from_role_id: roleModal.cloneFromRoleId
        }
      })
      roleModal.open = false
      await loadMatrix()
      if (res.data?.id) {
        selectedRoleId.value = res.data.id
      }
      feedback.value = {
        type: 'success',
        text: `Role baru "${res.data?.name || roleModal.name}" berhasil dibuat. Silakan sesuaikan modul menu dan penggunanya.`
      }
    }
  } catch (err) {
    feedback.value = { type: 'danger', text: err.message }
  } finally {
    roleModal.submitting = false
  }
}

async function confirmDeleteRole(role) {
  const count = countUsersInRole(role.id)
  const msg = count > 0
    ? `Hapus role "${role.name}"? Terdapat ${count} pengguna di role ini yang akan dipindahkan otomatis ke role Staff.`
    : `Apakah Anda yakin ingin menghapus role "${role.name}"?`

  if (!window.confirm(msg)) return

  feedback.value = null
  try {
    const res = await api(`/admin/roles/${role.id}?fallback_role_id=3`, {
      method: 'DELETE'
    })
    if (Number(selectedRoleId.value) === Number(role.id)) {
      selectedRoleId.value = 2
    }
    await loadMatrix()
    feedback.value = { type: 'success', text: res.message || `Role "${role.name}" berhasil dihapus.` }
  } catch (err) {
    feedback.value = { type: 'danger', text: err.message }
  }
}

async function assignExistingUserToRole() {
  if (!assignUserId.value || !selectedRoleId.value) return
  assigningUser.value = true
  feedback.value = null
  try {
    const res = await api(`/admin/roles/${selectedRoleId.value}/assign-user`, {
      method: 'PUT',
      body: { user_id: Number(assignUserId.value) }
    })
    assignUserId.value = ''
    await loadMatrix()
    await auth.refreshMenus()
    feedback.value = { type: 'success', text: res.message }
  } catch (err) {
    feedback.value = { type: 'danger', text: err.message }
  } finally {
    assigningUser.value = false
  }
}

async function quickMoveUserRole(userRow, targetRoleId) {
  const newRoleId = Number(targetRoleId)
  if (!newRoleId || newRoleId === Number(userRow.role_id)) return
  feedback.value = null
  try {
    const res = await api(`/admin/roles/${newRoleId}/assign-user`, {
      method: 'PUT',
      body: { user_id: userRow.id }
    })
    await loadMatrix()
    await auth.refreshMenus()
    feedback.value = { type: 'success', text: res.message }
  } catch (err) {
    feedback.value = { type: 'danger', text: err.message }
  }
}

function openCreateUserInRoleModal() {
  userModal.name = ''
  userModal.email = ''
  userModal.password = ''
  userModal.outlet_id = outlets.value[0]?.id || 1
  userModal.open = true
}

async function submitCreateUserInRole() {
  userModal.submitting = true
  feedback.value = null
  try {
    await api('/admin/users', {
      method: 'POST',
      body: {
        name: userModal.name,
        email: userModal.email,
        password: userModal.password,
        role_id: selectedRoleId.value,
        outlet_id: userModal.outlet_id
      }
    })
    userModal.open = false
    await loadMatrix()
    feedback.value = {
      type: 'success',
      text: `Akun "${userModal.name}" berhasil dibuat dan langsung ditempatkan pada role ${selectedRole.value?.name}.`
    }
  } catch (err) {
    feedback.value = { type: 'danger', text: err.message }
  } finally {
    userModal.submitting = false
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
  max-width: 1440px;
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

.pt-btn-outline:hover:not(:disabled) {
  background: #f8fafc;
  color: #0284c7;
  border-color: #94a3b8;
}

.pt-btn-outline:disabled {
  opacity: 0.55;
  cursor: not-allowed;
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
  cursor: pointer;
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

.pt-role-metrics {
  border-top: 1px dashed #e2e8f0;
}

.pt-role-type-badge {
  font-size: 10.5px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 5px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.pt-role-type-badge.system {
  background: #f1f5f9;
  color: #475569;
}

.pt-role-type-badge.custom {
  background: #e0f2fe;
  color: #0369a1;
}

.pt-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: transparent;
  color: #64748b;
  transition: all 0.15s ease;
}

.pt-icon-btn:hover {
  background: #f1f5f9;
  color: #0f172a;
  border-color: #cbd5e1;
}

.pt-icon-btn.danger:hover {
  background: #fef2f2;
  color: #dc2626;
  border-color: #fecaca;
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
  padding: 2px 8px;
  border-radius: 6px;
}

.pt-table th {
  background: #f8fafc;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: #64748b;
  border-bottom: 1px solid #e2e8f0;
  padding: 10px 14px;
}

.pt-table td {
  padding: 9px 14px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 13px;
}

.pt-group-row td {
  background: #f8fafc;
}

.pt-mini-link {
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #0284c7;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 5px;
  transition: all 0.12s ease;
}

.pt-mini-link:hover {
  background: #e0f2fe;
  border-color: #7dd3fc;
}

.pt-mini-link.muted {
  color: #64748b;
  border-color: #e2e8f0;
}

.pt-mini-link.muted:hover {
  color: #0f172a;
  background: #f1f5f9;
}

.pt-user-card {
  padding: 9px 11px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
}

.pt-user-avatar {
  width: 30px;
  height: 30px;
  border-radius: 7px;
  background: #f1f5f9;
  color: #334155;
  font-size: 12.5px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.pt-status-pill {
  font-size: 10.5px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 5px;
}

.pt-status-pill.active {
  background: #dcfce7;
  color: #166534;
}

.pt-status-pill.inactive {
  background: #f1f5f9;
  color: #64748b;
}

.pt-role-move-select {
  width: auto;
  min-width: 96px;
  font-size: 11.5px;
  padding: 2px 22px 2px 7px;
  height: 26px;
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

.pt-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1055;
  padding: 16px;
}

.pt-modal-dialog {
  width: 100%;
  max-width: 460px;
  background: #ffffff;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 20px 25px -5px rgba(15, 23, 42, 0.15);
  overflow: hidden;
}
</style>
