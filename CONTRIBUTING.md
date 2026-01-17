# Contributing to Obsidian Meals

Thank you for your interest in contributing to Obsidian Meals! Contributions are welcome, please follow the guidelines below when submitting pull requests or issues.

## Development Environment Setup

### Option 1: Using Nix + direnv (Recommended)

This project uses [Nix flakes](https://nixos.wiki/wiki/Flakes) and [direnv](https://direnv.net/) to automatically manage the development environment and dependencies.

**Supported platforms:** Linux, macOS, Windows (via WSL2)

**Prerequisites:**

-   **Nix** (with flakes enabled) - [Installation guide](https://nixos.org/download.html)
-   **direnv** - [Installation guide](https://direnv.net/docs/installation.html)

**Setup:**

1. Clone the repository
2. Navigate to the project directory
3. Allow direnv to load the environment:
    ```bash
    direnv allow
    ```

The development environment will be automatically loaded, providing all necessary tools:

-   `yarn-berry` - Package manager (Yarn 3+)
-   `biome` - Linting and formatting
-   `pre-commit` - Git hooks
-   `jq`, `act`, `just`, `funzzy` - Additional development utilities

Once the environment is loaded, you can use the standard development commands (see CLAUDE.md for details).

### Option 2: Manual Setup (Without Nix)

If you prefer not to use Nix or are on a platform where it's not available:

**Prerequisites:**

-   **Node.js** (latest LTS version recommended) - [Installation guide](https://nodejs.org/)
-   **Yarn 3+** (Yarn Berry) - [Installation guide](https://yarnpkg.com/getting-started/install)

**Setup:**

1. Clone the repository
2. Navigate to the project directory
3. Install dependencies:
    ```bash
    yarn install
    ```

**Optional tools** (install manually if needed):

-   **Biome** - Linting and formatting (included in devDependencies, use via `npx biome`)
-   **pre-commit** - Git hooks for code quality - [Installation guide](https://pre-commit.com/#install)

## Pull Request Guidelines

### Keep PRs Small and Focused

To make reviews easier and faster, please:

-   **Split large changes into smaller PRs** - Each PR should ideally focus on a single feature, bug fix, or refactoring task
-   **One logical change per PR** - If you're adding multiple features or fixing multiple unrelated bugs, submit separate PRs for each
-   **Aim for reviewable size** - Try to minimise the number of lines changed in a single PR, focusing on an understandable scope of change

## Commit Message (PR Title) Format

This repository uses [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) for automatic changelog generation via [release-please](https://github.com/googleapis/release-please).

For this reason, your PR title **must** follow the Conventional Commits format, as this will become the commit message when merged.

### Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

-   `feat:` - A new feature (triggers a minor version bump)
-   `fix:` - A bug fix (triggers a patch version bump)
-   `docs:` - Documentation only changes
-   `style:` - Changes that don't affect code meaning (formatting, whitespace, etc.)
-   `refactor:` - Code changes that neither fix bugs nor add features
-   `perf:` - Performance improvements
-   `test:` - Adding or updating tests
-   `chore:` - Changes to build process, dependencies, or tooling

### Breaking Changes

If your change introduces a breaking change, add `!` after the type or include `BREAKING CHANGE:` in the footer:

```
feat!: change recipe format to require RecipeMD

BREAKING CHANGE: The legacy heading-based format is no longer supported.
```

## Testing

-   Write tests for new features and bug fixes
-   Ensure all tests pass before submitting a PR
-   Run `yarn test` to execute the test suite
