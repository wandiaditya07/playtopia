<template>
  <div class="pt-app-shell" :class="{ 'pt-sidebar-collapsed': isCollapsed, 'pt-mobile-open': mobileOpen }">
    <!-- Mobile backdrop -->
    <div v-if="mobileOpen" class="pt-mobile-backdrop" @click="mobileOpen = false" />

    <!-- Sidebar -->
    <PosSidebar
      :collapsed="isCollapsed"
      @mouseenter-sidebar="onSidebarEnter"
      @mouseleave-sidebar="onSidebarLeave"
      @close-mobile="mobileOpen = false"
    />

    <!-- Main Wrapper -->
    <div class="pt-main-pane">
      <PosHeader
        :collapsed="isCollapsed"
        @toggle-mobile="mobileOpen = !mobileOpen"
      />

      <main class="pt-content-area">
        <router-view v-slot="{ Component }">
          <Transition name="pt-fade" mode="out-in">
            <component :is="Component" />
          </Transition>
        </router-view>
      </main>

      <footer class="pt-footer d-print-none">
        <span>&copy; 2026 <strong>Playtopia Indonesia</strong> — Playground &amp; Cafe Integrated POS</span>
        <span class="text-muted">Role aktif: <strong>{{ auth.user?.role || 'Staff' }}</strong></span>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { usePosAuthStore } from '@/stores/posAuth'
import PosSidebar from './PosSidebar.vue'
import PosHeader from './PosHeader.vue'

const auth = usePosAuthStore()
const isCollapsed = ref(true)
const mobileOpen = ref(false)

function toggleSidebar() {
  isCollapsed.value = !isCollapsed.value
}

function onSidebarEnter() {
  isCollapsed.value = false
}

function onSidebarLeave() {
  isCollapsed.value = true
}
</script>

<style scoped>
.pt-app-shell {
  display: flex;
  min-height: 100vh;
  width: 100%;
  background: #f8fafc;
  overflow-x: hidden;
}

.pt-main-pane {
  flex: 1 1 0%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.pt-content-area {
  flex: 1 1 auto;
  padding: 20px 24px;
  min-width: 0;
  width: 100%;
}

.pt-footer {
  padding: 12px 24px;
  font-size: 12px;
  color: #64748b;
  background: #ffffff;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.pt-mobile-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(2px);
  z-index: 1035;
}

.pt-fade-enter-active,
.pt-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.pt-fade-enter-from,
.pt-fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

@media (max-width: 991.98px) {
  .pt-content-area {
    padding: 14px;
  }
}
</style>
