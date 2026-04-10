export type ExampleCard = {
	title: string
	author: string
	genre: string
	thumbnail: string
	likes: number
	gameUrl?: string
}

export type ArcadeApiPuzzle = {
	puzzleId: string
	creatorUserId: string
	title: string
	genre: string
	thumbnail: string
	gameUrl: string | null
	authorLabel: string
	createdAt: number
	likeCount: number
	likedByMe: boolean
}
