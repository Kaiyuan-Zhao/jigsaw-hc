create table if not exists piece_balances (
	user_id text primary key,
	pieces integer not null check (pieces >= 0),
	updated_at bigint not null
);

create table if not exists piece_grants (
	id bigint generated always as identity primary key,
	target_user_id text not null,
	amount integer not null check (amount > 0),
	reason text,
	created_at bigint not null
);

create table if not exists puzzle_claims (
	user_id text not null,
	puzzle_id text not null,
	created_at bigint not null,
	primary key (user_id, puzzle_id)
);

create table if not exists shop_purchases (
	id bigint generated always as identity primary key,
	user_id text not null,
	item_id text not null,
	price_pieces integer not null check (price_pieces > 0),
	title_snapshot text not null,
	created_at bigint not null,
	fulfilled_at bigint
);

create table if not exists arcade_puzzles (
	puzzle_id text primary key,
	creator_user_id text not null,
	title text not null,
	genre text not null default '',
	thumbnail text not null default '',
	game_url text,
	author_label text not null default '',
	created_at bigint not null
);

create table if not exists arcade_upvotes (
	puzzle_id text not null,
	voter_user_id text not null,
	created_at bigint not null,
	primary key (puzzle_id, voter_user_id)
);

create table if not exists arcade_solutions (
	puzzle_id text primary key,
	creator_user_id text not null,
	reward_puzzle_id text not null,
	password text not null,
	created_at bigint not null
);
