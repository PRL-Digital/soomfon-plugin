#!/bin/bash
# Ralph Wiggin Loop Orchestrator
# An autonomous AI development loop for Claude Code
#
# Usage: ./ralph-loop.sh <prompt-file-or-folder> [max-iterations]
#
# Supports two modes:
#   FILE MODE:   ./ralph-loop.sh plans/01-discovery.md 10
#   FOLDER MODE: ./ralph-loop.sh plans/phase-01-discovery/ 20
#
# Folder mode expects a _manifest.md file listing sub-plans in order.

# Exit on unset variables only - we handle errors explicitly
set -u

# ============================================================================
# CONFIGURATION
# ============================================================================

INPUT_PATH=""
MAX_ITERATIONS="10"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="ralph-log-${TIMESTAMP}.txt"

# Global state for folder mode
SUBPLANS=()
TOTAL_SUBPLANS=0

# Command-line flags
SINGLE_ITERATION=false
STATUS_MODE=false

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

# Logging function - writes to both stdout and log file
log() {
    local message="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    printf '%s\n' "$message"
    printf '%s\n' "$message" >> "$LOG_FILE"
}

# Show status from most recent log file
show_status() {
    local latest_log=$(ls -t ralph-log-*.txt 2>/dev/null | head -1)
    if [ -z "$latest_log" ]; then
        echo "No ralph-loop logs found"
        exit 1
    fi
    echo "=== Status from: $latest_log ==="
    tail -30 "$latest_log"
    exit 0
}

# Print usage and exit
usage() {
    cat << 'EOF'
Usage: ./ralph-loop.sh [options] <prompt-file-or-folder> [max-iterations]

Options:
  --status              Show status from the most recent log file and exit
  --single, --single-iteration
                        Run only one iteration then exit
  -h, --help            Show this help message and exit

Modes:
  FILE MODE:   ./ralph-loop.sh plans/01-discovery.md 10
  FOLDER MODE: ./ralph-loop.sh plans/phase-01-discovery/ 20

Folder mode expects a _manifest.md file listing sub-plans in order.
Format: 1. `filename.md` - Description

Recommended Claude usage patterns:
  # Run a single iteration to test
  ./ralph-loop.sh --single plans/01-discovery.md

  # Check progress of a running loop
  ./ralph-loop.sh --status

  # Run full loop with custom max iterations
  ./ralph-loop.sh plans/phase-01/ 25
EOF
    exit 1
}

# Cleanup on exit
cleanup() {
    log "Ralph loop terminated"
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

# Update manifest-status.md with current progress
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
        printf '\n## Progress\n'

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

# Check if output contains completion promise tag
# Returns 0 (true) if completion detected, 1 (false) otherwise
check_completion() {
    local output="$1"
    local subplan_index="${2:-0}"

    # Check for specific sub-plan completion
    if printf '%s' "$output" | grep -q "<promise>SUBPLAN_${subplan_index}_COMPLETE</promise>"; then
        return 0
    fi

    # Check for generic sub-plan completion pattern
    if printf '%s' "$output" | grep -q '<promise>SUBPLAN_[0-9]*_COMPLETE</promise>'; then
        return 0
    fi

    # Check for phase-level completion
    if printf '%s' "$output" | grep -q '<promise>PHASE_[0-9]*_COMPLETE</promise>'; then
        return 0
    fi

    return 1
}

# Run a single Claude iteration and capture output
# Arguments: prompt_content, output_file (optional)
# Returns: exit code from claude command
run_claude_iteration() {
    local prompt_content="$1"
    local output_file="${2:-}"
    local exit_code=0

    if [ -n "$output_file" ]; then
        # Capture output to file while still showing it
        claude "$prompt_content" --dangerously-skip-permissions 2>&1 | while IFS= read -r line; do
            printf '%s\n' "$line"
            printf '%s\n' "$line" >> "$output_file"
        done
        exit_code=${PIPESTATUS[0]:-0}
    else
        # Simple execution without capture
        claude "$prompt_content" --dangerously-skip-permissions
        exit_code=$?
    fi

    return $exit_code
}

# Process a single prompt file for one iteration
# Arguments: prompt_file, iteration_num, max_iterations, subplan_index (optional)
# Returns: 0 on success, 1 on error, 2 on completion detected
process_single_iteration() {
    local prompt_file="$1"
    local iteration="$2"
    local max_iter="$3"
    local subplan_index="${4:-0}"

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

    # Create temp file for output capture (folder mode needs this for completion detection)
    local output_file=""
    local completion_detected=0

    if [ "$subplan_index" -gt 0 ]; then
        output_file=$(mktemp)
        # Ensure cleanup of temp file
        trap "rm -f '$output_file'" RETURN
    fi

    # Run Claude
    local claude_exit=0
    if [ -n "$output_file" ]; then
        run_claude_iteration "$prompt_content" "$output_file"
        claude_exit=$?

        # Check for completion in output
        if [ -f "$output_file" ] && check_completion "$(cat "$output_file")" "$subplan_index"; then
            completion_detected=1
        fi

        rm -f "$output_file"
    else
        run_claude_iteration "$prompt_content"
        claude_exit=$?
    fi

    if [ $claude_exit -ne 0 ]; then
        log "Claude exited with code $claude_exit"
    fi

    if [ $completion_detected -eq 1 ]; then
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

    log "File mode: Processing single prompt file"
    log "Prompt file: $prompt_file"

    while [ $iteration -lt "$MAX_ITERATIONS" ]; do
        iteration=$((iteration + 1))
        log "=== Iteration $iteration/$MAX_ITERATIONS ==="

        process_single_iteration "$prompt_file" "$iteration" "$MAX_ITERATIONS"
        local result=$?

        if [ $result -eq 1 ]; then
            log "Error in iteration $iteration, stopping"
            return 1
        fi

        log "Iteration $iteration completed"

        # Brief pause between iterations
        sleep 2
    done

    log "File mode completed after $iteration iterations"
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
    local global_iteration=0

    log "Starting from sub-plan $current_subplan"

    # Main loop across all sub-plans
    while [ $global_iteration -lt "$MAX_ITERATIONS" ] && [ "$current_subplan" -le "$TOTAL_SUBPLANS" ]; do
        global_iteration=$((global_iteration + 1))

        # Get current sub-plan file (0-indexed array, so subtract 1)
        local array_index=$((current_subplan - 1))
        local current_file="${SUBPLANS[$array_index]}"
        local current_path="$folder/$current_file"

        log "=== Iteration $global_iteration/$MAX_ITERATIONS (Sub-plan $current_subplan/$TOTAL_SUBPLANS: $current_file) ==="

        # Update manifest status
        update_manifest_status "$folder" "$current_subplan" "$TOTAL_SUBPLANS" "$global_iteration"

        # Process this sub-plan iteration
        process_single_iteration "$current_path" "$global_iteration" "$MAX_ITERATIONS" "$current_subplan"
        local result=$?

        if [ $result -eq 1 ]; then
            log "Error processing sub-plan $current_subplan, stopping"
            return 1
        elif [ $result -eq 2 ]; then
            # Completion detected
            log "Sub-plan $current_subplan COMPLETE! Advancing to next sub-plan."
            current_subplan=$((current_subplan + 1))
            update_manifest_status "$folder" "$current_subplan" "$TOTAL_SUBPLANS" "$global_iteration"
        else
            log "Sub-plan $current_subplan iteration completed, continuing..."
        fi

        # Brief pause between iterations
        sleep 2
    done

    # Final status
    if [ "$current_subplan" -gt "$TOTAL_SUBPLANS" ]; then
        log "All $TOTAL_SUBPLANS sub-plans completed!"
        log "<promise>FOLDER_COMPLETE</promise>"
        return 0
    else
        log "Ralph loop stopped after $global_iteration iterations"
        log "Stopped at sub-plan $current_subplan/$TOTAL_SUBPLANS"
        log "To resume: ./ralph-loop.sh $folder $((MAX_ITERATIONS - global_iteration))"
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

    log "Starting Ralph loop (MODE: $mode) with: $INPUT_PATH"
    log "Max iterations: $MAX_ITERATIONS"
    log "Log file: $LOG_FILE"

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
    log "Ralph loop finished with exit code $exit_code"
    exit $exit_code
}

# Run main with all arguments
main "$@"
