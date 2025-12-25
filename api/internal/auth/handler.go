package auth

import (
	"net/http"
	"time"

	"github.com/vasujain275/reforge/internal/utils"
)

type Handler struct {
	service Service
	// Cookie settings based on if prod envirnment or not
	isProd bool
}

func NewHandler(service Service, isProd bool) *Handler {
	return &Handler{
		service: service,
		isProd:  isProd,
	}
}

type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {

	var req LoginRequest
	if err := utils.Read(r, &req); err != nil {
		utils.BadRequest(w, "Invaild Request Body", nil)
		return
	}

	userAgent := r.UserAgent()
	ip := r.RemoteAddr

	accessToken, refreshToken, err := h.service.Login(r.Context(), req.Email, req.Password, userAgent, ip)
	if err != nil {
		utils.Unauthorized(w, "Invalid Credentials")
		return
	}

	// Set Cookies
	h.setTokenCookies(w, accessToken, refreshToken)

	utils.WriteSuccess(w, http.StatusOK, map[string]string{"message": "Login Successful"})
}

func (h *Handler) Refresh(w http.ResponseWriter, r *http.Request) {
	// Get refresh token from cookie
	cookie, err := r.Cookie("refresh_token")
	if err != nil {
		utils.Unauthorized(w, "Missing Refresh Token")
		return
	}

	// Call service
	newAccessToken, err := h.service.Refresh(r.Context(), cookie.Value)
	if err != nil {
		// If refresh fails, clear cookies so the client knows they are logged out
		h.clearCookies(w)
		utils.Unauthorized(w, "Invalid or expired token")
		return
	}

	// Set new access token cookie
	h.setAccessTokenCookie(w, newAccessToken)

	utils.WriteSuccess(w, http.StatusOK, map[string]string{"message": "Token refreshed"})
}

func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	// Attempt to revoke from DB if cookie exists
	if cookie, err := r.Cookie("refresh_token"); err == nil {
		_ = h.service.Logout(r.Context(), cookie.Value)
	}

	// Always clear cookies on browser
	h.clearCookies(w)
	utils.WriteSuccess(w, http.StatusOK, map[string]string{"message": "Logged out"})
}

// --- Cookie Helpers ---

func (h *Handler) setTokenCookies(w http.ResponseWriter, access, refresh string) {
	h.setAccessTokenCookie(w, access)

	// Refresh Token: Long lived (30 days)
	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    refresh,
		Path:     "/",
		Expires:  time.Now().Add(30 * 24 * time.Hour),
		MaxAge:   30 * 24 * 60 * 60,
		HttpOnly: true,
		Secure:   h.isProd, // true in production (HTTPS)
		SameSite: http.SameSiteStrictMode,
	})
}

func (h *Handler) setAccessTokenCookie(w http.ResponseWriter, token string) {
	// Access Token: Short lived (15 mins)
	http.SetCookie(w, &http.Cookie{
		Name:     "access_token",
		Value:    token,
		Path:     "/", // Must be accessible to all API routes
		Expires:  time.Now().Add(15 * time.Minute),
		MaxAge:   30 * 60, // 30 Minutes
		HttpOnly: true,
		Secure:   h.isProd,
		SameSite: http.SameSiteStrictMode,
	})
}

func (h *Handler) clearCookies(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     "access_token",
		Value:    "",
		Path:     "/",
		Expires:  time.Unix(0, 0),
		MaxAge:   -1,
		HttpOnly: true,
	})

	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    "",
		Path:     "/",
		Expires:  time.Unix(0, 0),
		MaxAge:   -1,
		HttpOnly: true,
	})
}
