# Phase 5: Events Admin - Research

**Phase:** 5 - Events Admin CRUD
**Status:** RESEARCH COMPLETE

---

## 1. Nuxt UI Components Research

### UInputDate (DateTime Selection)

**Purpose:** Select date and time for event start/end.

**Key Props:**
| Prop | Type | Description |
|------|------|-------------|
| `modelValue` | `CalendarDateTime` | The selected date/time value |
| `granularity` | `"day" \| "hour" \| "minute" \| "second"` | Controls which time segments are shown |
| `hourCycle` | `12 \| 24` | Hour format (use `24` for Portugal) |
| `disabled` | `boolean` | Disable the input |
| `required` | `boolean` | Mark as required |
| `minValue` | `CalendarDateTime` | Minimum selectable date |
| `maxValue` | `CalendarDateTime` | Maximum selectable date |

**Usage Pattern (DateTime with minute granularity):**
```vue
<script setup lang="ts">
import { CalendarDateTime } from '@internationalized/date'

const startAt = shallowRef(new CalendarDateTime(2026, 2, 28, 10, 0))
</script>

<template>
  <UInputDate 
    v-model="startAt" 
    granularity="minute"
    :hour-cycle="24"
  />
</template>
```

**Notes:**
- Uses `@internationalized/date` package (included with Nuxt UI)
- `CalendarDateTime` for date + time, `CalendarDate` for date only
- Automatically respects locale from `UApp` component
- `granularity="minute"` shows day/month/year + hour/minute segments

---

## 2. Date Conversion Utilities

### ISO String ↔ CalendarDateTime

**From ISO String (database) to CalendarDateTime (form):**
```typescript
import { parseAbsoluteToLocal } from '@internationalized/date'

function isoToCalendarDateTime(isoString: string): CalendarDateTime {
  // parseAbsoluteToLocal handles timezone conversion
  const zoned = parseAbsoluteToLocal(isoString)
  return new CalendarDateTime(
    zoned.year,
    zoned.month,
    zoned.day,
    zoned.hour,
    zoned.minute,
    zoned.second
  )
}
```

**From CalendarDateTime (form) to ISO String (database):**
```typescript
import { getLocalTimeZone } from '@internationalized/date'

function calendarDateTimeToISO(dt: CalendarDateTime): string {
  // Convert to ZonedDateTime then to ISO
  const zoned = dt.toZoned(getLocalTimeZone())
  return zoned.toAbsoluteString() // Returns ISO 8601 string
}
```

**Alternative simpler approach using native Date:**
```typescript
// CalendarDateTime to ISO
function toISOString(dt: CalendarDateTime): string {
  return new Date(dt.year, dt.month - 1, dt.day, dt.hour, dt.minute).toISOString()
}

// ISO to CalendarDateTime
function fromISOString(iso: string): CalendarDateTime {
  const d = new Date(iso)
  return new CalendarDateTime(
    d.getFullYear(),
    d.getMonth() + 1,
    d.getDate(),
    d.getHours(),
    d.getMinutes()
  )
}
```

---

## 3. Database Operations

### Fetch Events (sorted by start_at)

```typescript
async function fetchAll() {
  const supabase = useSupabaseClient<Database>()
  
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('start_at', { ascending: true })
  
  if (error) throw error
  events.value = data ?? []
}
```

### Create Event

```typescript
async function create(event: {
  title: string
  description?: string | null
  location?: string | null
  start_at: string  // ISO string
  end_at: string    // ISO string
}) {
  const supabase = useSupabaseClient<Database>()
  
  const { error } = await supabase
    .from('events')
    .insert(event)
  
  if (error) throw error
  await fetchAll()
}
```

### Update Event

```typescript
async function update(id: string, event: {
  title?: string
  description?: string | null
  location?: string | null
  start_at?: string
  end_at?: string
}) {
  const supabase = useSupabaseClient<Database>()
  
  const { error } = await supabase
    .from('events')
    .update(event)
    .eq('id', id)
  
  if (error) throw error
  await fetchAll()
}
```

---

## 4. Form Validation Schema (Zod)

```typescript
import { z } from 'zod'

export const eventSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional().transform(v => v || null),
  location: z.string().optional().transform(v => v || null),
  startAt: z.any(), // CalendarDateTime - validated separately
  endAt: z.any(),   // CalendarDateTime - validated separately
}).refine(data => {
  // Custom validation: end must be after start
  if (data.startAt && data.endAt) {
    return data.endAt.compare(data.startAt) > 0
  }
  return true
}, {
  message: 'Data de fim deve ser posterior à data de início',
  path: ['endAt']
})
```

---

## 5. Date Display Formatting

```typescript
function formatEventDateTime(startAt: string, endAt: string): string {
  const start = new Date(startAt)
  const end = new Date(endAt)
  
  const dateOptions: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }
  
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }
  
  const dateStr = start.toLocaleDateString('pt-PT', dateOptions)
  const startTime = start.toLocaleTimeString('pt-PT', timeOptions)
  const endTime = end.toLocaleTimeString('pt-PT', timeOptions)
  
  return `${dateStr}, ${startTime} - ${endTime}`
}

// Output: "28 fev. 2026, 10:00 - 12:00"
```

---

## 6. Table Configuration

```typescript
const columns = [
  { accessorKey: 'title', header: 'Título' },
  { accessorKey: 'datetime', header: 'Data/Hora' },  // Custom formatted
  { accessorKey: 'location', header: 'Local' },
  { id: 'actions', header: '' }
]
```

---

## 7. Dependencies

- **@internationalized/date:** Already included with Nuxt UI
- **No additional packages needed**
