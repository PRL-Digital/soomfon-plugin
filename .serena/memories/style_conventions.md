# Style & Conventions

## Language
- TypeScript with strict mode
- Node.js runtime (later Electron)

## File Organization
- `scripts/` - Development and utility scripts
- `src/` - Main source code (when created)
- `docs/` - Documentation and protocol analysis
- `plans/` - Project planning documents

## Naming Conventions
- Files: kebab-case (e.g., `detect-device.ts`)
- Variables/Functions: camelCase
- Classes/Types: PascalCase
- Constants: UPPER_SNAKE_CASE

## Code Style
- Use ES modules (import/export)
- Prefer async/await over callbacks
- Document USB packet formats in markdown
- Use hex notation for USB constants (0x1500, 0x3001)

## TypeScript Config
- Target: ES2020+
- Module: CommonJS (for node-hid compatibility)
- Strict mode enabled
