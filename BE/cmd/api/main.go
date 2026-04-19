package main

// @title IT4409 API
// @version 1.0
// @description Clean Architecture Go API (register/login) with JWT.
// @BasePath /
// @schemes http
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Nhập JWT token (có thể nhập "Bearer <token>" hoặc chỉ "<token>")

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"it4409/internal/config"
	"it4409/internal/delivery/http/handler"
	"it4409/internal/delivery/http/middleware"
	"it4409/internal/delivery/http/router"
	"it4409/internal/infra/db"
	"it4409/internal/pkg/jwtutil"
	"it4409/internal/repository/postgres"
	"it4409/internal/usecase"

	_ "it4409/docs"

	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	ctx := context.Background()
	pg, err := db.NewPostgres(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("db: %v", err)
	}
	defer pg.Close()

	jwtSvc := jwtutil.Service{Secret: []byte(cfg.JWTSecret), Issuer: cfg.JWTIssuer, TTL: cfg.JWTTTL}

	// ── Repositories ────────────────────────────────────────────
	userRepo := postgres.NewUserRepo(pg.Pool)
	projectRepo := postgres.NewProjectRepo(pg.Pool)
	boardRepo := postgres.NewBoardRepo(pg.Pool)
	labelRepo := postgres.NewLabelRepo(pg.Pool)
	txManager := postgres.NewPgTxManager(pg.Pool)

	// ── Usecases ────────────────────────────────────────────────
	authUC := usecase.NewAuthUsecase(userRepo, jwtSvc)
	userUC := usecase.NewUserUsecase(userRepo)
	permChecker := usecase.NewPermissionChecker(projectRepo)
	projectUC := usecase.NewProjectUsecase(projectRepo, txManager, permChecker)
	boardUC := usecase.NewBoardUsecase(boardRepo, projectRepo, txManager, permChecker)
	labelUC := usecase.NewLabelUsecase(labelRepo, permChecker)

	// ── Handlers ────────────────────────────────────────────────
	authHandler := handler.NewAuthHandler(authUC)
	userHandler := handler.NewUserHandler(userUC)
	projectHandler := handler.NewProjectHandler(projectUC)
	boardHandler := handler.NewBoardHandler(boardUC)
	labelHandler := handler.NewLabelHandler(labelUC)

	h := router.New(router.Deps{
		AuthHandler:    authHandler,
		UserHandler:    userHandler,
		ProjectHandler: projectHandler,
		BoardHandler:   boardHandler,
		LabelHandler:   labelHandler,
		JWTAuth:        middleware.JWTAuth{JWT: jwtSvc},
	})

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           h,
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		log.Printf("listening on :%s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = srv.Shutdown(shutdownCtx)
	log.Printf("shutdown complete")
}
