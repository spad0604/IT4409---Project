package main

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"it4409/internal/domain"
	"it4409/internal/repository/postgres"
	"it4409/internal/usecase"
)

func main() {
	fmt.Println("=== BẮT ĐẦU CHẠY CÁC TEST CASE TỔNG HỢP ===")

	// 1. Tải file .env từ thư mục gốc
	err := godotenv.Load(".env")
	if err != nil {
		fmt.Println("Cảnh báo: Không thể tải file .env. Lấy giá trị từ biến môi trường của hệ thống.")
	}

	dbUrl := os.Getenv("DATABASE_URL")
	if dbUrl == "" {
		fmt.Println("LỖI: Chưa có biến môi trường DATABASE_URL")
		os.Exit(1)
	}

	// 2. Kết nối tới Supabase
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pool, err := pgxpool.New(ctx, dbUrl)
	if err != nil {
		fmt.Printf("LỖI: Không thể tạo kết nối DB: %v\n", err)
		os.Exit(1)
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		fmt.Printf("LỖI: Không thể ping DB: %v\n", err)
		os.Exit(1)
	}
	fmt.Println("[OK] Đã kết nối Supabase.")

	// 3. Khởi tạo Repo và TxManager
	txManager := postgres.NewPgTxManager(pool)
	projectRepo := postgres.NewProjectRepo(pool)

	testCtx := context.Background()

	// 4. Seeding Data User (Vì Project ràng buộc foreign key tới users)
	// Lưu ý: bảng users đã tạo trong 001_init, ta thêm nhanh một user tĩnh nếu chưa có
	var dummyUserID string
	err = pool.QueryRow(testCtx, `
		INSERT INTO users (email, password_hash, name) 
		VALUES ('test@example.com', 'dummyhash', 'Test User') 
		ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
		RETURNING id
	`).Scan(&dummyUserID)
	if err != nil {
		fmt.Printf("LỖI: Seed dữ liệu User thất bại: %v\n", err)
		// os.Exit(1)
		// Đôi khi 001_init tạo table mà không có constraint properly... kiểm tra fetch thử:
		err = pool.QueryRow(testCtx, `SELECT id FROM users LIMIT 1`).Scan(&dummyUserID)
		if err != nil {
			fmt.Printf("LỖI FATAL: Không thể lấy User: %v\n", err)
			os.Exit(1)
		}
	}
	fmt.Printf("[OK] Seed User xong. Admin ID: %s\n", dummyUserID)

	// 5. Chạy các bài Test Database (Repository)
	fmt.Println("\n--- BẮT ĐẦU CHẠY TEST REPOSITORY DỰ ÁN ---")

	var createdProjectID string

	// TEST CASE 1: Tạo dự án mới trong 1 giao dịch nguyên tử
	err = txManager.WithTx(testCtx, func(tx pgx.Tx) error {
		newProj := &domain.Project{
			Name:        fmt.Sprintf("Dự án Test %v", time.Now().Unix()),
			Key:         fmt.Sprintf("T%v", time.Now().Unix()%10000), // Key thường ngắn để dễ làm mã ID cho công việc
			Description: "Mô tả tự động từ file tester",
			Type:        "scrum",
			CreatedBy:   dummyUserID,
		}

		created, err := projectRepo.CreateTx(testCtx, tx, newProj)
		if err != nil {
			return fmt.Errorf("lỗi tạo dự án: %w", err)
		}

		err = projectRepo.InitCounterTx(testCtx, tx, created.ID)
		if err != nil {
			return fmt.Errorf("lỗi tạo counter: %w", err)
		}

		err = projectRepo.AddMemberTx(testCtx, tx, &domain.ProjectMember{
			ProjectID: created.ID,
			UserID:    dummyUserID,
			Role:      "admin",
		})
		if err != nil {
			return fmt.Errorf("lỗi thêm member: %w", err)
		}

		fmt.Printf("[PASS] Đã tạo dự án thành công: %s (Key: %s)\n", created.Name, created.Key)
		createdProjectID = created.ID
		return nil
	})
	if err != nil {
		fmt.Printf("[FAIL] Test Tạo dự án thất bại: %v\n", err)
	}

	// TEST CASE 2 & 3: Lấy dự án & thành viên
	if createdProjectID != "" {
		proj, err := projectRepo.GetByID(testCtx, createdProjectID)
		if err != nil {
			fmt.Printf("[FAIL] Test GetByID thất bại: %v\n", err)
		} else {
			fmt.Printf("[PASS] Lấy dự án bằng ID thành công. Tên: %s\n", proj.Name)
		}

		members, err := projectRepo.GetMembers(testCtx, createdProjectID)
		if err != nil || len(members) == 0 {
			fmt.Printf("[FAIL] Test GetMembers thất bại: %v\n", err)
		} else {
			fmt.Printf("[PASS] Số thành viên dự án: %d, vai trò: %s\n", len(members), members[0].Role)
		}

		// TEST CASE 4: Update dữ án
		newDesc := "Cập nhật qua test!"
		patch := &domain.ProjectPatch{Description: &newDesc}
		updated, err := projectRepo.Update(testCtx, createdProjectID, patch)
		if err != nil {
			fmt.Printf("[FAIL] Test Update thất bại: %v\n", err)
		} else {
			fmt.Printf("[PASS] Thuộc tính description đã cập nhật: %s\n", updated.Description)
		}
	}

	// 6. Test Logic Nghiệp vụ (Usecase + Permission)
	fmt.Println("\n--- BẮT ĐẦU CHẠY TEST USECASE (KÈM PHÂN QUYỀN) ---")
	permChecker := usecase.NewPermissionChecker(projectRepo)
	projectUC := usecase.NewProjectUsecase(projectRepo, txManager, permChecker)

	ucProj := &domain.Project{
		Name:        "Dự án Usecase",
		Key:         fmt.Sprintf("UC%v", time.Now().Unix()%10000),
		Description: "Tạo qua Usecase",
	}

	ucCreated, err := projectUC.CreateProject(testCtx, dummyUserID, ucProj)
	if err != nil {
		fmt.Printf("[FAIL] Tạo dự án qua Usecase thất bại: %v\n", err)
	} else {
		fmt.Printf("[PASS] Đã tạo dự án qua Usecase: ID %s, CreatedBy: %s\n", ucCreated.ID, ucCreated.CreatedBy)

		// Test quyền: Người lạ cố gắng cập nhật dự án
		fakeUserID := "00000000-0000-0000-0000-000000000000"
		desc := "Hacked!"
		_, err = projectUC.UpdateProject(testCtx, fakeUserID, ucCreated.ID, &domain.ProjectPatch{Description: &desc})
		if err != nil {
			fmt.Printf("[PASS] Hệ thống bảo mật đã chặn người lạ sửa dự án thành công: %v\n", err)
		} else {
			fmt.Printf("[FAIL] LỖ HỔNG: Người lạ đã sửa được dự án!\n")
		}
	}
	
	fmt.Println("\n=== HOÀN THÀNH TẤT CẢ TEST ===================")
}
