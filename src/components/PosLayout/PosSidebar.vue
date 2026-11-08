<template>
  <div class="sidebar-wrapper">
    <nav
      :class="{ sidebar: true, sidebarStatic, sidebarOpened }"
      @mouseenter="sidebarMouseEnter"
      @mouseleave="sidebarMouseLeave"
    >
      <header class="logo">
        <router-link to="/app/pos" class="d-flex align-items-center justify-content-center w-100">
          <img
            :src="PlaytopiaLogo"
            alt="Playtopia Indonesia"
            class="brand-logo"
          />
        </router-link>
      </header>

      <h5 class="navTitle first">
        OPERASIONAL KASIR
      </h5>
      <ul class="nav">
        <NavLink
          :active-item="activeItem"
          header="Kasir POS"
          link="/app/pos"
          icon-img="sidebar/Outline/Bank.svg"
          index="pos"
          is-header
        />
        <NavLink
          :active-item="activeItem"
          header="Monitoring Pengunjung"
          link="/app/visitors"
          icon-img="sidebar/Outline/User.svg"
          index="visitors"
          is-header
        />
        <NavLink
          :active-item="activeItem"
          header="Closing Shift"
          link="/app/closing"
          icon-img="sidebar/Outline/Document.svg"
          index="closing"
          is-header
        />
      </ul>

      <h5 class="navTitle">
        HARDWARE & GATE
      </h5>
      <ul class="nav">
        <NavLink
          :active-item="activeItem"
          header="Simulator Gate"
          link="/app/simulator"
          icon-img="sidebar/Outline/Stack.svg"
          index="simulator"
          label="turnstile"
          label-color="warning"
          is-header
        />
      </ul>
    </nav>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useLayoutStore } from '@/stores/layout'
import isScreen from '@/core/screenHelper'
import NavLink from '@/components/Sidebar/NavLink/NavLink.vue'
import PlaytopiaLogo from '@/assets/playtopia-logo.png'

const layoutStore = useLayoutStore()

const sidebarStatic = computed(() => layoutStore.sidebarStatic)
const sidebarOpened = computed(() => !layoutStore.sidebarClose)
const activeItem = computed(() => layoutStore.sidebarActiveElement || '')

function sidebarMouseEnter() {
  if (!sidebarStatic.value && (isScreen('lg') || isScreen('xl'))) {
    layoutStore.switchSidebar(false)
  }
}

function sidebarMouseLeave() {
  if (!sidebarStatic.value && (isScreen('lg') || isScreen('xl'))) {
    layoutStore.switchSidebar(true)
    layoutStore.changeSidebarActive(null)
  }
}
</script>

<style src="../Sidebar/Sidebar.scss" lang="scss" scoped />

<style scoped>
.brand-logo {
  max-height: 42px;
  width: auto;
  object-fit: contain;
  transition: transform 0.2s ease;
}
.brand-logo:hover {
  transform: scale(1.04);
}
</style>
