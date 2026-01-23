//go:build dev

package web

import (
	"io/fs"
	"os"
)

// GetStaticFiles returns nil in development mode.
// The frontend is served by Vite's dev server instead.
func GetStaticFiles() (fs.FS, error) {
	// In dev mode, check if dist exists (for local prod testing)
	if info, err := os.Stat("web/dist"); err == nil && info.IsDir() {
		return os.DirFS("web/dist"), nil
	}
	return nil, nil
}

// IsEmbedded returns false in development mode.
func IsEmbedded() bool {
	return false
}
