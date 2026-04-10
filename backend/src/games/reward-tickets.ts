import crypto from 'node:crypto'
import { REWARD_AMOUNT, REWARD_TICKET_TTL_MS } from '../config.js'
import type { RewardTicketRecord } from '../auth/types.js'

const rewardTickets = new Map<string, RewardTicketRecord>()

export function createRewardTicket(userId: string, puzzleId: string): RewardTicketRecord {
	const ticket = crypto.randomUUID()
	const now = Date.now()
	const record: RewardTicketRecord = {
		ticket,
		userId,
		puzzleId,
		amount: REWARD_AMOUNT,
		createdAt: now,
		expiresAt: now + REWARD_TICKET_TTL_MS,
	}
	rewardTickets.set(ticket, record)
	return record
}

export function getRewardTicket(ticket: string): RewardTicketRecord | undefined {
	return rewardTickets.get(ticket)
}

export function deleteRewardTicket(ticket: string): void {
	rewardTickets.delete(ticket)
}

export function markRewardTicketUsed(ticket: string): void {
	const record = rewardTickets.get(ticket)
	if (!record) return
	record.usedAt = Date.now()
}

export function cleanupRewardTickets(): void {
	const now = Date.now()
	for (const [ticket, record] of rewardTickets.entries()) {
		if (record.expiresAt < now || record.usedAt) {
			rewardTickets.delete(ticket)
		}
	}
}
