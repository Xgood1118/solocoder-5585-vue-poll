import type { Poll, VoteRecord } from '@/types'

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function exportAsJson(poll: Poll, records: VoteRecord[]): void {
  const data = JSON.stringify({ poll, records }, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  downloadBlob(blob, `${poll.title}-poll-data.json`)
}

export function exportAsIcs(poll: Poll): void {
  const pad = (n: number) => n.toString().padStart(2, '0')
  const deadline = new Date(poll.deadline)
  const dtStart = `${deadline.getFullYear()}${pad(deadline.getMonth() + 1)}${pad(deadline.getDate())}T${pad(deadline.getHours())}${pad(deadline.getMinutes())}${pad(deadline.getSeconds())}`
  const dtEnd = new Date(deadline.getTime() + 3600000)
  const dtEndStr = `${dtEnd.getFullYear()}${pad(dtEnd.getMonth() + 1)}${pad(dtEnd.getDate())}T${pad(dtEnd.getHours())}${pad(dtEnd.getMinutes())}${pad(dtEnd.getSeconds())}`
  const now = new Date()
  const dtStamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}T${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//VuePoll//EN',
    'BEGIN:VEVENT',
    `DTSTART:${dtStart}`,
    `DTEND:${dtEndStr}`,
    `DTSTAMP:${dtStamp}`,
    `SUMMARY:投票截止: ${poll.title}`,
    `DESCRIPTION:${poll.description}`,
    `UID:${poll.id}@vuepoll`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n')

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  downloadBlob(blob, `${poll.title}-deadline.ics`)
}
