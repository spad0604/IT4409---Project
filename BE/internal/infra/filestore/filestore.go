package filestore

import (
	"fmt"
	"io"
	"os"
	"path/filepath"

	"github.com/google/uuid"
)

// FileStore quản lý lưu trữ file cục bộ.
type FileStore struct {
	baseDir string
}

// New tạo FileStore mới, tự tạo thư mục nếu chưa có.
func New(baseDir string) (*FileStore, error) {
	if baseDir == "" {
		baseDir = "uploads"
	}
	if err := os.MkdirAll(baseDir, 0755); err != nil {
		return nil, fmt.Errorf("filestore: cannot create dir %s: %w", baseDir, err)
	}
	return &FileStore{baseDir: baseDir}, nil
}

// Save lưu file từ reader, trả về đường dẫn tương đối trong storage.
func (fs *FileStore) Save(filename string, r io.Reader) (storagePath string, err error) {
	ext := filepath.Ext(filename)
	storagePath = uuid.New().String() + ext

	fullPath := filepath.Join(fs.baseDir, storagePath)
	f, err := os.Create(fullPath)
	if err != nil {
		return "", err
	}
	defer f.Close()

	if _, err := io.Copy(f, r); err != nil {
		os.Remove(fullPath)
		return "", err
	}
	return storagePath, nil
}

// FullPath trả về đường dẫn đầy đủ cho 1 storagePath.
func (fs *FileStore) FullPath(storagePath string) string {
	return filepath.Join(fs.baseDir, storagePath)
}

// Remove xóa file khỏi storage.
func (fs *FileStore) Remove(storagePath string) error {
	return os.Remove(fs.FullPath(storagePath))
}
