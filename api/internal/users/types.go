package users

type CreateUserBody struct {
	Email    string `json:"email"    validate:"required,email"`
	Password string `json:"password" validate:"required"`
	Name     string `json:"name"     validate:"omitempty"`
}
