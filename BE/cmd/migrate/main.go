package main

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

// Script chạy migration thủ công cho các bảng mới (boards, labels)
func main() {
	_ = godotenv.Load(".env")
	dbUrl := os.Getenv("DATABASE_URL")
	if dbUrl == "" {
		fmt.Println("LỖI: Chưa có DATABASE_URL")
		os.Exit(1)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	pool, err := pgxpool.New(ctx, dbUrl)
	if err != nil {
		fmt.Printf("LỖI kết nối: %v\n", err)
		os.Exit(1)
	}
	defer pool.Close()

	fmt.Println("[OK] Đã kết nối Supabase. Bắt đầu chạy migration...")

	migrations := []struct {
		Name string
		SQL  string
	}{
		{
			Name: "002_user_extend ",
			SQL: `
				ALTER TABLE public.users
				  ADD COLUMN IF NOT EXISTS avatar_url text,
				  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

				CREATE OR REPLACE FUNCTION update_updated_at()
				RETURNS TRIGGER AS $$
				BEGIN
				  NEW.updated_at = now();
				  RETURN NEW;
				END;
				$$ LANGUAGE plpgsql;

				DO $$ BEGIN
				  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_users_updated_at') THEN
				    CREATE TRIGGER trg_users_updated_at
				      BEFORE UPDATE ON public.users
				      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
				  END IF;
				END $$;
			`,
		},
		{
			Name: "005_boards ",
			SQL: `
				CREATE TABLE IF NOT EXISTS public.boards (
				  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
				  project_id  uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
				  name        text NOT NULL,
				  is_default  boolean NOT NULL DEFAULT false,
				  created_at  timestamptz NOT NULL DEFAULT now(),
				  updated_at  timestamptz NOT NULL DEFAULT now()
				);
				CREATE INDEX IF NOT EXISTS idx_boards_project ON public.boards(project_id);

				CREATE TABLE IF NOT EXISTS public.board_columns (
				  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
				  board_id    uuid NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
				  name        text NOT NULL,
				  position    integer NOT NULL DEFAULT 0,
				  status_map  text NOT NULL DEFAULT 'todo'
				                CHECK (status_map IN ('todo','in_progress','in_review','done')),
				  created_at  timestamptz NOT NULL DEFAULT now()
				);
				CREATE INDEX IF NOT EXISTS idx_board_columns_board ON public.board_columns(board_id);
			`,
		},
		{
			Name: "008_labels",
			SQL: `
				CREATE TABLE IF NOT EXISTS public.labels (
				  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
				  project_id  uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
				  name        text NOT NULL,
				  color       text NOT NULL DEFAULT '#6366f1',
				  created_at  timestamptz NOT NULL DEFAULT now()
				);
				CREATE INDEX IF NOT EXISTS idx_labels_project ON public.labels(project_id);
			`,
		},
		{
			Name: "004_issues ",
			SQL: `
				CREATE TABLE IF NOT EXISTS public.issues (
				  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				  project_id   UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
				  issue_number INTEGER NOT NULL,
				  key          TEXT NOT NULL,
				  type         TEXT NOT NULL DEFAULT 'task'
				                 CHECK (type IN ('epic','story','task','bug','subtask')),
				  status       TEXT NOT NULL DEFAULT 'todo'
				                 CHECK (status IN ('todo','in_progress','in_review','done','cancelled')),
				  priority     TEXT NOT NULL DEFAULT 'medium'
				                 CHECK (priority IN ('critical','high','medium','low','trivial')),
				  title        TEXT NOT NULL,
				  description  TEXT NOT NULL DEFAULT '',
				  assignee_id  UUID REFERENCES public.users(id),
				  reporter_id  UUID NOT NULL REFERENCES public.users(id),
				  parent_id    UUID REFERENCES public.issues(id) ON DELETE SET NULL,
				  sprint_id    UUID,
				  sort_order   DOUBLE PRECISION NOT NULL DEFAULT 0,
				  due_date     TIMESTAMPTZ,
				  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
				  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
				  deleted_at   TIMESTAMPTZ,
				  CONSTRAINT uq_issue_project_number UNIQUE (project_id, issue_number)
				);
				CREATE INDEX IF NOT EXISTS idx_issues_project ON public.issues(project_id) WHERE deleted_at IS NULL;
				CREATE INDEX IF NOT EXISTS idx_issues_assignee ON public.issues(assignee_id);
				CREATE INDEX IF NOT EXISTS idx_issues_parent ON public.issues(parent_id);
				CREATE INDEX IF NOT EXISTS idx_issues_status ON public.issues(status);
				CREATE INDEX IF NOT EXISTS idx_issues_key ON public.issues(key);
				CREATE INDEX IF NOT EXISTS idx_issues_sprint ON public.issues(sprint_id);

				DO $$ BEGIN
				  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_issues_updated_at') THEN
				    CREATE TRIGGER trg_issues_updated_at
				      BEFORE UPDATE ON public.issues
				      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
				  END IF;
				END $$;
			`,
		},
		{
			Name: "007_comments ",
			SQL: `
				CREATE TABLE IF NOT EXISTS public.comments (
				  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				  issue_id   UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
				  user_id    UUID NOT NULL REFERENCES public.users(id),
				  content    TEXT NOT NULL,
				  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
				  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
				);
				CREATE INDEX IF NOT EXISTS idx_comments_issue ON public.comments(issue_id);
			`,
		},
		{
			Name: "009_attachments",
			SQL: `
				CREATE TABLE IF NOT EXISTS public.attachments (
				  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				  issue_id     UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
				  uploaded_by  UUID NOT NULL REFERENCES public.users(id),
				  filename     TEXT NOT NULL,
				  file_size    BIGINT NOT NULL DEFAULT 0,
				  mime_type    TEXT NOT NULL DEFAULT 'application/octet-stream',
				  storage_path TEXT NOT NULL,
				  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
				);
				CREATE INDEX IF NOT EXISTS idx_attachments_issue ON public.attachments(issue_id);
			`,
		},
	}

	for _, m := range migrations {
		_, err := pool.Exec(ctx, m.SQL)
		if err != nil {
			fmt.Printf("[WARN] Migration %s có lỗi (có thể đã tồn tại): %v\n", m.Name, err)
		} else {
			fmt.Printf("[OK] Migration %s thành công\n", m.Name)
		}
	}

	fmt.Println("\n[DONE] Tất cả migration đã chạy xong!")
}
