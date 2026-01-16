# Agent Operations Guide

## Running Tests
```bash
npm test
```

## Git Operations
- Git identity may need configuration: `git config user.name "Name"` and `git config user.email "email"`
- Get previous author: `git log -1 --format='%an <%ae>'`

## Platform Notes
- Tests run in Windows Node even in WSL
- Module-level constants like `isWindows = process.platform === 'win32'` are evaluated at load time
- Don't rely on changing `process.platform` at runtime in tests
