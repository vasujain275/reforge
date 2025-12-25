package security

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"io"

	"golang.org/x/crypto/bcrypt"
)

// ============================================================================
// 1. PASSWORD HASHING (Bcrypt)
// ============================================================================

// HashPassword generates a bcrypt hash of the password using default cost.
// Use this before saving a user's password to the 'users' table.
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

// CheckPasswordHash compares a raw password with a bcrypt hash.
// Returns true if they match, false otherwise.
func CheckPasswordHash(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// ============================================================================
// 2. TOKEN MANAGMENT (SHA256 & Random)
// ============================================================================

// GenerateSecureToken creates a random URL-safe string of the given byte length.
// Recommended length for refresh tokens is 32 bytes (which becomes ~43 chars).
func GenerateSecureToken(length int) (string, error) {
	b := make([]byte, length)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	// URL-safe base64 prevents issues with cookie/header characters
	return base64.URLEncoding.EncodeToString(b), nil
}

// HashToken creates a SHA256 hash of a token.
// Use this to convert the raw Refresh Token from the user into the 'token_hash'
// stored in your 'refresh_tokens' table.
// NOTE: This is deterministic (same input = same output), allowing DB lookups.
func HashToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
}

// ============================================================================
// 3. GENERIC DATA ENCRYPTION (AES-GCM)
// ============================================================================
// Use these ONLY if you need to store reversible secrets (e.g., User API Keys).
// Do NOT use this for passwords (use HashPassword) or Token Lookups (use HashToken).

// Encrypt encrypts data using AES-GCM.
// key: Must be 32 bytes (for AES-256). You should load this from ENV.
func Encrypt(plaintext string, key []byte) (string, error) {
	if len(key) != 32 {
		return "", errors.New("crypto: key size must be 32 bytes for AES-256")
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	// We need a unique nonce for every encryption.
	nonce := make([]byte, gcm.NonceSize())
	if _, err = io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	// Seal encrypts and authenticates the data.
	// We prepend the nonce to the ciphertext so we can use it for decryption.
	ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.URLEncoding.EncodeToString(ciphertext), nil
}

// Decrypt decrypts data using AES-GCM.
// key: Must match the key used for encryption.
func Decrypt(cryptoText string, key []byte) (string, error) {
	if len(key) != 32 {
		return "", errors.New("crypto: key size must be 32 bytes for AES-256")
	}

	ciphertext, err := base64.URLEncoding.DecodeString(cryptoText)
	if err != nil {
		return "", err
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonceSize := gcm.NonceSize()
	if len(ciphertext) < nonceSize {
		return "", errors.New("crypto: ciphertext too short")
	}

	// Split nonce and actual ciphertext
	nonce, actualCiphertext := ciphertext[:nonceSize], ciphertext[nonceSize:]

	plaintext, err := gcm.Open(nil, nonce, actualCiphertext, nil)
	if err != nil {
		return "", err
	}

	return string(plaintext), nil
}
