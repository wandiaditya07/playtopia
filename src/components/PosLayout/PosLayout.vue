<template>
  <div
    :class="['root', 'sing-dashboard', { sidebarClose, sidebarStatic }, 'sidebar-' + sidebarColorName, 'sidebar-' + sidebarType, 'navbar-' + navbarColorName]"
  >
    <PosSidebar />
    <div class="wrap">
      <PosHeader />
      <div class="content">
        <router-view v-slot="{ Component }">
          <Transition
            name="router-animation"
            mode="out-in"
          >
            <component :is="Component" />
          </Transition>
        </router-view>
        <footer class="contentFooter">
          Playtopia POS - Playground &amp; Cafe
        </footer>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { useLayoutStore } from '@/stores/layout'
import PosSidebar from './PosSidebar.vue'
import PosHeader from './PosHeader.vue'

const layoutStore = useLayoutStore()

const sidebarClose = computed(() => layoutStore.sidebarClose)
const sidebarStatic = computed(() => layoutStore.sidebarStatic)
const sidebarColorName = computed(() => layoutStore.sidebarColorName)
const navbarColorName = computed(() => layoutStore.navbarColorName)
const sidebarType = computed(() => layoutStore.sidebarType)

function handleWindowResize() {
  if (window.innerWidth <= 768 && sidebarStatic.value) {
    layoutStore.toggleSidebar()
    layoutStore.changeSidebarActive(null)
  }
}

onMounted(() => {
  const staticSidebar = JSON.parse(localStorage.getItem('sidebarStatic'))
  if (staticSidebar) {
    layoutStore.sidebarStatic = true
  } else if (!sidebarClose.value) {
    setTimeout(() => {
      layoutStore.switchSidebar(true)
      layoutStore.changeSidebarActive(null)
    }, 2500)
  }
  handleWindowResize()
  window.addEventListener('resize', handleWindowResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleWindowResize)
})
</script>

<style src="../Layout/Layout.scss" lang="scss" />

