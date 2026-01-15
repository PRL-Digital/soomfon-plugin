#!/bin/bash
# Ralph Wiggin Loop Orchestrator v2
# An autonomous AI development loop for Claude Code
# Enhanced with JSON output parsing and session continuity
#
# Usage: ./ralph-loop-v2.sh [options] <prompt-file-or-folder> [max-iterations]
#
# Supports two modes:
#   FILE MODE:   ./ralph-loop-v2.sh plans/01-discovery.md 10
#   FOLDER MODE: ./ralph-loop-v2.sh plans/phase-01-discovery/ 20
#
# Folder mode expects a _manifest.md file listing sub-plans in order.
#
# Version: 2.0.0
# Changes from v1:
#   - JSON output parsing via jq for reliable extraction
#   - Session continuity with --continue flag support
#   - Enhanced completion detection (promise tags + keywords)
#   - Cost and token tracking across iterations
#   - Timing information per iteration
#   - New CLI options: --max-turns, --continue-session, --json-status

# Exit on unset variables only - we handle errors explicitly
set -u

# ============================================================================
# CONFIGURATION
# ============================================================================

INPUT_PATH=""
MAX_ITERATIONS="10"
MAX_TURNS=""              # Optional --max-turns for claude
CONTINUE_SESSION=false    # Use --continue for session continuity
JSON_STATUS=false         # Output JSON status to stdout
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="ralph-log-${TIMESTAMP}.txt"

# Global state for folder mode
SUBPLANS=()
TOTAL_SUBPLANS=0

# Command-line flags
SINGLE_ITERATION=false
STATUS_MODE=false
VERBOSE=false

# Session tracking (populated by run_claude_json)
CURRENT_SESSION_ID=""
TOTAL_COST="0"
TOTAL_INPUT_TOKENS=0
TOTAL_OUTPUT_TOKENS=0
TOTAL_DURATION_MS=0
ITERATIONS_COMPLETED=0

# Last iteration results (set by run_claude_json)
LAST_RESULT=""
LAST_SESSION_ID=""
LAST_COST="0"
LAST_INPUT_TOKENS=0
LAST_OUTPUT_TOKENS=0
LAST_DURATION_MS=0
LAST_EXIT_CODE=0
LAST_RAW_OUTPUT=""

# ============================================================================
# DEPENDENCY CHECK
# ============================================================================

# Check for required dependencies and provide install instructions if missing
check_dependencies() {
    local missing_deps=()

    # Check for jq (required for JSON parsing)
    if ! command -v jq &> /dev/null; then
        missing_deps+=("jq")
    fi

    # Check for bc (used for floating point arithmetic)
    if ! command -v bc &> /dev/null; then
        missing_deps+=("bc")
    fi

    # Check for claude CLI
    if ! command -v claude &> /dev/null; then
        missing_deps+=("claude")
    fi

    if [ ${#missing_deps[@]} -gt 0 ]; then
        printf 'Error: Required dependencies not found: %s\n\n' "${missing_deps[*]}"
        printf 'Installation instructions:\n'

        for dep in "${missing_deps[@]}"; do
            case "$dep" in
                jq)
                    printf '\n  jq (JSON processor):\n'
                    printf '    Ubuntu/Debian: sudo apt install jq\n'
                    printf '    macOS:         brew install jq\n'
                    printf '    Windows:       choco install jq\n'
                    printf '    Windows (scoop): scoop install jq\n'
                    ;;
                bc)
                    printf '\n  bc (calculator):\n'
                    printf '    Ubuntu/Debian: sudo apt install bc\n'
                    printf '    macOS:         brew install bc\n'
                    printf '    Windows:       Usually included with Git Bash\n'
                    ;;
                claude)
                    printf '\n  claude (Claude Code CLI):\n'
                    printf '    npm install -g @anthropic-ai/claude-code\n'
                    printf '    Or see: https://claude.ai/claude-code\n'
                    ;;
            esac
        done

        printf '\n'
        exit 1
    fi

    return 0
}

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

# Logging function - writes to both stdout and log file
log() {
    local message="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    printf '%s\n' "$message"
    printf '%s\n' "$message" >> "$LOG_FILE"
}

# Verbose logging - only outputs if VERBOSE is true
log_verbose() {
    if [ "$VERBOSE" = true ]; then
        log "[VERBOSE] $1"
    fi
}

# Log to file only (for large outputs)
log_file_only() {
    printf '%s\n' "$1" >> "$LOG_FILE"
}

# Safe floating point addition using bc
# Falls back to integer addition if bc fails
add_float() {
    local a="$1"
    local b="$2"
    local result

    # Ensure inputs are valid numbers
    a="${a:-0}"
    b="${b:-0}"

    result=$(printf '%s + %s\n' "$a" "$b" | bc -l 2>/dev/null)

    if [ -z "$result" ]; then
        # Fallback: try integer addition
        result=$((${a%.*} + ${b%.*}))
    fi

    printf '%s' "$result"
}

# Format duration in human-readable form
format_duration() {
    local ms="$1"
    local seconds=$((ms / 1000))
    local minutes=$((seconds / 60))
    local remaining_seconds=$((seconds % 60))

    if [ $minutes -gt 0 ]; then
        printf '%dm %ds' "$minutes" "$remaining_seconds"
    else
        printf '%ds' "$seconds"
    fi
}

# Format cost with currency symbol
format_cost() {
    local cost="$1"
    printf '$%.4f' "$cost"
}

# Show status from most recent log file or status file
show_status() {
    local latest_log
    latest_log=$(ls -t ralph-log-*.txt 2>/dev/null | head -1)

    if [ -z "$latest_log" ]; then
        printf 'No ralph-loop logs found\n'
        exit 1
    fi

    printf '=== Status from: %s ===\n\n' "$latest_log"

    # Try to extract JSON status if available
    local json_status
    json_status=$(grep -o '{"ralph_status":.*}' "$latest_log" 2>/dev/null | tail -1)

    if [ -n "$json_status" ] && command -v jq &> /dev/null; then
        printf 'Parsed Status:\n'
        printf '%s' "$json_status" | jq '.' 2>/dev/null || printf '%s\n' "$json_status"
        printf '\n'
    fi

    printf 'Recent Log Entries:\n'
    tail -30 "$latest_log"
    exit 0
}

# Output JSON status (for programmatic consumption)
output_json_status() {
    local status="$1"
    local current_subplan="${2:-0}"
    local total_subplans="${3:-0}"
    local current_file="${4:-}"

    local json_output
    json_output=$(jq -n \
        --arg status "$status" \
        --arg session_id "$CURRENT_SESSION_ID" \
        --arg total_cost "$TOTAL_COST" \
        --argjson total_input_tokens "$TOTAL_INPUT_TOKENS" \
        --argjson total_output_tokens "$TOTAL_OUTPUT_TOKENS" \
        --argjson total_duration_ms "$TOTAL_DURATION_MS" \
        --argjson iterations_completed "$ITERATIONS_COMPLETED" \
        --argjson current_subplan "$current_subplan" \
        --argjson total_subplans "$total_subplans" \
        --arg current_file "$current_file" \
        --arg timestamp "$(date -Iseconds)" \
        '{
            ralph_status: {
                status: $status,
                session_id: $session_id,
                totals: {
                    cost: $total_cost,
                    input_tokens: $total_input_tokens,
                    output_tokens: $total_output_tokens,
                    duration_ms: $total_duration_ms
                },
                progress: {
                    iterations_completed: $iterations_completed,
                    current_subplan: $current_subplan,
                    total_subplans: $total_subplans,
                    current_file: $current_file
                },
                timestamp: $timestamp
            }
        }')

    if [ "$JSON_STATUS" = true ]; then
        printf '%s\n' "$json_output"
    fi

    # Also log it for status retrieval
    log_file_only "JSON_STATUS: $json_output"
}

# Print usage and exit
usage() {
    cat << 'EOF'
Usage: ./ralph-loop-v2.sh [options] <prompt-file-or-folder> [max-iterations]

Options:
  --status              Show status from the most recent log file and exit
  --single, --single-iteration
                        Run only one iteration then exit
  --max-turns N         Limit agentic turns per Claude iteration
  --continue-session    Enable session continuity across iterations
  --json-status         Output JSON status to stdout (for programmatic use)
  --verbose             Enable verbose logging
  -h, --help            Show this help message and exit

Modes:
  FILE MODE:   ./ralph-loop-v2.sh plans/01-discovery.md 10
  FOLDER MODE: ./ralph-loop-v2.sh plans/phase-01-discovery/ 20

Folder mode expects a _manifest.md file listing sub-plans in order.
Format: 1. `filename.md` - Description

Completion Detection:
  The script detects completion via:
  - Promise tags: <promise>SUBPLAN_N_COMPLETE</promise>
  - Promise tags: <promise>PHASE_N_COMPLETE</promise>
  - Keywords: TASK_COMPLETE, SUBPLAN_COMPLETE, BLOCKED, ALL_COMPLETE

Session Continuity:
  With --continue-session, subsequent iterations within the same sub-plan
  will use Claude's --continue flag to maintain conversation context.
  Session IDs are tracked and stored in the manifest-status.md file.

Examples:
  # Run a single iteration to test
  ./ralph-loop-v2.sh --single plans/01-discovery.md

  # Check progress of a running loop
  ./ralph-loop-v2.sh --status

  # Run with session continuity and turn limits
  ./ralph-loop-v2.sh --continue-session --max-turns 50 plans/phase-01/ 25

  # Run with JSON status output for scripting
  ./ralph-loop-v2.sh --json-status plans/task.md 5
EOF
    exit 1
}

# Cleanup on exit
cleanup() {
    log "Ralph loop terminated"
    log "Final stats: $(format_cost "$TOTAL_COST") | $TOTAL_INPUT_TOKENS in / $TOTAL_OUTPUT_TOKENS out | $(format_duration "$TOTAL_DURATION_MS")"
    output_json_status "terminated" 0 0 ""
}

# Parse command-line arguments
parse_args() {
    local positional_args=()

    while [ $# -gt 0 ]; do
        case "$1" in
            --status)
                STATUS_MODE=true
                shift
                ;;
            --single|--single-iteration)
                SINGLE_ITERATION=true
                shift
                ;;
            --max-turns)
                if [ -z "${2:-}" ]; then
                    printf 'Error: --max-turns requires a numeric argument\n\n'
                    usage
                fi
                MAX_TURNS="$2"
                shift 2
                ;;
            --continue-session)
                CONTINUE_SESSION=true
                shift
                ;;
            --json-status)
                JSON_STATUS=true
                shift
                ;;
            --verbose)
                VERBOSE=true
                shift
                ;;
            -h|--help)
                usage
                ;;
            -*)
                printf 'Error: Unknown option: %s\n\n' "$1"
                usage
                ;;
            *)
                positional_args+=("$1")
                shift
                ;;
        esac
    done

    # Assign positional arguments
    if [ ${#positional_args[@]} -ge 1 ]; then
        INPUT_PATH="${positional_args[0]}"
    fi
    if [ ${#positional_args[@]} -ge 2 ]; then
        MAX_ITERATIONS="${positional_args[1]}"
    fi
}

# ============================================================================
# CLAUDE EXECUTION (JSON-BASED)
# ============================================================================

# Run Claude with JSON output and parse results
# Sets global LAST_* variables with results
# Arguments:
#   $1 - prompt_content: The prompt to send to Claude
#   $2 - use_continue (optional): "true" to use --continue flag
# Returns: exit code from claude command
run_claude_json() {
    local prompt_content="$1"
    local use_continue="${2:-false}"
    local start_time
    local end_time

    # Build claude command arguments
    local -a claude_args=()
    claude_args+=("--output-format" "json")
    claude_args+=("--dangerously-skip-permissions")

    if [ -n "$MAX_TURNS" ]; then
        claude_args+=("--max-turns" "$MAX_TURNS")
    fi

    if [ "$use_continue" = "true" ] && [ -n "$CURRENT_SESSION_ID" ]; then
        claude_args+=("--continue")
        log_verbose "Using --continue with session: $CURRENT_SESSION_ID"
    fi

    log_verbose "Claude args: ${claude_args[*]}"

    # Record start time
    start_time=$(date +%s%3N 2>/dev/null || date +%s)000

    # Run claude and capture JSON output
    local raw_output
    raw_output=$(claude "${claude_args[@]}" -p "$prompt_content" 2>&1)
    LAST_EXIT_CODE=$?
    LAST_RAW_OUTPUT="$raw_output"

    # Record end time
    end_time=$(date +%s%3N 2>/dev/null || date +%s)000

    # Calculate duration if timestamps support milliseconds
    local calculated_duration=$((end_time - start_time))
    if [ $calculated_duration -lt 0 ]; then
        calculated_duration=0
    fi

    # Parse JSON response
    if [ $LAST_EXIT_CODE -eq 0 ]; then
        # Attempt to parse JSON output
        if printf '%s' "$raw_output" | jq -e '.' > /dev/null 2>&1; then
            LAST_RESULT=$(printf '%s' "$raw_output" | jq -r '.result // empty' 2>/dev/null)
            LAST_SESSION_ID=$(printf '%s' "$raw_output" | jq -r '.session_id // empty' 2>/dev/null)
            LAST_COST=$(printf '%s' "$raw_output" | jq -r '.cost_usd // .cost // "0"' 2>/dev/null)
            LAST_INPUT_TOKENS=$(printf '%s' "$raw_output" | jq -r '.usage.input_tokens // .input_tokens // 0' 2>/dev/null)
            LAST_OUTPUT_TOKENS=$(printf '%s' "$raw_output" | jq -r '.usage.output_tokens // .output_tokens // 0' 2>/dev/null)
            LAST_DURATION_MS=$(printf '%s' "$raw_output" | jq -r '.duration_ms // .duration // 0' 2>/dev/null)

            # Use calculated duration if JSON doesn't provide it
            if [ "$LAST_DURATION_MS" = "0" ] || [ -z "$LAST_DURATION_MS" ]; then
                LAST_DURATION_MS=$calculated_duration
            fi

            # Ensure numeric values
            LAST_COST="${LAST_COST:-0}"
            LAST_INPUT_TOKENS="${LAST_INPUT_TOKENS:-0}"
            LAST_OUTPUT_TOKENS="${LAST_OUTPUT_TOKENS:-0}"
            LAST_DURATION_MS="${LAST_DURATION_MS:-0}"

            # Update session tracking
            if [ -n "$LAST_SESSION_ID" ]; then
                CURRENT_SESSION_ID="$LAST_SESSION_ID"
            fi

            # Update totals
            TOTAL_COST=$(add_float "$TOTAL_COST" "$LAST_COST")
            TOTAL_INPUT_TOKENS=$((TOTAL_INPUT_TOKENS + LAST_INPUT_TOKENS))
            TOTAL_OUTPUT_TOKENS=$((TOTAL_OUTPUT_TOKENS + LAST_OUTPUT_TOKENS))
            TOTAL_DURATION_MS=$((TOTAL_DURATION_MS + LAST_DURATION_MS))
            ITERATIONS_COMPLETED=$((ITERATIONS_COMPLETED + 1))

            # Log iteration stats
            log "Session: ${LAST_SESSION_ID:-none}"
            log "Cost: $(format_cost "$LAST_COST") | Tokens: $LAST_INPUT_TOKENS in / $LAST_OUTPUT_TOKENS out | Duration: $(format_duration "$LAST_DURATION_MS")"
            log "Running totals: $(format_cost "$TOTAL_COST") | $TOTAL_INPUT_TOKENS in / $TOTAL_OUTPUT_TOKENS out"

            # Log result preview (truncated for display)
            local result_preview="${LAST_RESULT:0:500}"
            if [ ${#LAST_RESULT} -gt 500 ]; then
                result_preview="${result_preview}..."
            fi
            log "Result preview: $result_preview"
        else
            # JSON parsing failed - treat as plain text output
            log "Warning: Claude output was not valid JSON, treating as plain text"
            LAST_RESULT="$raw_output"
            LAST_SESSION_ID=""
            LAST_COST="0"
            LAST_INPUT_TOKENS=0
            LAST_OUTPUT_TOKENS=0
            LAST_DURATION_MS=$calculated_duration
        fi
    else
        log "Claude exited with error code $LAST_EXIT_CODE"
        LAST_RESULT="$raw_output"
        LAST_SESSION_ID=""
        LAST_DURATION_MS=$calculated_duration
    fi

    # Write full result to log file
    log_file_only "=== FULL CLAUDE OUTPUT (iteration $ITERATIONS_COMPLETED) ==="
    log_file_only "$LAST_RESULT"
    log_file_only "=== END OUTPUT ==="
    log_file_only ""

    return $LAST_EXIT_CODE
}

# ============================================================================
# COMPLETION DETECTION
# ============================================================================

# Check if output contains completion indicators
# Supports both promise tags and keyword markers
# Arguments:
#   $1 - result: The Claude output to check
#   $2 - subplan_index (optional): Current sub-plan index for specific matching
# Returns: 0 (true) if completion detected, 1 (false) otherwise
check_completion_json() {
    local result="$1"
    local subplan_index="${2:-0}"

    # Check for specific sub-plan completion promise tag
    if printf '%s' "$result" | grep -qE "<promise>SUBPLAN_${subplan_index}_COMPLETE</promise>"; then
        log "Completion detected: SUBPLAN_${subplan_index}_COMPLETE promise tag"
        return 0
    fi

    # Check for generic sub-plan completion pattern
    if printf '%s' "$result" | grep -qE '<promise>SUBPLAN_[0-9]+_COMPLETE</promise>'; then
        log "Completion detected: Generic SUBPLAN_N_COMPLETE promise tag"
        return 0
    fi

    # Check for phase-level completion
    if printf '%s' "$result" | grep -qE '<promise>PHASE_[0-9]+_COMPLETE</promise>'; then
        log "Completion detected: PHASE_N_COMPLETE promise tag"
        return 0
    fi

    # Check for task completion keyword
    if printf '%s' "$result" | grep -qiE '\bTASK_COMPLETE\b'; then
        log "Completion detected: TASK_COMPLETE keyword"
        return 0
    fi

    # Check for sub-plan completion keyword
    if printf '%s' "$result" | grep -qiE '\bSUBPLAN_COMPLETE\b'; then
        log "Completion detected: SUBPLAN_COMPLETE keyword"
        return 0
    fi

    # Check for all complete keyword
    if printf '%s' "$result" | grep -qiE '\bALL_COMPLETE\b'; then
        log "Completion detected: ALL_COMPLETE keyword"
        return 0
    fi

    return 1
}

# Check if output indicates a blocked state
# Returns: 0 (true) if blocked, 1 (false) otherwise
check_blocked() {
    local result="$1"

    if printf '%s' "$result" | grep -qiE '\bBLOCKED\b'; then
        log "Blocked state detected"
        return 0
    fi

    if printf '%s' "$result" | grep -qE '<promise>BLOCKED</promise>'; then
        log "Blocked state detected via promise tag"
        return 0
    fi

    return 1
}

# ============================================================================
# CORE FUNCTIONS
# ============================================================================

# Detect input type: "file", "folder", or "invalid"
detect_input_type() {
    local path="$1"
    if [ -d "$path" ]; then
        printf 'folder'
    elif [ -f "$path" ]; then
        printf 'file'
    else
        printf 'invalid'
    fi
}

# Parse _manifest.md and populate SUBPLANS array
# Expects format: 1. `filename.md` - Description
# POSIX-compliant: no -P flag, uses sed instead
parse_manifest() {
    local manifest_file="$1"

    if [ ! -f "$manifest_file" ]; then
        log "Error: _manifest.md not found: $manifest_file"
        return 1
    fi

    # Clear the array
    SUBPLANS=()

    # Read manifest line by line, extract filenames
    # Pattern: starts with digit(s), dot, space, backtick, capture until .md`, then backtick
    while IFS= read -r line; do
        # Skip empty lines and lines that don't match the pattern
        # Use sed to extract filename between backticks that ends in .md
        local filename
        filename=$(printf '%s' "$line" | sed -n 's/^[0-9][0-9]*\.[[:space:]]*`\([^`]*\.md\)`.*/\1/p')
        if [ -n "$filename" ]; then
            SUBPLANS+=("$filename")
        fi
    done < "$manifest_file"

    TOTAL_SUBPLANS=${#SUBPLANS[@]}

    if [ "$TOTAL_SUBPLANS" -eq 0 ]; then
        log "Error: No sub-plans found in manifest"
        log "Expected format: 1. \`filename.md\` - Description"
        return 1
    fi

    return 0
}

# Get current sub-plan index from manifest-status.md (1-based)
# Returns 1 if no status file or parsing fails
get_current_subplan_index() {
    local folder="$1"
    local status_file="$folder/manifest-status.md"

    if [ ! -f "$status_file" ]; then
        printf '1'
        return
    fi

    # POSIX-compliant extraction using sed
    local index
    index=$(sed -n 's/^Current Sub-Plan:[[:space:]]*\([0-9][0-9]*\).*/\1/p' "$status_file" | head -n 1)

    if [ -n "$index" ]; then
        printf '%s' "$index"
    else
        printf '1'
    fi
}

# Get stored session ID from manifest-status.md
get_stored_session_id() {
    local folder="$1"
    local status_file="$folder/manifest-status.md"

    if [ ! -f "$status_file" ]; then
        printf ''
        return
    fi

    local session_id
    session_id=$(sed -n 's/^Session ID:[[:space:]]*\(.*\)/\1/p' "$status_file" | head -n 1)
    printf '%s' "$session_id"
}

# Update manifest-status.md with current progress (enhanced with session info)
update_manifest_status() {
    local folder="$1"
    local current_index="$2"
    local total="$3"
    local iteration="$4"
    local status_file="$folder/manifest-status.md"

    {
        printf '# Manifest Status\n'
        printf 'Last Updated: %s\n' "$(date '+%Y-%m-%d %H:%M:%S')"
        printf 'Current Sub-Plan: %s\n' "$current_index"
        printf 'Total Sub-Plans: %s\n' "$total"
        printf 'Global Iteration: %s\n' "$iteration"
        printf 'Max Iterations: %s\n' "$MAX_ITERATIONS"
        printf '\n'
        printf '## Session Info\n'
        printf 'Session ID: %s\n' "${CURRENT_SESSION_ID:-none}"
        printf 'Continue Session: %s\n' "$CONTINUE_SESSION"
        printf '\n'
        printf '## Cost & Usage\n'
        printf 'Total Cost: %s\n' "$(format_cost "$TOTAL_COST")"
        printf 'Total Input Tokens: %s\n' "$TOTAL_INPUT_TOKENS"
        printf 'Total Output Tokens: %s\n' "$TOTAL_OUTPUT_TOKENS"
        printf 'Total Duration: %s\n' "$(format_duration "$TOTAL_DURATION_MS")"
        printf '\n'
        printf '## Progress\n'

        # Add status for each sub-plan
        local i=1
        for subplan in "${SUBPLANS[@]}"; do
            local status="PENDING"
            if [ "$i" -lt "$current_index" ]; then
                status="COMPLETE"
            elif [ "$i" -eq "$current_index" ]; then
                status="IN_PROGRESS"
            fi
            printf '%d. `%s` - %s\n' "$i" "$subplan" "$status"
            i=$((i + 1))
        done
    } > "$status_file"
}

# Process a single prompt file for one iteration (v2 with JSON)
# Arguments: prompt_file, iteration_num, max_iterations, subplan_index (optional), is_continuation (optional)
# Returns: 0 on success, 1 on error, 2 on completion detected, 3 on blocked
process_single_iteration_v2() {
    local prompt_file="$1"
    local iteration="$2"
    local max_iter="$3"
    local subplan_index="${4:-0}"
    local is_continuation="${5:-false}"

    # Read prompt content
    if [ ! -f "$prompt_file" ]; then
        log "Error: Prompt file not found: $prompt_file"
        return 1
    fi

    local prompt_content
    prompt_content=$(cat "$prompt_file")

    if [ -z "$prompt_content" ]; then
        log "Error: Prompt file is empty: $prompt_file"
        return 1
    fi

    log "Launching Claude with prompt from: $prompt_file"
    log_verbose "Prompt length: ${#prompt_content} characters"

    # Determine if we should use --continue
    local use_continue="false"
    if [ "$CONTINUE_SESSION" = true ] && [ "$is_continuation" = "true" ]; then
        use_continue="true"
    fi

    # Run Claude with JSON output
    run_claude_json "$prompt_content" "$use_continue"
    local claude_exit=$?

    if [ $claude_exit -ne 0 ]; then
        log "Claude iteration failed with exit code $claude_exit"
        # Don't return error for non-zero exit - might still have useful output
    fi

    # Check for blocked state
    if check_blocked "$LAST_RESULT"; then
        log "Iteration returned BLOCKED status"
        return 3
    fi

    # Check for completion in output
    if check_completion_json "$LAST_RESULT" "$subplan_index"; then
        log "Completion detected in iteration $iteration"
        return 2
    fi

    return 0
}

# ============================================================================
# MODE HANDLERS
# ============================================================================

# File mode: process a single prompt file repeatedly
run_file_mode() {
    local prompt_file="$1"
    local iteration=0
    local is_first_iteration=true

    log "File mode: Processing single prompt file"
    log "Prompt file: $prompt_file"
    log "Session continuity: $CONTINUE_SESSION"

    output_json_status "running" 0 0 "$prompt_file"

    while [ $iteration -lt "$MAX_ITERATIONS" ]; do
        iteration=$((iteration + 1))
        log ""
        log "============================================================"
        log "=== Iteration $iteration/$MAX_ITERATIONS ==="
        log "============================================================"

        local is_continuation="false"
        if [ "$is_first_iteration" = false ]; then
            is_continuation="true"
        fi

        process_single_iteration_v2 "$prompt_file" "$iteration" "$MAX_ITERATIONS" 0 "$is_continuation"
        local result=$?

        is_first_iteration=false

        case $result in
            1)
                log "Error in iteration $iteration, stopping"
                output_json_status "error" 0 0 "$prompt_file"
                return 1
                ;;
            2)
                log "Task completed in iteration $iteration"
                output_json_status "completed" 0 0 "$prompt_file"
                return 0
                ;;
            3)
                log "Task blocked in iteration $iteration, stopping"
                output_json_status "blocked" 0 0 "$prompt_file"
                return 1
                ;;
            *)
                log "Iteration $iteration completed, continuing..."
                output_json_status "running" 0 0 "$prompt_file"
                ;;
        esac

        # Brief pause between iterations
        sleep 2

        # Check for single iteration mode
        if [ "$SINGLE_ITERATION" = true ]; then
            log "Single iteration mode - stopping after first iteration"
            break
        fi
    done

    log ""
    log "File mode completed after $iteration iterations"
    log "Final stats: $(format_cost "$TOTAL_COST") | $TOTAL_INPUT_TOKENS in / $TOTAL_OUTPUT_TOKENS out | $(format_duration "$TOTAL_DURATION_MS")"
    output_json_status "max_iterations_reached" 0 0 "$prompt_file"
    return 0
}

# Folder mode: process sub-plans sequentially based on manifest
run_folder_mode() {
    local folder="$1"
    local manifest_file="$folder/_manifest.md"

    # Parse manifest
    if ! parse_manifest "$manifest_file"; then
        return 1
    fi

    log "Folder mode: Found $TOTAL_SUBPLANS sub-plans"
    local i=1
    for subplan in "${SUBPLANS[@]}"; do
        log "  $i. $subplan"
        i=$((i + 1))
    done

    # Get starting position from manifest-status.md (for resume support)
    local current_subplan
    current_subplan=$(get_current_subplan_index "$folder")

    # Ensure sub-plan index is valid (at least 1)
    if [ "$current_subplan" -lt 1 ]; then
        log "Warning: Invalid sub-plan index $current_subplan, resetting to 1"
        current_subplan=1
    fi

    # Restore session ID if continuing
    if [ "$CONTINUE_SESSION" = true ]; then
        local stored_session
        stored_session=$(get_stored_session_id "$folder")
        if [ -n "$stored_session" ]; then
            CURRENT_SESSION_ID="$stored_session"
            log "Restored session ID: $CURRENT_SESSION_ID"
        fi
    fi

    local global_iteration=0
    local subplan_iteration=0  # Track iterations within current sub-plan

    log "Starting from sub-plan $current_subplan"
    output_json_status "running" "$current_subplan" "$TOTAL_SUBPLANS" ""

    # Main loop across all sub-plans
    while [ $global_iteration -lt "$MAX_ITERATIONS" ] && [ "$current_subplan" -le "$TOTAL_SUBPLANS" ]; do
        global_iteration=$((global_iteration + 1))
        subplan_iteration=$((subplan_iteration + 1))

        # Get current sub-plan file (0-indexed array, so subtract 1)
        local array_index=$((current_subplan - 1))
        local current_file="${SUBPLANS[$array_index]}"
        local current_path="$folder/$current_file"

        log ""
        log "============================================================"
        log "=== Iteration $global_iteration/$MAX_ITERATIONS ==="
        log "=== Sub-plan $current_subplan/$TOTAL_SUBPLANS: $current_file ==="
        log "=== Sub-plan iteration: $subplan_iteration ==="
        log "============================================================"

        # Update manifest status
        update_manifest_status "$folder" "$current_subplan" "$TOTAL_SUBPLANS" "$global_iteration"
        output_json_status "running" "$current_subplan" "$TOTAL_SUBPLANS" "$current_file"

        # Determine if this is a continuation within the same sub-plan
        local is_continuation="false"
        if [ "$subplan_iteration" -gt 1 ]; then
            is_continuation="true"
        fi

        # Process this sub-plan iteration
        process_single_iteration_v2 "$current_path" "$global_iteration" "$MAX_ITERATIONS" "$current_subplan" "$is_continuation"
        local result=$?

        case $result in
            1)
                log "Error processing sub-plan $current_subplan, stopping"
                output_json_status "error" "$current_subplan" "$TOTAL_SUBPLANS" "$current_file"
                return 1
                ;;
            2)
                # Completion detected - advance to next sub-plan
                log "Sub-plan $current_subplan COMPLETE! Advancing to next sub-plan."
                current_subplan=$((current_subplan + 1))
                subplan_iteration=0  # Reset sub-plan iteration counter

                # Clear session for new sub-plan (unless we want cross-subplan continuity)
                if [ "$CONTINUE_SESSION" = true ]; then
                    log "Clearing session for new sub-plan"
                    CURRENT_SESSION_ID=""
                fi

                update_manifest_status "$folder" "$current_subplan" "$TOTAL_SUBPLANS" "$global_iteration"
                output_json_status "subplan_complete" "$current_subplan" "$TOTAL_SUBPLANS" ""
                ;;
            3)
                log "Sub-plan $current_subplan BLOCKED, stopping"
                output_json_status "blocked" "$current_subplan" "$TOTAL_SUBPLANS" "$current_file"
                return 1
                ;;
            *)
                log "Sub-plan $current_subplan iteration $subplan_iteration completed, continuing..."
                ;;
        esac

        # Brief pause between iterations
        sleep 2

        # Check for single iteration mode
        if [ "$SINGLE_ITERATION" = true ]; then
            log "Single iteration mode - stopping after first iteration"
            break
        fi
    done

    # Final status
    log ""
    log "============================================================"
    log "=== FOLDER MODE COMPLETE ==="
    log "============================================================"

    if [ "$current_subplan" -gt "$TOTAL_SUBPLANS" ]; then
        log "All $TOTAL_SUBPLANS sub-plans completed!"
        log "<promise>FOLDER_COMPLETE</promise>"
        log "Final stats: $(format_cost "$TOTAL_COST") | $TOTAL_INPUT_TOKENS in / $TOTAL_OUTPUT_TOKENS out | $(format_duration "$TOTAL_DURATION_MS")"
        output_json_status "all_complete" "$TOTAL_SUBPLANS" "$TOTAL_SUBPLANS" ""
        return 0
    else
        log "Ralph loop stopped after $global_iteration iterations"
        log "Stopped at sub-plan $current_subplan/$TOTAL_SUBPLANS"
        log "Final stats: $(format_cost "$TOTAL_COST") | $TOTAL_INPUT_TOKENS in / $TOTAL_OUTPUT_TOKENS out | $(format_duration "$TOTAL_DURATION_MS")"
        log "To resume: ./ralph-loop-v2.sh $folder $((MAX_ITERATIONS - global_iteration))"
        output_json_status "max_iterations_reached" "$current_subplan" "$TOTAL_SUBPLANS" ""
        return 0
    fi
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
    # Parse command-line arguments
    parse_args "$@"

    # Handle --status mode (check before requiring INPUT_PATH)
    if [ "$STATUS_MODE" = true ]; then
        show_status
    fi

    # Check dependencies (skip for status mode which already exited)
    check_dependencies

    # Handle --single mode
    if [ "$SINGLE_ITERATION" = true ]; then
        MAX_ITERATIONS=1
    fi

    # Validate input
    if [ -z "$INPUT_PATH" ]; then
        printf 'Error: Prompt file or folder required.\n\n'
        usage
    fi

    # Convert Windows paths to Unix style if needed (for MSYS/Git Bash)
    # Handle both C:\path and /c/path formats
    if [[ "$INPUT_PATH" == *\\* ]]; then
        INPUT_PATH=$(printf '%s' "$INPUT_PATH" | sed 's/\\/\//g')
    fi

    # Set up cleanup trap
    trap cleanup EXIT

    # Detect mode
    local mode
    mode=$(detect_input_type "$INPUT_PATH")

    if [ "$mode" = "invalid" ]; then
        printf 'Error: Path not found: %s\n' "$INPUT_PATH"
        exit 1
    fi

    # Initialize log file with header
    {
        printf '# Ralph Wiggin Loop v2 Log\n'
        printf 'Started: %s\n' "$(date '+%Y-%m-%d %H:%M:%S')"
        printf 'Input: %s\n' "$INPUT_PATH"
        printf 'Mode: %s\n' "$mode"
        printf 'Max Iterations: %s\n' "$MAX_ITERATIONS"
        printf 'Max Turns: %s\n' "${MAX_TURNS:-unlimited}"
        printf 'Continue Session: %s\n' "$CONTINUE_SESSION"
        printf 'JSON Status: %s\n' "$JSON_STATUS"
        printf '\n---\n\n'
    } >> "$LOG_FILE"

    log "Starting Ralph loop v2 (MODE: $mode) with: $INPUT_PATH"
    log "Max iterations: $MAX_ITERATIONS"
    if [ -n "$MAX_TURNS" ]; then
        log "Max turns per iteration: $MAX_TURNS"
    fi
    log "Session continuity: $CONTINUE_SESSION"
    log "Log file: $LOG_FILE"
    log ""

    output_json_status "starting" 0 0 ""

    # Run appropriate mode
    case "$mode" in
        file)
            run_file_mode "$INPUT_PATH"
            ;;
        folder)
            run_folder_mode "$INPUT_PATH"
            ;;
    esac

    local exit_code=$?

    log ""
    log "Ralph loop v2 finished with exit code $exit_code"
    exit $exit_code
}

# Run main with all arguments
main "$@"
