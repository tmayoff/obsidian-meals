# Contributing to Obsidian Meals

Thank you for your interest in contributing to Obsidian Meals! Contributions are welcome, please follow the guidelines below when submitting pull requests or issues.

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
