export type VolunteerName =
  | 'Douglas'
  | 'Petterson'
  | 'Roger'
  | 'José'
  | 'Rafael'
  | 'Lobato'
  | 'Oseias'
  | 'Flávio'

export type SlotType =
  | 'fornalha'
  | 'flow-rise'
  | 'vox'
  | 'pa-manha'
  | 'streaming-manha'
  | 'cascais-pa'
  | 'pa-tarde'
  | 'streaming-tarde'
  | 'reuniao-maes'

export type SlotStatus = 'confirmed' | 'a-definir'

export interface VolunteerInSlot {
  name: VolunteerName
  isTraining?: boolean
}

export interface EscalaSlot {
  id: string
  date: string
  month: 'março' | 'abril' | 'maio'
  weekNum: number
  weekLabel: string
  slotType: SlotType
  slotName: string
  location: 'Lisboa' | 'Cascais'
  arrivalTime: string
  volunteers: VolunteerInSlot[]
  specialEvent?: string
  status: SlotStatus
  notes?: string
}

export const VOLUNTEER_ROLES: Record<VolunteerName, 'veteran' | 'novato'> = {
  Douglas: 'veteran',
  Petterson: 'veteran',
  Roger: 'veteran',
  José: 'veteran',
  Rafael: 'novato',
  Lobato: 'novato',
  Oseias: 'novato',
  Flávio: 'novato',
}

export const VOLUNTEER_COLORS: Record<VolunteerName, string> = {
  Douglas: 'bg-blue-100 text-blue-800 border-blue-200',
  Petterson: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Roger: 'bg-violet-100 text-violet-800 border-violet-200',
  José: 'bg-amber-100 text-amber-800 border-amber-200',
  Rafael: 'bg-red-100 text-red-800 border-red-200',
  Lobato: 'bg-pink-100 text-pink-800 border-pink-200',
  Oseias: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  Flávio: 'bg-cyan-100 text-cyan-800 border-cyan-200',
}

export const ALL_VOLUNTEERS: VolunteerName[] = [
  'Douglas', 'Petterson', 'Roger', 'José',
  'Rafael', 'Lobato', 'Oseias', 'Flávio',
]

export const SLOT_LABELS: Record<SlotType, string> = {
  'fornalha': 'Fornalha P.A',
  'flow-rise': 'Flow/Rise P.A',
  'vox': 'Vox P.A',
  'pa-manha': 'P.A Manhã',
  'streaming-manha': 'Streaming Manhã',
  'cascais-pa': 'Cascais P.A',
  'pa-tarde': 'P.A Tarde',
  'streaming-tarde': 'Streaming Tarde',
  'reuniao-maes': 'Reunião de Mães',
}

export interface Violation {
  severity: 'error' | 'warning'
  message: string
}

const NOVATO_RESTRICTED: SlotType[] = [
  'pa-manha', 'streaming-manha', 'cascais-pa',
  'pa-tarde', 'streaming-tarde', 'vox', 'reuniao-maes',
]

export function getViolations(slot: EscalaSlot): Violation[] {
  if (slot.status === 'a-definir' || slot.volunteers.length === 0) return []
  const violations: Violation[] = []
  const hasVeteran = slot.volunteers.some(v => VOLUNTEER_ROLES[v.name] === 'veteran')
  const hasNovato = slot.volunteers.some(v => VOLUNTEER_ROLES[v.name] === 'novato')

  if (hasNovato && !hasVeteran && NOVATO_RESTRICTED.includes(slot.slotType)) {
    const isMarch = slot.month === 'março'
    violations.push({
      severity: isMarch ? 'error' : 'warning',
      message: isMarch
        ? 'Março: novato não pode estar sozinho neste slot'
        : 'Novato sozinho — recomenda-se veterano',
    })
  }
  return violations
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const v = (name: VolunteerName): VolunteerInSlot => ({ name })
const t = (name: VolunteerName): VolunteerInSlot => ({ name, isTraining: true })

function s(
  id: string,
  date: string,
  month: EscalaSlot['month'],
  weekNum: number,
  weekLabel: string,
  slotType: SlotType,
  location: EscalaSlot['location'],
  arrivalTime: string,
  volunteers: VolunteerInSlot[],
  status: SlotStatus,
  specialEvent?: string,
  notes?: string,
): EscalaSlot {
  return {
    id,
    date,
    month,
    weekNum,
    weekLabel,
    slotType,
    slotName: SLOT_LABELS[slotType],
    location,
    arrivalTime,
    volunteers,
    status,
    specialEvent,
    notes,
  }
}

// ─── Schedule Data ────────────────────────────────────────────────────────────
export const ESCALA_INICIAL: EscalaSlot[] = [

  // ══════════════════════════════════════════════════════════
  // MARÇO
  // ══════════════════════════════════════════════════════════

  // Semana 0 — Dom 01/03 (sem Cascais, sem sexta/sábado)
  s('01-03-pa-manha',       '2026-03-01','março',0,'01/03','pa-manha',       'Lisboa','08:00',[v('Petterson')],           'confirmed'),
  s('01-03-stream-manha',   '2026-03-01','março',0,'01/03','streaming-manha', 'Lisboa','08:00',[v('Douglas')],             'confirmed',undefined,'▶ Escalado obrigatório'),
  s('01-03-pa-tarde',       '2026-03-01','março',0,'01/03','pa-tarde',        'Lisboa','15:00',[v('Roger')],               'confirmed'),
  s('01-03-stream-tarde',   '2026-03-01','março',0,'01/03','streaming-tarde', 'Lisboa','15:00',[v('José')],                'confirmed'),

  // Semana 1 — Sex 06/03 + Sáb 07/03 (Reunião de Mães) + Dom 08/03
  s('06-03-fornalha',       '2026-03-06','março',1,'06–08/03','fornalha',         'Lisboa','06:30',[t('Rafael')],               'confirmed'),
  s('07-03-rdm',            '2026-03-07','março',1,'06–08/03','reuniao-maes',     'Lisboa','09:00',[v('Roger')],              'confirmed','Reunião de Mães (compensação fev.)','Evento adicional — Flow/Rise e Vox continuam normalmente'),
  s('07-03-flow',           '2026-03-07','março',1,'06–08/03','flow-rise',        'Lisboa','15:30',[v('Petterson'),t('Oseias')], 'confirmed'),
  s('07-03-vox',            '2026-03-07','março',1,'06–08/03','vox',             'Lisboa','17:00',[v('José'),t('Lobato')],   'confirmed'),
  s('08-03-pa-manha',       '2026-03-08','março',1,'06–08/03','pa-manha',         'Lisboa','08:00',[v('Petterson'),t('Flávio')],'confirmed'),
  s('08-03-stream-manha',   '2026-03-08','março',1,'06–08/03','streaming-manha',  'Lisboa','08:00',[v('Douglas')],             'confirmed'),
  s('08-03-pa-tarde',       '2026-03-08','março',1,'06–08/03','pa-tarde',         'Lisboa','15:00',[v('Roger')],               'confirmed'),
  s('08-03-stream-tarde',   '2026-03-08','março',1,'06–08/03','streaming-tarde',  'Lisboa','15:00',[v('José')],                'confirmed'),

  // Semana 2 — Sex 13/03 + Sáb 14/03 + Dom 15/03 (Cascais começa; Douglas obrigatório; Rafael ❌ 13-15/03)
  s('13-03-fornalha',       '2026-03-13','março',2,'13–15/03','fornalha',        'Lisboa','06:30',[t('Lobato')],               'confirmed'),
  s('14-03-flow',           '2026-03-14','março',2,'13–15/03','flow-rise',       'Lisboa','15:30',[v('José'),t('Flávio')],    'confirmed'),
  s('14-03-vox',            '2026-03-14','março',2,'13–15/03','vox',            'Lisboa','17:00',[v('Petterson'),t('Oseias')],'confirmed'),
  s('15-03-pa-manha',       '2026-03-15','março',2,'13–15/03','pa-manha',        'Lisboa','08:00',[v('Roger'),t('Lobato')],   'confirmed',undefined,'Lobato: só manhã nos domingos'),
  s('15-03-stream-manha',   '2026-03-15','março',2,'13–15/03','streaming-manha', 'Lisboa','08:00',[v('Douglas')],             'confirmed',undefined,'▶ Escalado obrigatório em 15/03'),
  s('15-03-cascais',        '2026-03-15','março',2,'13–15/03','cascais-pa',      'Cascais','09:00',[v('Petterson')],          'confirmed',undefined,'Início dos cultos em Cascais'),
  s('15-03-pa-tarde',       '2026-03-15','março',2,'13–15/03','pa-tarde',        'Lisboa','15:00',[v('José')],                'confirmed'),
  s('15-03-stream-tarde',   '2026-03-15','março',2,'13–15/03','streaming-tarde', 'Lisboa','15:00',[],                         'a-definir',undefined,'Todos os veteranos ocupados (Cascais + manhã + tarde Lisboa)'),

  // Semana 3 — Sex 20/03 + Sáb 21/03 (Dunamis XP Porto) + Dom 22/03
  s('20-03-fornalha',       '2026-03-20','março',3,'20–22/03','fornalha',        'Lisboa','06:30',[t('Rafael')],               'confirmed'),
  s('21-03-flow',           '2026-03-21','março',3,'20–22/03','flow-rise',       'Lisboa','15:30',[],                          'a-definir','Dunamis XP Porto','A combinar com voluntários'),
  s('21-03-vox',            '2026-03-21','março',3,'20–22/03','vox',            'Lisboa','17:00',[],                          'a-definir','Dunamis XP Porto','A combinar com voluntários'),
  s('22-03-pa-manha',       '2026-03-22','março',3,'20–22/03','pa-manha',        'Lisboa','08:00',[v('José')],                 'confirmed'),
  s('22-03-stream-manha',   '2026-03-22','março',3,'20–22/03','streaming-manha', 'Lisboa','08:00',[v('Petterson')],            'confirmed'),
  s('22-03-cascais',        '2026-03-22','março',3,'20–22/03','cascais-pa',      'Cascais','09:00',[v('Roger')],               'confirmed'),
  s('22-03-pa-tarde',       '2026-03-22','março',3,'20–22/03','pa-tarde',        'Lisboa','15:00',[t('Flávio')],               'confirmed',undefined,'⚠️ Novato — veterano ausente (todos em Cascais/manhã/tarde)'),
  s('22-03-stream-tarde',   '2026-03-22','março',3,'20–22/03','streaming-tarde', 'Lisboa','15:00',[v('Douglas')],              'confirmed'),

  // Semana 4 — Sex 27/03 (Dunamis XP Lisboa) + Sáb 28/03 (Workshop) + Dom 29/03
  s('27-03-fornalha',       '2026-03-27','março',4,'27–29/03','fornalha',        'Lisboa','06:30',[],                          'a-definir','Dunamis XP Lisboa','A combinar com voluntários'),
  s('28-03-flow',           '2026-03-28','março',4,'27–29/03','flow-rise',       'Lisboa','15:30',[],                          'a-definir','Workshop Teologia (Isaac Felix)','A combinar com voluntários'),
  s('28-03-vox',            '2026-03-28','março',4,'27–29/03','vox',            'Lisboa','17:00',[],                          'a-definir','Workshop Teologia (Isaac Felix)','A combinar com voluntários'),
  s('29-03-pa-manha',       '2026-03-29','março',4,'27–29/03','pa-manha',        'Lisboa','08:00',[v('Roger')],                'confirmed'),
  s('29-03-stream-manha',   '2026-03-29','março',4,'27–29/03','streaming-manha', 'Lisboa','08:00',[v('Douglas')],              'confirmed'),
  s('29-03-cascais',        '2026-03-29','março',4,'27–29/03','cascais-pa',      'Cascais','09:00',[v('Petterson')],           'confirmed'),
  s('29-03-pa-tarde',       '2026-03-29','março',4,'27–29/03','pa-tarde',        'Lisboa','15:00',[v('José')],                 'confirmed'),
  s('29-03-stream-tarde',   '2026-03-29','março',4,'27–29/03','streaming-tarde', 'Lisboa','15:00',[],                          'a-definir',undefined,'Todos os veteranos ocupados (Cascais + 3 slots Lisboa)'),

  // ══════════════════════════════════════════════════════════
  // ABRIL
  // ══════════════════════════════════════════════════════════

  // Semana 5 — Sex 03/04 + Sáb 04/04 + Dom 05/04 (Ceia do Cordeiro)
  s('03-04-fornalha',       '2026-04-03','abril',5,'03–05/04','fornalha',        'Lisboa','06:30',[t('Rafael')],               'confirmed'),
  s('04-04-flow',           '2026-04-04','abril',5,'03–05/04','flow-rise',       'Lisboa','15:30',[v('Petterson')],             'confirmed'),
  s('04-04-vox',            '2026-04-04','abril',5,'03–05/04','vox',            'Lisboa','17:00',[v('Roger'),t('Lobato')],    'confirmed'),
  s('05-04-pa-manha',       '2026-04-05','abril',5,'03–05/04','pa-manha',        'Lisboa','08:00',[v('José')],                 'confirmed','Ceia do Cordeiro'),
  s('05-04-stream-manha',   '2026-04-05','abril',5,'03–05/04','streaming-manha', 'Lisboa','08:00',[v('Petterson')],            'confirmed','Ceia do Cordeiro'),
  s('05-04-cascais',        '2026-04-05','abril',5,'03–05/04','cascais-pa',      'Cascais','09:00',[v('Roger')],               'confirmed','Ceia do Cordeiro'),
  s('05-04-pa-tarde',       '2026-04-05','abril',5,'03–05/04','pa-tarde',        'Lisboa','15:00',[],                          'a-definir','Ceia do Cordeiro','Roger em Cascais — necessita veterano'),
  s('05-04-stream-tarde',   '2026-04-05','abril',5,'03–05/04','streaming-tarde', 'Lisboa','15:00',[v('Douglas')],              'confirmed','Ceia do Cordeiro'),

  // Semana 6 — Sex 10/04 + Sáb 11/04 + Dom 12/04 (Dia do Legado)
  s('10-04-fornalha',       '2026-04-10','abril',6,'10–12/04','fornalha',        'Lisboa','06:30',[t('Lobato')],               'confirmed'),
  s('11-04-flow',           '2026-04-11','abril',6,'10–12/04','flow-rise',       'Lisboa','15:30',[t('Flávio')],               'confirmed'),
  s('11-04-vox',            '2026-04-11','abril',6,'10–12/04','vox',            'Lisboa','17:00',[v('Petterson'),t('Oseias')],'confirmed'),
  s('12-04-pa-manha',       '2026-04-12','abril',6,'10–12/04','pa-manha',        'Lisboa','08:00',[v('Roger')],                'confirmed','Dia do Legado'),
  s('12-04-stream-manha',   '2026-04-12','abril',6,'10–12/04','streaming-manha', 'Lisboa','08:00',[v('Douglas')],              'confirmed','Dia do Legado'),
  s('12-04-cascais',        '2026-04-12','abril',6,'10–12/04','cascais-pa',      'Cascais','09:00',[v('Petterson')],           'confirmed','Dia do Legado'),
  s('12-04-pa-tarde',       '2026-04-12','abril',6,'10–12/04','pa-tarde',        'Lisboa','15:00',[v('José')],                 'confirmed','Dia do Legado'),
  s('12-04-stream-tarde',   '2026-04-12','abril',6,'10–12/04','streaming-tarde', 'Lisboa','15:00',[],                          'a-definir','Dia do Legado','Petterson em Cascais — necessita veterano'),

  // Semana 7 — Sex 17/04 + Sáb 18/04 (Dunamis XP Algarve) + Dom 19/04 (Dia do Legado)
  s('17-04-fornalha',       '2026-04-17','abril',7,'17–19/04','fornalha',        'Lisboa','06:30',[t('Rafael')],               'confirmed'),
  s('18-04-flow',           '2026-04-18','abril',7,'17–19/04','flow-rise',       'Lisboa','15:30',[],                          'a-definir','Dunamis XP Algarve','A combinar com voluntários'),
  s('18-04-vox',            '2026-04-18','abril',7,'17–19/04','vox',            'Lisboa','17:00',[],                          'a-definir','Dunamis XP Algarve','A combinar com voluntários'),
  s('19-04-pa-manha',       '2026-04-19','abril',7,'17–19/04','pa-manha',        'Lisboa','08:00',[v('José')],                 'confirmed','Dia do Legado'),
  s('19-04-stream-manha',   '2026-04-19','abril',7,'17–19/04','streaming-manha', 'Lisboa','08:00',[v('Petterson')],            'confirmed','Dia do Legado'),
  s('19-04-cascais',        '2026-04-19','abril',7,'17–19/04','cascais-pa',      'Cascais','09:00',[v('Roger')],               'confirmed','Dia do Legado'),
  s('19-04-pa-tarde',       '2026-04-19','abril',7,'17–19/04','pa-tarde',        'Lisboa','15:00',[],                          'a-definir','Dia do Legado','Roger em Cascais — necessita veterano'),
  s('19-04-stream-tarde',   '2026-04-19','abril',7,'17–19/04','streaming-tarde', 'Lisboa','15:00',[v('Douglas')],              'confirmed','Dia do Legado'),

  // Semana 8 — Sex 24/04 + Sáb 25/04 (Reunião de Mães) + Dom 26/04
  s('24-04-fornalha',       '2026-04-24','abril',8,'24–26/04','fornalha',        'Lisboa','06:30',[t('Lobato')],               'confirmed'),
  s('25-04-rdm',            '2026-04-25','abril',8,'24–26/04','reuniao-maes',    'Lisboa','09:00',[v('José'),t('Rafael')],     'confirmed','Reunião de Mães'),
  s('25-04-flow',           '2026-04-25','abril',8,'24–26/04','flow-rise',       'Lisboa','15:30',[t('Flávio')],               'confirmed'),
  s('25-04-vox',            '2026-04-25','abril',8,'24–26/04','vox',            'Lisboa','17:00',[v('Petterson'),t('Oseias')],'confirmed'),
  s('26-04-pa-manha',       '2026-04-26','abril',8,'24–26/04','pa-manha',        'Lisboa','08:00',[v('Roger')],                'confirmed'),
  s('26-04-stream-manha',   '2026-04-26','abril',8,'24–26/04','streaming-manha', 'Lisboa','08:00',[v('Douglas')],              'confirmed'),
  s('26-04-cascais',        '2026-04-26','abril',8,'24–26/04','cascais-pa',      'Cascais','09:00',[v('Petterson')],           'confirmed'),
  s('26-04-pa-tarde',       '2026-04-26','abril',8,'24–26/04','pa-tarde',        'Lisboa','15:00',[v('José')],                 'confirmed'),
  s('26-04-stream-tarde',   '2026-04-26','abril',8,'24–26/04','streaming-tarde', 'Lisboa','15:00',[],                          'a-definir',undefined,'Petterson em Cascais — necessita veterano'),

  // ══════════════════════════════════════════════════════════
  // MAIO
  // ══════════════════════════════════════════════════════════

  // Semana 9 — Sex 01/05 + Sáb 02/05 + Dom 03/05
  s('01-05-fornalha',       '2026-05-01','maio',9,'01–03/05','fornalha',        'Lisboa','06:30',[t('Lobato')],               'confirmed'),
  s('02-05-flow',           '2026-05-02','maio',9,'01–03/05','flow-rise',       'Lisboa','15:30',[v('Petterson')],             'confirmed'),
  s('02-05-vox',            '2026-05-02','maio',9,'01–03/05','vox',            'Lisboa','17:00',[v('Roger'),t('Lobato')],    'confirmed'),
  s('03-05-pa-manha',       '2026-05-03','maio',9,'01–03/05','pa-manha',        'Lisboa','08:00',[v('José')],                 'confirmed'),
  s('03-05-stream-manha',   '2026-05-03','maio',9,'01–03/05','streaming-manha', 'Lisboa','08:00',[v('Petterson')],            'confirmed'),
  s('03-05-cascais',        '2026-05-03','maio',9,'01–03/05','cascais-pa',      'Cascais','09:00',[v('Roger')],               'confirmed'),
  s('03-05-pa-tarde',       '2026-05-03','maio',9,'01–03/05','pa-tarde',        'Lisboa','15:00',[],                          'a-definir',undefined,'Roger em Cascais — necessita veterano'),
  s('03-05-stream-tarde',   '2026-05-03','maio',9,'01–03/05','streaming-tarde', 'Lisboa','15:00',[v('Douglas')],              'confirmed'),

  // Semana 10 — Sex 08/05 + Sáb 09/05 (Voz de Sião) + Dom 10/05 (Voz de Sião)
  s('08-05-fornalha',       '2026-05-08','maio',10,'08–10/05','fornalha',        'Lisboa','06:30',[t('Rafael')],               'confirmed'),
  s('09-05-flow',           '2026-05-09','maio',10,'08–10/05','flow-rise',       'Lisboa','15:30',[t('Flávio')],               'confirmed','Voz de Sião'),
  s('09-05-vox',            '2026-05-09','maio',10,'08–10/05','vox',            'Lisboa','17:00',[v('Petterson'),t('Oseias')],'confirmed','Voz de Sião'),
  s('10-05-pa-manha',       '2026-05-10','maio',10,'08–10/05','pa-manha',        'Lisboa','08:00',[v('Roger')],                'confirmed','Voz de Sião'),
  s('10-05-stream-manha',   '2026-05-10','maio',10,'08–10/05','streaming-manha', 'Lisboa','08:00',[v('Douglas')],              'confirmed','Voz de Sião'),
  s('10-05-cascais',        '2026-05-10','maio',10,'08–10/05','cascais-pa',      'Cascais','09:00',[v('Petterson')],           'confirmed','Voz de Sião'),
  s('10-05-pa-tarde',       '2026-05-10','maio',10,'08–10/05','pa-tarde',        'Lisboa','15:00',[v('José')],                 'confirmed','Voz de Sião'),
  s('10-05-stream-tarde',   '2026-05-10','maio',10,'08–10/05','streaming-tarde', 'Lisboa','15:00',[],                          'a-definir','Voz de Sião','Petterson em Cascais — necessita veterano'),

  // Semana 11 — Sex 15/05 + Sáb 16/05 + Dom 17/05
  s('15-05-fornalha',       '2026-05-15','maio',11,'15–17/05','fornalha',        'Lisboa','06:30',[t('Lobato')],               'confirmed'),
  s('16-05-flow',           '2026-05-16','maio',11,'15–17/05','flow-rise',       'Lisboa','15:30',[v('Petterson')],             'confirmed'),
  s('16-05-vox',            '2026-05-16','maio',11,'15–17/05','vox',            'Lisboa','17:00',[v('Roger'),t('Lobato')],    'confirmed'),
  s('17-05-pa-manha',       '2026-05-17','maio',11,'15–17/05','pa-manha',        'Lisboa','08:00',[v('José')],                 'confirmed'),
  s('17-05-stream-manha',   '2026-05-17','maio',11,'15–17/05','streaming-manha', 'Lisboa','08:00',[v('Petterson')],            'confirmed'),
  s('17-05-cascais',        '2026-05-17','maio',11,'15–17/05','cascais-pa',      'Cascais','09:00',[v('Roger')],               'confirmed'),
  s('17-05-pa-tarde',       '2026-05-17','maio',11,'15–17/05','pa-tarde',        'Lisboa','15:00',[],                          'a-definir',undefined,'Roger em Cascais — necessita veterano'),
  s('17-05-stream-tarde',   '2026-05-17','maio',11,'15–17/05','streaming-tarde', 'Lisboa','15:00',[v('Douglas')],              'confirmed'),

  // Semana 12 — Sex 22/05 + Sáb 23/05 + Dom 24/05
  s('22-05-fornalha',       '2026-05-22','maio',12,'22–24/05','fornalha',        'Lisboa','06:30',[t('Rafael')],               'confirmed'),
  s('23-05-flow',           '2026-05-23','maio',12,'22–24/05','flow-rise',       'Lisboa','15:30',[t('Flávio')],               'confirmed'),
  s('23-05-vox',            '2026-05-23','maio',12,'22–24/05','vox',            'Lisboa','17:00',[v('Petterson'),t('Oseias')],'confirmed'),
  s('24-05-pa-manha',       '2026-05-24','maio',12,'22–24/05','pa-manha',        'Lisboa','08:00',[v('Roger')],                'confirmed'),
  s('24-05-stream-manha',   '2026-05-24','maio',12,'22–24/05','streaming-manha', 'Lisboa','08:00',[v('Douglas')],              'confirmed'),
  s('24-05-cascais',        '2026-05-24','maio',12,'22–24/05','cascais-pa',      'Cascais','09:00',[v('Petterson')],           'confirmed'),
  s('24-05-pa-tarde',       '2026-05-24','maio',12,'22–24/05','pa-tarde',        'Lisboa','15:00',[v('José')],                 'confirmed'),
  s('24-05-stream-tarde',   '2026-05-24','maio',12,'22–24/05','streaming-tarde', 'Lisboa','15:00',[],                          'a-definir',undefined,'Petterson em Cascais — necessita veterano'),

  // Semana 13 — Sex 29/05 + Sáb 30/05 (Reunião de Mães) + Dom 31/05
  s('29-05-fornalha',       '2026-05-29','maio',13,'29–31/05','fornalha',        'Lisboa','06:30',[t('Lobato')],               'confirmed'),
  s('30-05-rdm',            '2026-05-30','maio',13,'29–31/05','reuniao-maes',    'Lisboa','09:00',[v('José'),t('Rafael')],     'confirmed','Reunião de Mães'),
  s('30-05-flow',           '2026-05-30','maio',13,'29–31/05','flow-rise',       'Lisboa','15:30',[v('Petterson')],             'confirmed'),
  s('30-05-vox',            '2026-05-30','maio',13,'29–31/05','vox',            'Lisboa','17:00',[v('Roger'),t('Lobato')],    'confirmed'),
  s('31-05-pa-manha',       '2026-05-31','maio',13,'29–31/05','pa-manha',        'Lisboa','08:00',[v('José')],                 'confirmed'),
  s('31-05-stream-manha',   '2026-05-31','maio',13,'29–31/05','streaming-manha', 'Lisboa','08:00',[v('Petterson')],            'confirmed'),
  s('31-05-cascais',        '2026-05-31','maio',13,'29–31/05','cascais-pa',      'Cascais','09:00',[v('Roger')],               'confirmed'),
  s('31-05-pa-tarde',       '2026-05-31','maio',13,'29–31/05','pa-tarde',        'Lisboa','15:00',[],                          'a-definir',undefined,'Roger em Cascais — necessita veterano'),
  s('31-05-stream-tarde',   '2026-05-31','maio',13,'29–31/05','streaming-tarde', 'Lisboa','15:00',[v('Douglas')],              'confirmed'),
]
