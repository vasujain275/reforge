//go:build !dev

package web

import (
	"embed"
	"io/fs"
)

//go:embed all:dist
var staticFiles embed.FS

// GetStaticFiles returns the embedded static files filesystem.
// In production builds, this contains the compiled React SPA.
func GetStaticFiles() (fs.FS, error) {
	return fs.Sub(staticFiles, "dist")
}

// IsEmbedded returns true if the static files are embedded (production build).
func IsEmbedded() bool {
	return true
}
