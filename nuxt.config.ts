// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: true },
  modules: [
    '@nuxt/ui',
    '@nuxtjs/supabase',
    '@pinia/nuxt',
    '@nuxt/eslint',
  ],
  css: ['~/assets/css/main.css'],
  supabase: {
    redirect: false,
    types: '~~/types/supabase.ts',
  },
})
