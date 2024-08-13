CREATE TABLE IF NOT EXISTS "birthday" (
	"id" text PRIMARY KEY NOT NULL,
	"month" integer NOT NULL,
	"day" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "invite_links" (
	"inviter" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	CONSTRAINT "invite_links_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "invites" (
	"inviter" text PRIMARY KEY NOT NULL,
	"invitee" text NOT NULL,
	CONSTRAINT "invites_invitee_unique" UNIQUE("invitee")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "transcription_prompt" (
	"id" serial PRIMARY KEY NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"prompt" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "starboard_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"channel" text NOT NULL,
	"enabled" boolean NOT NULL,
	"threshold" integer NOT NULL,
	"emoji" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "starboard" (
	"id" text PRIMARY KEY NOT NULL,
	"message" text NOT NULL,
	"channel" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "starred" (
	"user_id" text NOT NULL,
	"message_id" text NOT NULL,
	CONSTRAINT "starred_user_id_message_id_pk" PRIMARY KEY("user_id","message_id")
);
