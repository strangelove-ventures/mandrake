# Contributing to Mandrake

Thank you for your interest in contributing to Mandrake!

## Development Setup

1. Clone the repository

   ```bash
   git clone https://github.com/strangelove-ventures/mandrake.git
   cd mandrake
   ```

2. Install dependencies

   ```bash
   bun install
   ```

3. Build all packages

   ```bash
   bun run build
   ```

## Development Workflow

1. Create a feature branch

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and test

   ```bash
   bun test
   ```

3. Commit with conventional commits

   ```bash
   git commit -m "feat: add new feature"
   ```

## Code Style

- TypeScript with strict mode
- Use async/await over promises
- Comprehensive error handling
- Add tests for new features

## Testing

Run tests with:

```bash
bun test
```

## Pull Requests

1. Update documentation for any API changes
2. Add tests for new functionality
3. Ensure all tests pass
4. Update the README if needed

## Questions?

Open an issue for any questions about contributing.
