# Contributing to AI Music Royalty Platform

Thank you for your interest in contributing to the AI Music Royalty Platform! This document outlines our development workflow and code quality standards.

## Development Workflow

### Prerequisites

- Node.js 18+
- npm or yarn
- VS Code or Cursor (recommended)

### Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see `.env.local.example`)
4. Run the development server: `npm run dev`

## Code Quality Standards

### Linting and Formatting

We use ESLint and Prettier to maintain code quality and consistency.

#### Available Scripts

- `npm run lint` - Check for linting errors
- `npm run lint:fix` - Auto-fix linting errors where possible
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check if code is properly formatted
- `npm run type-check` - Run TypeScript type checking

#### Our Rule Philosophy

We enforce strict but sensible rules to maintain code quality:

- **TypeScript**: Strict type checking with recommended rules
- **React**: Best practices for React and React Hooks
- **Accessibility**: JSX a11y rules for inclusive design
- **Import Hygiene**: Automatic import sorting and unused import removal
- **Code Quality**: Complexity limits, line length limits, and bug prevention
- **Security**: Basic security antipatterns detection
- **Performance**: Promise handling and optimization patterns

#### Key Rules

- **Max line length**: 100 characters (ignores URLs and strings)
- **Complexity limit**: 10 (cognitive complexity)
- **Max lines per function**: 120 (warning)
- **Console statements**: Error in production, warning in development
- **Import sorting**: Automatic with simple-import-sort
- **Unused imports**: Automatically removed

### Pre-commit Hooks

We use Husky and lint-staged to ensure code quality:

- **ESLint**: Runs `--fix` on staged files
- **Prettier**: Formats staged files
- **Type checking**: Ensures TypeScript compilation

The pre-commit hook will:

1. Run ESLint with auto-fix on staged TypeScript/JavaScript files
2. Format files with Prettier
3. Block commits if there are unfixable errors

### VS Code/Cursor Setup

Recommended extensions:

- ESLint
- Prettier - Code formatter
- Tailwind CSS IntelliSense
- TypeScript Importer

Settings are configured in `.vscode/settings.json`:

- Format on save (Prettier)
- Auto-fix ESLint issues on save
- Organize imports on save

## Code Style

### TypeScript

- Use strict typing
- Prefer interfaces over types for object shapes
- Use `const` assertions where appropriate
- Avoid `any` type (use `unknown` or specific types)

### React

- Use functional components with hooks
- Prefer arrow functions for components
- Use proper key props for lists
- Implement proper error boundaries

### Styling

- Use Tailwind CSS classes
- Follow the beige/gold/silver color scheme
- Use golden shimmer borders for data containers
- Maintain responsive design principles

### File Organization

- Use absolute imports with `@/` prefix
- Group imports: external → internal → relative
- Keep components focused and single-purpose
- Use descriptive file and function names

## Testing

Before submitting a PR:

1. Run `npm run lint` - should show zero errors
2. Run `npm run format:check` - should show no formatting issues
3. Run `npm run type-check` - should show no TypeScript errors
4. Run `npm run build` - should build successfully
5. Test the application manually

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes following our code standards
3. Run the linting and formatting scripts
4. Commit your changes (pre-commit hooks will run)
5. Push to your fork
6. Create a pull request with a clear description

## Questions?

If you have questions about our code standards or development process, please open an issue or reach out to the maintainers.

---

**Remember**: Our goal is to maintain a clean, consistent, and maintainable codebase while preserving the beautiful beige/gold/silver UI theme. All changes should enhance the user experience without breaking existing functionality.
