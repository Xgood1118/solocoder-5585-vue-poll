export type PollType = 'single' | 'multiple' | 'ranking' | 'rating'
export type PollStatus = 'draft' | 'active' | 'closed'

export interface PollOption {
  id: string
  pollId: string
  label: string
  imageUrl?: string
  backgroundColor?: string
  displayOrder: number
}

export interface PollSettings {
  maxSelections?: number
  ratingMin: number
  ratingMax: number
  ratingStep: number
}

export interface Poll {
  id: string
  title: string
  description: string
  type: PollType
  password?: string
  deadline: number
  isArchived: boolean
  isSealed: boolean
  createdAt: number
  updatedAt: number
  status: PollStatus
  options: PollOption[]
  settings: PollSettings
}

export interface VoteSelection {
  optionId: string
  ratingValue?: number
  rankOrder?: number
}

export interface VoteRecord {
  id: string
  pollId: string
  selections: VoteSelection[]
  voterFingerprint: string
  votedAt: number
}

export interface AntiFraudConfig {
  ipRateLimit: number
  uaBlacklist: string[]
  uaWhitelist: string[]
  fingerprintThreshold: number
  voteFrequencyThreshold: number
  riskScoreBreakpoint: number
}

export interface TimelinePoint {
  timestamp: number
  optionId: string
  count: number
}

export interface WSMessage {
  type: 'vote_update' | 'poll_closed' | 'connection_established' | 'vote_submitted' | 'poll_updated' | 'time_sync' | 'storage_update' | 'storage_read' | 'storage_write' | 'ping' | 'pong'
  payload: {
    pollId?: string
    optionId?: string
    voterFingerprint?: string
    timestamp?: number
    voteCounts?: Record<string, number>
    voteId?: string
    operation?: 'create' | 'update' | 'delete' | 'duplicate' | 'archive' | 'unarchive' | 'seal'
    counts?: Record<string, number>
    serverTime?: number
    clientBefore?: number
    key?: string
    value?: string
    iso?: string
    rtt?: number
  }
}

export interface TimeSyncResult {
  serverTime: number
  clientTime: number
  offset: number
}
