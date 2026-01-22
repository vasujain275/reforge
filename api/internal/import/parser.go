package dataimport

import (
	"encoding/csv"
	"fmt"
	"io"
	"strings"
)

// Parser handles CSV parsing and validation
type Parser struct{}

// NewParser creates a new CSV parser
func NewParser() *Parser {
	return &Parser{}
}

// expectedHeaders defines the required CSV column headers
var expectedHeaders = []string{"title", "url", "source", "difficulty", "patterns"}

// ParseCSV reads and validates a CSV file, returning parsed problems
func (p *Parser) ParseCSV(reader io.Reader) ([]ParsedProblem, []InvalidRow, error) {
	csvReader := csv.NewReader(reader)
	csvReader.TrimLeadingSpace = true
	csvReader.FieldsPerRecord = -1 // Allow variable fields

	// Read header row
	headers, err := csvReader.Read()
	if err != nil {
		return nil, nil, fmt.Errorf("failed to read CSV headers: %w", err)
	}

	// Build column index map
	colIndex := make(map[string]int)
	for i, h := range headers {
		colIndex[strings.ToLower(strings.TrimSpace(h))] = i
	}

	// Validate required columns exist
	if _, ok := colIndex["title"]; !ok {
		return nil, nil, fmt.Errorf("CSV must have 'title' column")
	}
	if _, ok := colIndex["difficulty"]; !ok {
		return nil, nil, fmt.Errorf("CSV must have 'difficulty' column")
	}

	var problems []ParsedProblem
	var invalidRows []InvalidRow
	rowNum := 1 // Start at 1 (header is row 0)

	for {
		rowNum++
		record, err := csvReader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			invalidRows = append(invalidRows, InvalidRow{
				RowNumber: rowNum,
				Error:     fmt.Sprintf("CSV parse error: %v", err),
			})
			continue
		}

		// Parse row into CSVRow
		row := p.recordToCSVRow(record, colIndex)

		// Validate row
		if err := p.validateRow(row, rowNum); err != nil {
			invalidRows = append(invalidRows, InvalidRow{
				RowNumber: rowNum,
				Error:     err.Error(),
				Title:     row.Title,
			})
			continue
		}

		// Parse patterns
		patterns := p.parsePatterns(row.Patterns)

		problems = append(problems, ParsedProblem{
			Title:      strings.TrimSpace(row.Title),
			URL:        strings.TrimSpace(row.URL),
			Source:     strings.TrimSpace(row.Source),
			Difficulty: strings.ToLower(strings.TrimSpace(row.Difficulty)),
			Patterns:   patterns,
			RowNumber:  rowNum,
		})
	}

	return problems, invalidRows, nil
}

// recordToCSVRow converts a CSV record to a CSVRow using column indices
func (p *Parser) recordToCSVRow(record []string, colIndex map[string]int) CSVRow {
	getField := func(name string) string {
		if idx, ok := colIndex[name]; ok && idx < len(record) {
			return record[idx]
		}
		return ""
	}

	return CSVRow{
		Title:      getField("title"),
		URL:        getField("url"),
		Source:     getField("source"),
		Difficulty: getField("difficulty"),
		Patterns:   getField("patterns"),
	}
}

// validateRow checks if a row has valid data
func (p *Parser) validateRow(row CSVRow, rowNum int) error {
	// Title is required
	if strings.TrimSpace(row.Title) == "" {
		return fmt.Errorf("title is required")
	}

	// Validate difficulty
	diff := strings.ToLower(strings.TrimSpace(row.Difficulty))
	if diff != "easy" && diff != "medium" && diff != "hard" {
		return fmt.Errorf("difficulty must be 'easy', 'medium', or 'hard', got '%s'", row.Difficulty)
	}

	return nil
}

// parsePatterns splits and cleans pattern names
func (p *Parser) parsePatterns(patternsStr string) []string {
	if strings.TrimSpace(patternsStr) == "" {
		return nil
	}

	// Split by comma
	parts := strings.Split(patternsStr, ",")
	var patterns []string

	for _, part := range parts {
		// Clean each pattern name
		pattern := strings.TrimSpace(part)
		// Remove surrounding quotes if present
		pattern = strings.Trim(pattern, "\"'")
		pattern = strings.TrimSpace(pattern)

		if pattern != "" {
			patterns = append(patterns, pattern)
		}
	}

	return patterns
}

// GetUniquePatterns extracts all unique pattern names from parsed problems
func (p *Parser) GetUniquePatterns(problems []ParsedProblem) []string {
	patternSet := make(map[string]struct{})

	for _, prob := range problems {
		for _, pattern := range prob.Patterns {
			// Normalize to avoid duplicates like "Array" and "array"
			normalized := strings.TrimSpace(pattern)
			if normalized != "" {
				patternSet[normalized] = struct{}{}
			}
		}
	}

	patterns := make([]string, 0, len(patternSet))
	for pattern := range patternSet {
		patterns = append(patterns, pattern)
	}

	return patterns
}

// CountDifficulties returns a map of difficulty -> count
func (p *Parser) CountDifficulties(problems []ParsedProblem) map[string]int {
	counts := map[string]int{
		"easy":   0,
		"medium": 0,
		"hard":   0,
	}

	for _, prob := range problems {
		counts[prob.Difficulty]++
	}

	return counts
}
