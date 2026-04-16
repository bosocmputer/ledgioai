CREATE TYPE "public"."agent_provider" AS ENUM('anthropic', 'openai', 'gemini', 'ollama', 'openrouter', 'custom');--> statement-breakpoint
CREATE TYPE "public"."meeting_mode" AS ENUM('quick_ask', 'consult', 'full_board');--> statement-breakpoint
CREATE TYPE "public"."meeting_status" AS ENUM('running', 'completed', 'error', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."message_phase" AS ENUM('clarification', 'analysis', 'finding', 'discussion', 'synthesis', 'quick_answer', 'web_source', 'system');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"inviter_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text,
	"logo" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"metadata" text,
	CONSTRAINT "organization_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"active_organization_id" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"template_id" uuid,
	"name" varchar(255) NOT NULL,
	"emoji" varchar(10) NOT NULL,
	"role" varchar(255) NOT NULL,
	"soul" text NOT NULL,
	"provider" "agent_provider" NOT NULL,
	"model" varchar(255) NOT NULL,
	"api_key_encrypted" text NOT NULL,
	"base_url" varchar(512),
	"seniority" integer DEFAULT 50,
	"use_web_search" boolean DEFAULT false NOT NULL,
	"trusted_urls" text,
	"mcp_endpoint" varchar(512),
	"mcp_access_mode" varchar(50),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "agent_knowledge" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"workspace_id" text NOT NULL,
	"filename" varchar(255) NOT NULL,
	"mime_type" varchar(100),
	"meta" varchar(500),
	"content" text NOT NULL,
	"tokens" integer NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text,
	"name" varchar(255) NOT NULL,
	"emoji" varchar(10) NOT NULL,
	"role" varchar(255) NOT NULL,
	"soul" text NOT NULL,
	"suggested_provider" "agent_provider" DEFAULT 'anthropic',
	"suggested_model" varchar(255) DEFAULT 'claude-sonnet-4-6',
	"seniority" integer DEFAULT 50,
	"use_web_search" boolean DEFAULT false,
	"trusted_urls" text,
	"category" varchar(100),
	"tags" text,
	"description" text,
	"is_public" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"name" varchar(255) NOT NULL,
	"emoji" varchar(10) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "team_agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	CONSTRAINT "team_agents_unique" UNIQUE("team_id","agent_id")
);
--> statement-breakpoint
CREATE TABLE "meetings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"question" text NOT NULL,
	"mode" "meeting_mode" DEFAULT 'full_board' NOT NULL,
	"status" "meeting_status" DEFAULT 'running' NOT NULL,
	"agent_ids" text NOT NULL,
	"team_id" uuid,
	"file_contexts" text,
	"metadata" text,
	"final_answer" text,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "meeting_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meeting_id" uuid NOT NULL,
	"workspace_id" text NOT NULL,
	"agent_id" uuid NOT NULL,
	"agent_name" varchar(255) NOT NULL,
	"agent_emoji" varchar(10) NOT NULL,
	"phase" "message_phase" NOT NULL,
	"content" text NOT NULL,
	"tokens_used" integer DEFAULT 0 NOT NULL,
	"sources" text,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memory_facts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"key" varchar(255) NOT NULL,
	"value" text NOT NULL,
	"category" varchar(50),
	"source" varchar(255),
	"confidence" integer DEFAULT 100,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "memory_workspace_key" UNIQUE("workspace_id","key")
);
--> statement-breakpoint
CREATE TABLE "agent_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"workspace_id" text NOT NULL,
	"date" varchar(10) NOT NULL,
	"meetings" integer DEFAULT 0 NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"cache_read_tokens" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "stats_agent_date" UNIQUE("agent_id","date")
);
--> statement-breakpoint
CREATE TABLE "workspace_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"serper_api_key_encrypted" text,
	"serp_api_key_encrypted" text,
	"default_provider" "agent_provider",
	"default_model" varchar(255),
	"max_tokens_per_meeting" integer DEFAULT 50000,
	"max_meetings_per_day" integer DEFAULT 100,
	"enable_web_search" boolean DEFAULT true NOT NULL,
	"enable_mcp" boolean DEFAULT false NOT NULL,
	"mcp_endpoint" varchar(512),
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_settings_workspace_id_unique" UNIQUE("workspace_id")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviter_id_user_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_knowledge" ADD CONSTRAINT "agent_knowledge_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_agents" ADD CONSTRAINT "team_agents_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_agents" ADD CONSTRAINT "team_agents_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_messages" ADD CONSTRAINT "meeting_messages_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_stats" ADD CONSTRAINT "agent_stats_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agents_workspace_idx" ON "agents" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "knowledge_agent_idx" ON "agent_knowledge" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "knowledge_workspace_idx" ON "agent_knowledge" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "templates_workspace_idx" ON "agent_templates" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "templates_category_idx" ON "agent_templates" USING btree ("category");--> statement-breakpoint
CREATE INDEX "teams_workspace_idx" ON "teams" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "meetings_workspace_idx" ON "meetings" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "meetings_user_idx" ON "meetings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "meetings_status_idx" ON "meetings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "meetings_mode_idx" ON "meetings" USING btree ("mode");--> statement-breakpoint
CREATE INDEX "messages_meeting_idx" ON "meeting_messages" USING btree ("meeting_id");--> statement-breakpoint
CREATE INDEX "messages_workspace_idx" ON "meeting_messages" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "memory_workspace_idx" ON "memory_facts" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "stats_agent_idx" ON "agent_stats" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "stats_workspace_idx" ON "agent_stats" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "stats_date_idx" ON "agent_stats" USING btree ("date");