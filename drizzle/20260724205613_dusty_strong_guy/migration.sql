CREATE TABLE "workouts" (
	"id" text PRIMARY KEY,
	"activity_type" text NOT NULL,
	"status" text NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"duration_minutes" double precision NOT NULL,
	"source_name" text NOT NULL,
	"indoor" boolean DEFAULT false NOT NULL,
	"distance_kilometres" double precision,
	"active_energy_kilocalories" double precision,
	"heart_rate_average" double precision,
	"heart_rate_minimum" double precision,
	"heart_rate_maximum" double precision,
	"notes" text,
	"imported" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
