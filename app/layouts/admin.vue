<script setup lang="ts">
const supabase = useSupabaseClient()
const user = useSupabaseUser()

async function logout() {
  await supabase.auth.signOut()
  await navigateTo('/admin/login')
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <header class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex items-center justify-between">
      <nav class="flex items-center gap-6">
        <NuxtLink to="/admin" class="font-semibold text-gray-900 dark:text-gray-100">
          Zion Lisboa
        </NuxtLink>
        <div class="flex items-center gap-4 text-sm">
          <NuxtLink
            to="/admin/skills"
            class="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          >
            Funções
          </NuxtLink>
          <NuxtLink
            to="/admin/volunteers"
            class="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          >
            Voluntários
          </NuxtLink>
          <NuxtLink
            to="/admin/events"
            class="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          >
            Eventos
          </NuxtLink>
          <NuxtLink
            to="/admin/schedules"
            class="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          >
            Escalas
          </NuxtLink>
        </div>
      </nav>
      <div class="flex items-center gap-4">
        <span v-if="user?.email" class="text-sm text-gray-500 dark:text-gray-400">
          {{ user.email }}
        </span>
        <UButton variant="ghost" size="sm" @click="logout">
          Sair
        </UButton>
      </div>
    </header>
    <main class="p-6">
      <slot />
    </main>
  </div>
</template>
