package settings

import (
	"net/http"

	"github.com/vasujain275/reforge/internal/utils"
)

type Handler struct {
	service Service
}

func NewHandler(service Service) *Handler {
	return &Handler{
		service: service,
	}
}

func (h *Handler) GetScoringWeights(w http.ResponseWriter, r *http.Request) {
	weights, err := h.service.GetScoringWeights(r.Context())
	if err != nil {
		utils.InternalServerError(w, err.Error())
		return
	}

	utils.Write(w, http.StatusOK, weights)
}

func (h *Handler) GetDefaultWeights(w http.ResponseWriter, r *http.Request) {
	weights := h.service.GetDefaultWeights()
	utils.Write(w, http.StatusOK, weights)
}

func (h *Handler) UpdateScoringWeights(w http.ResponseWriter, r *http.Request) {
	var body UpdateScoringWeightsBody
	if err := utils.Read(r, &body); err != nil {
		utils.BadRequest(w, err.Error(), nil)
		return
	}

	weights, err := h.service.UpdateScoringWeights(r.Context(), body)
	if err != nil {
		utils.InternalServerError(w, err.Error())
		return
	}

	utils.Write(w, http.StatusOK, weights)
}
