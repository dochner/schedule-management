<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({
  layout: 'default',
})

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Palavra-passe obrigatória'),
})
type LoginSchema = z.output<typeof schema>

const state = reactive<Partial<LoginSchema>>({
  email: undefined,
  password: undefined,
})

const loading = ref(false)
const errorMessage = ref<string | null>(null)

const supabase = useSupabaseClient()
const user = useSupabaseUser()

// Redirect to admin if already logged in
watch(user, (newUser) => {
  if (newUser) {
    navigateTo('/admin')
  }
}, { immediate: true })

async function onSubmit(event: FormSubmitEvent<LoginSchema>) {
  loading.value = true
  errorMessage.value = null

  const { error } = await supabase.auth.signInWithPassword({
    email: event.data.email,
    password: event.data.password,
  })

  loading.value = false

  if (error) {
    errorMessage.value = 'Email ou palavra-passe inválidos'
    return
  }

  await navigateTo('/admin')
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
    <UCard class="w-full max-w-sm">
      <template #header>
        <div class="text-center">
          <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Área Administrativa
          </h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Zion Lisboa
          </p>
        </div>
      </template>

      <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <UFormField label="Email" name="email">
          <UInput
            v-model="state.email"
            type="email"
            placeholder="admin@exemplo.com"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Palavra-passe" name="password">
          <UInput
            v-model="state.password"
            type="password"
            placeholder="••••••••"
            class="w-full"
          />
        </UFormField>

        <p v-if="errorMessage" class="text-sm text-red-500 dark:text-red-400">
          {{ errorMessage }}
        </p>

        <UButton type="submit" :loading="loading" block class="w-full">
          Entrar
        </UButton>
      </UForm>
    </UCard>
  </div>
</template>
