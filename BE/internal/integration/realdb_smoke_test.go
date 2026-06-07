//go:build integration

package integration

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"it4409/internal/delivery/http/handler"
	"it4409/internal/delivery/http/middleware"
	"it4409/internal/domain"
	"it4409/internal/pkg/jwtutil"
	"it4409/internal/repository/postgres"
	"it4409/internal/usecase"
)

type recordedEvent struct {
	Type string
	Data any
}

type recordingPublisher struct {
	events []recordedEvent
}

func (p *recordingPublisher) Publish(eventType string, data any) {
	p.events = append(p.events, recordedEvent{Type: eventType, Data: data})
}

func TestRealDBIssueCommentSprintBoardLabelSmoke(t *testing.T) {
	_ = godotenv.Load("../../.env", ".env")

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		t.Skip("DATABASE_URL is not set")
	}
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		t.Skip("JWT_SECRET is not set")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
	defer cancel()

	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		t.Fatalf("connect db: %v", err)
	}
	defer pool.Close()
	if err := pool.Ping(ctx); err != nil {
		t.Fatalf("ping db: %v", err)
	}

	userRepo := postgres.NewUserRepo(pool)
	projectRepo := postgres.NewProjectRepo(pool)
	boardRepo := postgres.NewBoardRepo(pool)
	labelRepo := postgres.NewLabelRepo(pool)
	issueRepo := postgres.NewIssueRepo(pool)
	commentRepo := postgres.NewCommentRepo(pool)
	sprintRepo := postgres.NewSprintRepo(pool)
	activityRepo := postgres.NewActivityRepo(pool)
	txManager := postgres.NewPgTxManager(pool)
	perm := usecase.NewPermissionChecker(projectRepo)
	events := &recordingPublisher{}

	jwtSvc := jwtutil.Service{Secret: []byte(jwtSecret), Issuer: os.Getenv("JWT_ISSUER"), TTL: time.Hour}
	authUC := usecase.NewAuthUsecase(userRepo, jwtSvc)
	projectUC := usecase.NewProjectUsecase(projectRepo, txManager, perm)
	issueUC := usecase.NewIssueUsecase(issueRepo, projectRepo, txManager, perm, activityRepo, events)
	commentUC := usecase.NewCommentUsecase(commentRepo, issueRepo, perm, activityRepo, events)
	sprintUC := usecase.NewSprintUsecase(sprintRepo, issueRepo, projectRepo, txManager, perm, events)
	boardUC := usecase.NewBoardUsecase(boardRepo, projectRepo, txManager, perm)
	labelUC := usecase.NewLabelUsecase(labelRepo, issueRepo, perm)

	suffix := time.Now().UnixNano()
	email := fmt.Sprintf("integration_%d@example.test", suffix)
	auth, err := authUC.Register(ctx, usecase.RegisterInput{
		Email:    email,
		Password: "Test@123456",
		Name:     "Integration Smoke",
	})
	if err != nil {
		t.Fatalf("register user: %v", err)
	}

	var projectID string
	defer cleanupRealDBSmoke(ctx, t, pool, &projectID, auth.User.ID)

	project, err := projectUC.CreateProject(ctx, auth.User.ID, &domain.Project{
		Name:        fmt.Sprintf("Integration Smoke %d", suffix),
		Key:         fmt.Sprintf("IT%d", suffix%1000000000000),
		Description: "real DB integration smoke test",
		Type:        "scrum",
	})
	if err != nil {
		t.Fatalf("create project: %v", err)
	}
	projectID = project.ID

	sprint, err := sprintUC.CreateSprint(ctx, auth.User.ID, project.ID, usecase.CreateSprintInput{
		Name: "Sprint Smoke",
		Goal: "Validate real DB integration",
	})
	if err != nil {
		t.Fatalf("create sprint: %v", err)
	}

	issue, err := issueUC.CreateIssue(ctx, auth.User.ID, project.ID, usecase.CreateIssueInput{
		Type:        domain.IssueTypeTask,
		Title:       "Smoke issue",
		Description: "created by integration smoke test",
		Priority:    domain.PriorityMedium,
		SprintID:    &sprint.ID,
	})
	if err != nil {
		t.Fatalf("create issue: %v", err)
	}
	if issue.SprintID == nil || *issue.SprintID != sprint.ID {
		t.Fatalf("created issue sprintId = %v, want %s", issue.SprintID, sprint.ID)
	}

	var patch domain.IssuePatch
	if err := json.Unmarshal([]byte(`{"title":"Smoke issue updated","priority":"high","dueDate":"2026-05-23"}`), &patch); err != nil {
		t.Fatalf("build issue patch: %v", err)
	}
	updated, err := issueUC.UpdateIssue(ctx, auth.User.ID, issue.Key, &patch)
	if err != nil {
		t.Fatalf("update issue with YYYY-MM-DD dueDate: %v", err)
	}
	if updated.Title != "Smoke issue updated" || updated.Priority != domain.PriorityHigh {
		t.Fatalf("issue title/priority were not updated: title=%q priority=%q", updated.Title, updated.Priority)
	}
	if updated.SprintID == nil || *updated.SprintID != sprint.ID {
		t.Fatalf("patch without sprintId changed sprintId: got %v want %s", updated.SprintID, sprint.ID)
	}
	wantDate := time.Date(2026, 5, 23, 0, 0, 0, 0, time.UTC)
	if updated.DueDate == nil || !updated.DueDate.UTC().Equal(wantDate) {
		t.Fatalf("dueDate = %v, want %v", updated.DueDate, wantDate)
	}

	var rfcPatch domain.IssuePatch
	if err := json.Unmarshal([]byte(`{"dueDate":"2026-05-24T00:00:00Z"}`), &rfcPatch); err != nil {
		t.Fatalf("build RFC3339 dueDate patch: %v", err)
	}
	if _, err := issueUC.UpdateIssue(ctx, auth.User.ID, issue.Key, &rfcPatch); err != nil {
		t.Fatalf("update issue with RFC3339 dueDate: %v", err)
	}

	var clearDuePatch domain.IssuePatch
	if err := json.Unmarshal([]byte(`{"dueDate":null}`), &clearDuePatch); err != nil {
		t.Fatalf("build clear dueDate patch: %v", err)
	}
	clearedDue, err := issueUC.UpdateIssue(ctx, auth.User.ID, issue.Key, &clearDuePatch)
	if err != nil {
		t.Fatalf("clear dueDate: %v", err)
	}
	if clearedDue.DueDate != nil {
		t.Fatalf("dueDate was not cleared: %v", clearedDue.DueDate)
	}

	var clearSprintPatch domain.IssuePatch
	if err := json.Unmarshal([]byte(`{"sprintId":null}`), &clearSprintPatch); err != nil {
		t.Fatalf("build clear sprint patch: %v", err)
	}
	backlogIssue, err := issueUC.UpdateIssue(ctx, auth.User.ID, issue.Key, &clearSprintPatch)
	if err != nil {
		t.Fatalf("clear sprintId: %v", err)
	}
	if backlogIssue.SprintID != nil {
		t.Fatalf("sprintId was not cleared: %v", *backlogIssue.SprintID)
	}
	backlog, err := sprintUC.GetBacklog(ctx, auth.User.ID, project.ID)
	if err != nil {
		t.Fatalf("get backlog: %v", err)
	}
	if !containsIssue(backlog, issue.ID) {
		t.Fatalf("cleared issue %s was not returned in backlog", issue.Key)
	}

	comment, err := commentUC.AddComment(ctx, auth.User.ID, issue.Key, "comment from real DB smoke test")
	if err != nil {
		t.Fatalf("add comment: %v", err)
	}
	if comment.ID == "" {
		t.Fatalf("created comment has empty id")
	}

	activities, _, err := activityRepo.ListByIssue(ctx, issue.ID, 50, 0)
	if err != nil {
		t.Fatalf("list issue activity: %v", err)
	}
	assertActivity(t, activities, domain.ActivityUpdated, "title")
	assertActivity(t, activities, domain.ActivityUpdated, "priority")
	assertActivity(t, activities, domain.ActivityUpdated, "due_date")
	assertActivity(t, activities, domain.ActivityUpdated, "sprint")
	assertActivity(t, activities, domain.ActivityCommented, "")

	started, err := sprintUC.StartSprint(ctx, auth.User.ID, sprint.ID)
	if err != nil {
		t.Fatalf("start sprint: %v", err)
	}
	if started.Status != domain.SprintStatusActive {
		t.Fatalf("started sprint status = %s", started.Status)
	}
	completed, err := sprintUC.CompleteSprint(ctx, auth.User.ID, sprint.ID)
	if err != nil {
		t.Fatalf("complete sprint: %v", err)
	}
	if completed.Status != domain.SprintStatusCompleted {
		t.Fatalf("completed sprint status = %s", completed.Status)
	}

	assertEvent(t, events.events, "issue_updated")
	assertEvent(t, events.events, "comment_added")
	assertEvent(t, events.events, "sprint_started")
	assertEvent(t, events.events, "sprint_completed")

	api := chi.NewRouter()
	api.Route("/api", func(r chi.Router) {
		r.Use(middleware.JWTAuth{JWT: jwtSvc}.Middleware)
		handler.NewBoardHandler(boardUC).RegisterRoutes(r)
		handler.NewLabelHandler(labelUC).RegisterRoutes(r)
	})

	boardResp := doJSON(t, api, auth.Token, http.MethodPost, "/api/projects/"+project.ID+"/boards", map[string]any{"name": "Smoke Board"}, http.StatusCreated)
	var board domain.Board
	decodeData(t, boardResp, &board)
	if board.ID == "" {
		t.Fatalf("board create returned empty id")
	}
	doJSON(t, api, auth.Token, http.MethodGet, "/api/projects/"+project.ID+"/boards", nil, http.StatusOK)
	doJSON(t, api, auth.Token, http.MethodPatch, "/api/boards/"+board.ID, map[string]any{"name": "Smoke Board Updated"}, http.StatusOK)

	labelResp := doJSON(t, api, auth.Token, http.MethodPost, "/api/projects/"+project.ID+"/labels", map[string]any{
		"name":  "Smoke Label",
		"color": "#22c55e",
	}, http.StatusCreated)
	var label domain.Label
	decodeData(t, labelResp, &label)
	if label.ID == "" {
		t.Fatalf("label create returned empty id")
	}
	doJSON(t, api, auth.Token, http.MethodGet, "/api/projects/"+project.ID+"/labels", nil, http.StatusOK)
	doJSON(t, api, auth.Token, http.MethodPatch, "/api/labels/"+label.ID, map[string]any{"name": "Smoke Label Updated"}, http.StatusOK)
	doJSON(t, api, auth.Token, http.MethodPost, "/api/issues/"+issue.Key+"/labels", map[string]any{"labelId": label.ID}, http.StatusCreated)
	doJSON(t, api, auth.Token, http.MethodDelete, "/api/issues/"+issue.Key+"/labels/"+label.ID, nil, http.StatusOK)
	doJSON(t, api, auth.Token, http.MethodDelete, "/api/labels/"+label.ID, nil, http.StatusOK)
	doJSON(t, api, auth.Token, http.MethodDelete, "/api/boards/"+board.ID, nil, http.StatusOK)
}

func cleanupRealDBSmoke(ctx context.Context, t *testing.T, pool *pgxpool.Pool, projectID *string, userID string) {
	t.Helper()
	if projectID != nil && *projectID != "" {
		if _, err := pool.Exec(ctx, `DELETE FROM public.projects WHERE id = $1`, *projectID); err != nil {
			t.Logf("cleanup project %s: %v", *projectID, err)
		}
	}
	if userID != "" {
		if _, err := pool.Exec(ctx, `DELETE FROM public.users WHERE id = $1`, userID); err != nil {
			t.Logf("cleanup user %s: %v", userID, err)
		}
	}
}

func containsIssue(issues []*domain.Issue, id string) bool {
	for _, issue := range issues {
		if issue.ID == id {
			return true
		}
	}
	return false
}

func assertActivity(t *testing.T, activities []*domain.Activity, action, field string) {
	t.Helper()
	for _, activity := range activities {
		if activity.Action == action && activity.Field == field {
			return
		}
	}
	t.Fatalf("activity action=%s field=%s not found in %#v", action, field, activities)
}

func assertEvent(t *testing.T, events []recordedEvent, eventType string) {
	t.Helper()
	for _, event := range events {
		if event.Type == eventType {
			return
		}
	}
	t.Fatalf("event type %s not published; events=%#v", eventType, events)
}

type envelope struct {
	Status  int             `json:"status"`
	Message string          `json:"message"`
	Data    json.RawMessage `json:"data"`
}

func doJSON(t *testing.T, h http.Handler, token, method, path string, body any, wantStatus int) envelope {
	t.Helper()
	var reqBody *bytes.Reader
	if body == nil {
		reqBody = bytes.NewReader(nil)
	} else {
		b, err := json.Marshal(body)
		if err != nil {
			t.Fatalf("marshal request body: %v", err)
		}
		reqBody = bytes.NewReader(b)
	}

	req := httptest.NewRequest(method, path, reqBody)
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != wantStatus {
		t.Fatalf("%s %s status = %d, want %d, body=%s", method, path, rec.Code, wantStatus, rec.Body.String())
	}
	var env envelope
	if err := json.Unmarshal(rec.Body.Bytes(), &env); err != nil {
		t.Fatalf("%s %s response is not envelope JSON: %v body=%s", method, path, err, rec.Body.String())
	}
	if env.Status != wantStatus || env.Message == "" {
		t.Fatalf("%s %s invalid envelope: %+v body=%s", method, path, env, rec.Body.String())
	}
	return env
}

func decodeData(t *testing.T, env envelope, dst any) {
	t.Helper()
	if len(env.Data) == 0 || bytes.Equal(env.Data, []byte("null")) {
		t.Fatalf("response data is empty/null")
	}
	if err := json.Unmarshal(env.Data, dst); err != nil {
		t.Fatalf("decode envelope data: %v; data=%s", err, string(env.Data))
	}
}
