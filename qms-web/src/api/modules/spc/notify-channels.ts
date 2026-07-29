/**
 * SPC — Notify Channels API
 * Controller: SpcNotifyChannelController  (/api/v1/spc/notify-channels)
 *
 * Permissions: spc.param.list (全部)
 */
import { request } from '@/api/client'
import type { SpcNotifyChannel, SpcNotifyRecord } from '@/api/types/spc'

export const spcNotifyChannelsApi = {
  list: () => request.get<SpcNotifyChannel[]>('/v1/spc/notify-channels'),
  toggle: (id: string, enabled: boolean) =>
    request.put<void>(`/v1/spc/notify-channels/${id}/toggle`, null, { params: { enabled } }),
  records: (alarmId?: string) =>
    request.get<SpcNotifyRecord[]>('/v1/spc/notify-channels/records', {
      params: alarmId ? { alarmId } : undefined,
    }),
}
