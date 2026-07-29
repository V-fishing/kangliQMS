/**
 * SPC — Alarms API
 * Controller: SpcAlarmController  (/api/v1/spc/alarms)
 *
 * Permissions:
 *   spc.alarm.list  — GET /
 *   spc.alarm.close — POST close, POST launch-8d
 */
import { request } from '@/api/client'
import type { SpcAlarm, CloseAlarmRequest } from '@/api/types/spc'

export const spcAlarmsApi = {
  list: () => request.get<SpcAlarm[]>('/v1/spc/alarms'),
  close: (id: string, data: CloseAlarmRequest) =>
    request.post<void>(`/v1/spc/alarms/${id}/close`, data),
  launch8d: (id: string) =>
    request.post<Record<string, unknown>>(`/v1/spc/alarms/${id}/launch-8d`),
}
