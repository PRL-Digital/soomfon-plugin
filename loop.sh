#!/bin/bash
set +e  # Don't exit on command failures

# ============================================================================
# COLORS AND FORMATTING
# ============================================================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m' # No Color

# Check if terminal supports colors
if [ -t 1 ] && [ "$(tput colors 2>/dev/null || echo 0)" -ge 8 ]; then
    USE_COLORS=1
else
    USE_COLORS=0
    RED='' GREEN='' YELLOW='' BLUE='' CYAN='' MAGENTA='' BOLD='' DIM='' NC=''
fi

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================
timestamp() {
    date "+%H:%M:%S"
}

# ============================================================================
# STREAM-JSON PARSER
# ============================================================================
# Parses Claude's stream-json output and displays it nicely
# Requires jq for JSON parsing; falls back to raw output if unavailable
parse_stream_json() {
    # Check if jq is available
    if ! command -v jq &> /dev/null; then
        echo -e "${YELLOW}[WARN] jq not found - showing raw output${NC}"
        cat
        return
    fi

    local current_text=""
    local line_count=0

    while IFS= read -r line || [ -n "$line" ]; do
        # Skip empty lines
        [ -z "$line" ] && continue

        # Parse the JSON line
        local msg_type=$(echo "$line" | jq -r '.type // empty' 2>/dev/null)

        case "$msg_type" in
            "assistant")
                # Assistant message - extract text content
                local content=$(echo "$line" | jq -r '
                    .message.content[]? |
                    select(.type == "text") |
                    .text // empty
                ' 2>/dev/null)
                if [ -n "$content" ]; then
                    echo -e "${GREEN}${BOLD}[Assistant]${NC}"
                    echo -e "${GREEN}$content${NC}"
                    echo ""
                fi
                ;;

            "content_block_start")
                # Start of a content block (text or tool_use)
                local block_type=$(echo "$line" | jq -r '.content_block.type // empty' 2>/dev/null)
                if [ "$block_type" = "tool_use" ]; then
                    local tool_name=$(echo "$line" | jq -r '.content_block.name // "unknown"' 2>/dev/null)
                    echo -e "${CYAN}${BOLD}[Tool Call]${NC} ${CYAN}$tool_name${NC}"
                fi
                ;;

            "content_block_delta")
                # Streaming delta - accumulate text or show tool input
                local delta_type=$(echo "$line" | jq -r '.delta.type // empty' 2>/dev/null)
                if [ "$delta_type" = "text_delta" ]; then
                    local text=$(echo "$line" | jq -r '.delta.text // empty' 2>/dev/null)
                    if [ -n "$text" ]; then
                        # Print text without newline for streaming effect
                        printf "%s" "$text"
                    fi
                elif [ "$delta_type" = "input_json_delta" ]; then
                    # Tool input JSON delta - skip to reduce noise
                    :
                fi
                ;;

            "content_block_stop")
                # End of content block - add newline if we were streaming text
                echo ""
                ;;

            "result")
                # Final result message
                local result_text=$(echo "$line" | jq -r '
                    .result // empty
                ' 2>/dev/null)
                local is_error=$(echo "$line" | jq -r '.is_error // false' 2>/dev/null)
                local cost=$(echo "$line" | jq -r '.total_cost_usd // empty' 2>/dev/null)
                local duration=$(echo "$line" | jq -r '.duration_ms // empty' 2>/dev/null)
                local turns=$(echo "$line" | jq -r '.num_turns // empty' 2>/dev/null)

                echo ""
                if [ "$is_error" = "true" ]; then
                    echo -e "${RED}${BOLD}[Result - ERROR]${NC}"
                else
                    echo -e "${MAGENTA}${BOLD}[Result]${NC}"
                fi

                # Show stats if available
                local stats=""
                [ -n "$cost" ] && [ "$cost" != "null" ] && stats="${stats}Cost: \$${cost}  "
                [ -n "$duration" ] && [ "$duration" != "null" ] && stats="${stats}Duration: ${duration}ms  "
                [ -n "$turns" ] && [ "$turns" != "null" ] && stats="${stats}Turns: ${turns}"
                [ -n "$stats" ] && echo -e "${DIM}$stats${NC}"

                if [ -n "$result_text" ] && [ "$result_text" != "null" ]; then
                    # Truncate very long results
                    if [ ${#result_text} -gt 500 ]; then
                        echo -e "${MAGENTA}${result_text:0:500}...${NC}"
                    else
                        echo -e "${MAGENTA}$result_text${NC}"
                    fi
                fi
                echo ""
                ;;

            "system")
                # System messages (init, config, etc.)
                local sys_type=$(echo "$line" | jq -r '.subtype // empty' 2>/dev/null)
                case "$sys_type" in
                    "init")
                        local session=$(echo "$line" | jq -r '.session_id // "unknown"' 2>/dev/null)
                        echo -e "${DIM}[Session: ${session:0:8}...]${NC}"
                        ;;
                    *)
                        # Skip other system messages to reduce noise
                        ;;
                esac
                ;;

            "error")
                # Error messages
                local error_msg=$(echo "$line" | jq -r '.error.message // .error // "Unknown error"' 2>/dev/null)
                echo -e "${RED}${BOLD}[Error]${NC} ${RED}$error_msg${NC}"
                ;;

            *)
                # Unknown or unhandled message types - skip to reduce noise
                # Uncomment below for debugging:
                # echo -e "${DIM}[DEBUG] Unknown type: $msg_type${NC}"
                ;;
        esac

        line_count=$((line_count + 1))
    done
}

print_info() {
    echo -e "${BLUE}[$(timestamp)]${NC} ${CYAN}INFO${NC}  $1"
}

print_success() {
    echo -e "${BLUE}[$(timestamp)]${NC} ${GREEN}OK${NC}    $1"
}

print_warning() {
    echo -e "${BLUE}[$(timestamp)]${NC} ${YELLOW}WARN${NC}  $1"
}

print_error() {
    echo -e "${BLUE}[$(timestamp)]${NC} ${RED}ERROR${NC} $1"
}

print_header() {
    local text="$1"
    local width=70
    local pad=$(( (width - ${#text} - 2) / 2 ))
    local line=$(printf '═%.0s' $(seq 1 $width))
    echo ""
    echo -e "${MAGENTA}${BOLD}╔${line}╗${NC}"
    echo -e "${MAGENTA}${BOLD}║$(printf ' %.0s' $(seq 1 $pad)) ${text} $(printf ' %.0s' $(seq 1 $((width - pad - ${#text} - 2))))║${NC}"
    echo -e "${MAGENTA}${BOLD}╚${line}╝${NC}"
    echo ""
}

print_separator() {
    local text="$1"
    local width=70
    echo ""
    echo -e "${DIM}$(printf '─%.0s' $(seq 1 $width))${NC}"
    [ -n "$text" ] && echo -e "${DIM}  $text${NC}"
    echo ""
}

print_iteration_start() {
    local num=$1
    local width=70
    local text=" ITERATION $num "
    local pad=$(( (width - ${#text}) / 2 ))
    echo ""
    echo ""
    echo -e "${GREEN}${BOLD}$(printf '▓%.0s' $(seq 1 $width))${NC}"
    echo -e "${GREEN}${BOLD}$(printf '▓%.0s' $(seq 1 $pad))${text}$(printf '▓%.0s' $(seq 1 $((width - pad - ${#text}))))${NC}"
    echo -e "${GREEN}${BOLD}$(printf '▓%.0s' $(seq 1 $width))${NC}"
    echo ""
}

print_iteration_complete() {
    local num=$1
    local duration=$2
    local width=70
    echo ""
    echo -e "${CYAN}$(printf '━%.0s' $(seq 1 $width))${NC}"
    echo -e "${CYAN}  Iteration ${BOLD}$num${NC}${CYAN} complete  |  Duration: ${BOLD}${duration}s${NC}"
    echo -e "${CYAN}$(printf '━%.0s' $(seq 1 $width))${NC}"
    echo ""
}

# ============================================================================
# USAGE AND ARGUMENT PARSING
# ============================================================================
# Usage: ./loop.sh [plan] [max_iterations]
# Examples:
#   ./loop.sh              # Build mode, unlimited iterations
#   ./loop.sh 20           # Build mode, max 20 iterations
#   ./loop.sh plan         # Plan mode, unlimited iterations
#   ./loop.sh plan 5       # Plan mode, max 5 iterations

# Signal handling for graceful shutdown
STOP_REQUESTED=0
cleanup() {
    echo ""
    print_warning "Shutdown signal received. Completing current iteration gracefully..."
    STOP_REQUESTED=1
}
trap cleanup SIGINT SIGTERM

# Ignore SIGPIPE to prevent broken pipe errors from stopping the script
trap '' PIPE

# Parse arguments
if [ "$1" = "plan" ]; then
    MODE="plan"
    PROMPT_FILE="PROMPT_plan.md"
    MAX_ITERATIONS=${2:-0}
elif [[ "$1" =~ ^[0-9]+$ ]]; then
    MODE="build"
    PROMPT_FILE="PROMPT_build.md"
    MAX_ITERATIONS=$1
else
    MODE="build"
    PROMPT_FILE="PROMPT_build.md"
    MAX_ITERATIONS=0
fi

ITERATION=0
CURRENT_BRANCH=$(git branch --show-current)

# ============================================================================
# STARTUP BANNER
# ============================================================================
clear 2>/dev/null || true
print_header "CLAUDE CODE LOOP"

echo -e "  ${BOLD}Mode:${NC}     ${CYAN}$MODE${NC}"
echo -e "  ${BOLD}Prompt:${NC}   ${CYAN}$PROMPT_FILE${NC}"
echo -e "  ${BOLD}Branch:${NC}   ${CYAN}$CURRENT_BRANCH${NC}"
if [ $MAX_ITERATIONS -gt 0 ]; then
    echo -e "  ${BOLD}Max:${NC}      ${CYAN}$MAX_ITERATIONS iterations${NC}"
else
    echo -e "  ${BOLD}Max:${NC}      ${DIM}unlimited${NC}"
fi
echo -e "  ${BOLD}Started:${NC}  ${CYAN}$(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo ""

# Verify prompt file exists
if [ ! -f "$PROMPT_FILE" ]; then
    print_error "$PROMPT_FILE not found"
    exit 1
fi

print_success "Prompt file verified"
print_info "Starting loop..."

# ============================================================================
# MAIN LOOP
# ============================================================================
while true; do
    # Check for graceful shutdown request
    if [ $STOP_REQUESTED -eq 1 ]; then
        print_info "Stopping loop as requested."
        break
    fi

    if [ $MAX_ITERATIONS -gt 0 ] && [ $ITERATION -ge $MAX_ITERATIONS ]; then
        print_success "Reached max iterations: $MAX_ITERATIONS"
        break
    fi

    # Verify prompt file still exists at the start of each iteration
    if [ ! -f "$PROMPT_FILE" ]; then
        print_warning "$PROMPT_FILE no longer exists. Stopping loop."
        break
    fi

    # Start iteration
    print_iteration_start $ITERATION
    ITER_START=$(date +%s)
    print_info "Reading prompt from $PROMPT_FILE"

    # Run Claude iteration with selected prompt
    # -p: Headless mode (non-interactive, reads from stdin)
    # --dangerously-skip-permissions: Auto-approve all tool calls (YOLO mode)
    # --output-format=stream-json: Machine-readable JSON stream output
    # --model opus: Primary agent uses Opus for complex reasoning
    # --verbose: Detailed execution logging
    print_separator "Claude Output"

    # Run Claude and parse the stream-json output for nice display
    # Use process substitution to capture exit code properly
    cat "$PROMPT_FILE" | claude -p \
        --dangerously-skip-permissions \
        --output-format=stream-json  \
        --model opus \
        --verbose 2>&1 | parse_stream_json
    CLAUDE_EXIT_CODE=${PIPESTATUS[1]:-$?}

    print_separator ""

    if [ $CLAUDE_EXIT_CODE -ne 0 ]; then
        print_warning "Claude exited with code $CLAUDE_EXIT_CODE, continuing loop..."
    else
        print_success "Claude completed successfully"
    fi

    # Calculate and display iteration duration
    ITER_END=$(date +%s)
    ITER_DURATION=$((ITER_END - ITER_START))
    print_iteration_complete $ITERATION $ITER_DURATION

    ITERATION=$((ITERATION + 1))
done

# ============================================================================
# FINAL SUMMARY
# ============================================================================
echo ""
print_header "LOOP COMPLETE"
echo -e "  ${BOLD}Total iterations:${NC} ${GREEN}$ITERATION${NC}"
echo -e "  ${BOLD}Ended at:${NC}         ${CYAN}$(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo ""
