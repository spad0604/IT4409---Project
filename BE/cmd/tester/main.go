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
	"it4409/internal/pkg/jwtutil"
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
	userRepo := postgres.NewUserRepo(pool)

	jwtSvc := jwtutil.Service{
		Secret: []byte(os.Getenv("JWT_SECRET")),
		Issuer: os.Getenv("JWT_ISSUER"),
		TTL:    60 * time.Minute,
	}

	testCtx := context.Background()

	// === TEST CODE NGƯỜI A: Auth + User ===
	fmt.Println("\n--- KIỂM TRA MODULE NGƯỜI A: AUTH + USER ---")
	authUC := usecase.NewAuthUsecase(userRepo, jwtSvc)
	userUC := usecase.NewUserUsecase(userRepo)

	// Test Đăng ký
	testEmail := fmt.Sprintf("tester_%d@test.com", time.Now().Unix())
	regResult, err := authUC.Register(testCtx, usecase.RegisterInput{
		Email:    testEmail,
		Password: "Test@123456",
		Name:     "Tester Auto",
	})
	if err != nil {
		fmt.Printf("[FAIL] Đăng ký tài khoản thất bại: %v\n", err)
	} else {
		fmt.Printf("[PASS] Đăng ký thành công: %s (Token: %s...)\n", regResult.User.Email, regResult.Token[:20])
	}

	// Test Đăng nhập
	loginResult, err := authUC.Login(testCtx, usecase.LoginInput{
		Email:    testEmail,
		Password: "Test@123456",
	})
	if err != nil {
		fmt.Printf("[FAIL] Đăng nhập thất bại: %v\n", err)
	} else {
		fmt.Printf("[PASS] Đăng nhập thành công: UserID %s\n", loginResult.User.ID)
	}

	// Test Đăng nhập sai mật khẩu
	_, err = authUC.Login(testCtx, usecase.LoginInput{
		Email:    testEmail,
		Password: "SaiMatKhau",
	})
	if err != nil {
		fmt.Printf("[PASS] Hệ thống từ chối mật khẩu sai đúng cách: %v\n", err)
	} else {
		fmt.Printf("[FAIL] LỖ HỔNG: Đăng nhập sai mật khẩu mà vẫn vào được!\n")
	}

	// Test Xem hồ sơ cá nhân
	if loginResult.User.ID != "" {
		profile, err := userUC.GetProfile(testCtx, loginResult.User.ID)
		if err != nil {
			fmt.Printf("[FAIL] Xem hồ sơ thất bại: %v\n", err)
		} else {
			fmt.Printf("[PASS] Hồ sơ: Tên=%s, Email=%s, Avatar=%s\n", profile.Name, profile.Email, profile.AvatarURL)
		}

		// Test Cập nhật hồ sơ
		newName := "Tester Updated"
		newAvatar := "https://example.com/avatar.png"
		updatedProfile, err := userUC.UpdateProfile(testCtx, loginResult.User.ID, usecase.UpdateProfileInput{
			Name:      &newName,
			AvatarURL: &newAvatar,
		})
		if err != nil {
			fmt.Printf("[FAIL] Cập nhật hồ sơ thất bại: %v\n", err)
		} else {
			fmt.Printf("[PASS] Hồ sơ đã cập nhật: Tên=%s, Avatar=%s\n", updatedProfile.Name, updatedProfile.AvatarURL)
		}

		// Test Đổi mật khẩu
		err = authUC.ChangePassword(testCtx, loginResult.User.ID, "Test@123456", "NewPass@789")
		if err != nil {
			fmt.Printf("[FAIL] Đổi mật khẩu thất bại: %v\n", err)
		} else {
			fmt.Printf("[PASS] Đổi mật khẩu thành công\n")
			// Đăng nhập lại bằng mật khẩu mới
			_, err = authUC.Login(testCtx, usecase.LoginInput{Email: testEmail, Password: "NewPass@789"})
			if err != nil {
				fmt.Printf("[FAIL] Không đăng nhập được bằng mật khẩu mới: %v\n", err)
			} else {
				fmt.Printf("[PASS] Đăng nhập bằng mật khẩu mới thành công\n")
			}
		}

		// Test Tìm kiếm người dùng
		results, err := userUC.SearchUsers(testCtx, "Tester", 10, 0)
		if err != nil {
			fmt.Printf("[FAIL] Tìm kiếm người dùng thất bại: %v\n", err)
		} else {
			fmt.Printf("[PASS] Tìm thấy %d người dùng chứa từ khóa 'Tester'\n", len(results))
		}

		// Test Làm mới Token
		newToken, err := authUC.RefreshToken(testCtx, loginResult.User.ID)
		if err != nil {
			fmt.Printf("[FAIL] Làm mới token thất bại: %v\n", err)
		} else {
			fmt.Printf("[PASS] Token mới: %s...\n", newToken[:20])
		}
	}

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

	// 7. Test Module Bảng (Boards + Columns)
	fmt.Println("\n--- BẮT ĐẦU CHẠY TEST BOARD + COLUMN ---")
	boardRepo := postgres.NewBoardRepo(pool)
	boardUC := usecase.NewBoardUsecase(boardRepo, projectRepo, txManager, permChecker)

	if ucCreated != nil {
		// Tạo bảng mới trong dự án (kèm 4 cột mặc định tự động)
		board, err := boardUC.CreateBoard(testCtx, dummyUserID, ucCreated.ID, "Sprint Board")
		if err != nil {
			fmt.Printf("[FAIL] Tạo bảng thất bại: %v\n", err)
		} else {
			fmt.Printf("[PASS] Đã tạo bảng: %s (ID: %s)\n", board.Name, board.ID)

			// Lấy bảng kèm danh sách cột
			_, cols, err := boardUC.GetBoard(testCtx, dummyUserID, board.ID)
			if err != nil {
				fmt.Printf("[FAIL] Lấy chi tiết bảng thất bại: %v\n", err)
			} else {
				fmt.Printf("[PASS] Bảng có %d cột mặc định:", len(cols))
				for _, c := range cols {
					fmt.Printf(" [%s -> %s]", c.Name, c.StatusMap)
				}
				fmt.Println()
			}

			// Sắp xếp lại cột (đảo To Do và Done)
			if len(cols) >= 4 {
				reorder := []string{cols[3].ID, cols[1].ID, cols[2].ID, cols[0].ID}
				err = boardUC.ReorderColumns(testCtx, dummyUserID, board.ID, reorder)
				if err != nil {
					fmt.Printf("[FAIL] Sắp xếp lại cột thất bại: %v\n", err)
				} else {
					fmt.Printf("[PASS] Đã sắp xếp lại thứ tự cột thành công\n")
				}
			}
		}

		// Liệt kê tất cả bảng trong dự án
		boards, err := boardUC.ListBoards(testCtx, dummyUserID, ucCreated.ID)
		if err != nil {
			fmt.Printf("[FAIL] Liệt kê bảng thất bại: %v\n", err)
		} else {
			fmt.Printf("[PASS] Tổng số bảng trong dự án: %d\n", len(boards))
		}
	}

	// 8. Test Module Nhãn (Labels)
	fmt.Println("\n--- BẮT ĐẦU CHẠY TEST LABEL ---")
	labelRepo := postgres.NewLabelRepo(pool)
	issueRepo := postgres.NewIssueRepo(pool)
	labelUC := usecase.NewLabelUsecase(labelRepo, issueRepo, permChecker)

	if ucCreated != nil {
		// Tạo nhãn mới
		label, err := labelUC.CreateLabel(testCtx, dummyUserID, &domain.Label{
			ProjectID: ucCreated.ID,
			Name:      "Bug",
			Color:     "#ef4444",
		})
		if err != nil {
			fmt.Printf("[FAIL] Tạo nhãn thất bại: %v\n", err)
		} else {
			fmt.Printf("[PASS] Đã tạo nhãn: %s (Màu: %s)\n", label.Name, label.Color)
		}

		// Tạo nhãn thứ 2
		_, err = labelUC.CreateLabel(testCtx, dummyUserID, &domain.Label{
			ProjectID: ucCreated.ID,
			Name:      "Feature",
			Color:     "#22c55e",
		})
		if err != nil {
			fmt.Printf("[FAIL] Tạo nhãn thứ 2 thất bại: %v\n", err)
		}

		// Liệt kê nhãn
		labels, err := labelUC.ListLabels(testCtx, dummyUserID, ucCreated.ID)
		if err != nil {
			fmt.Printf("[FAIL] Liệt kê nhãn thất bại: %v\n", err)
		} else {
			fmt.Printf("[PASS] Tổng số nhãn trong dự án: %d\n", len(labels))
			for _, l := range labels {
				fmt.Printf("  - %s (%s)\n", l.Name, l.Color)
			}
		}

		// Test quyền: Người lạ cố tạo nhãn
		fakeUserID := "00000000-0000-0000-0000-000000000000"
		_, err = labelUC.CreateLabel(testCtx, fakeUserID, &domain.Label{
			ProjectID: ucCreated.ID,
			Name:      "Hacked Label",
		})
		if err != nil {
			fmt.Printf("[PASS] Hệ thống bảo mật đã chặn người lạ tạo nhãn: %v\n", err)
		} else {
			fmt.Printf("[FAIL] LỖ HỔNG: Người lạ tạo được nhãn!\n")
		}
	}

	fmt.Println("\n=== HOÀN THÀNH TẤT CẢ TEST ===================")
}
