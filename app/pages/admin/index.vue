<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth'],
})
</script>

<template>
  <div>
    <div class="mb-8">
      <h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">
        Painel Administrativo
      </h1>
      <p class="text-gray-500 dark:text-gray-400 mt-1">
        Bem-vindo à área de gestão de escalas da Zion Lisboa
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <UCard>
        <template #header>
          <h2 class="font-medium text-gray-900 dark:text-gray-100">Funções</h2>
        </template>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Gerir funções disponíveis para voluntários
        </p>
        <template #footer>
          <UButton to="/admin/skills" variant="soft" size="sm">
            Ver Funções
          </UButton>
        </template>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="font-medium text-gray-900 dark:text-gray-100">Voluntários</h2>
        </template>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Gerir voluntários e suas competências
        </p>
        <template #footer>
          <UButton to="/admin/volunteers" variant="soft" size="sm">
            Ver Voluntários
          </UButton>
        </template>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="font-medium text-gray-900 dark:text-gray-100">Eventos</h2>
        </template>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Gerir eventos e cultos
        </p>
        <template #footer>
          <UButton to="/admin/events" variant="soft" size="sm">
            Ver Eventos
          </UButton>
        </template>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="font-medium text-gray-900 dark:text-gray-100">Escalas</h2>
        </template>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Atribuir voluntários a eventos
        </p>
        <template #footer>
          <UButton to="/admin/schedules" variant="soft" size="sm">
            Ver Escalas
          </UButton>
        </template>
      </UCard>
    </div>
  </div>
</template>
