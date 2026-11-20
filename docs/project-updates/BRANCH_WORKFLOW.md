# Coordinated Branch Workflow

## Shared feature naming

For work spanning both repositories, use the exact same branch name in each repository:

```text
feature/<short-kebab-case-feature-name>
```

Current documentation branch:

```text
feature/project-documentation-tracking
```

## Create or switch to a coordinated feature branch

Run these commands separately inside each local repository:

```bash
git switch main
git pull origin main
git switch -c feature/<short-kebab-case-feature-name>
```

If the branch already exists remotely:

```bash
git fetch origin
git switch --track origin/feature/<short-kebab-case-feature-name>
```

## Commit and push

```bash
git status
git add .
git commit -m "feat: <describe the change>"
git push -u origin feature/<short-kebab-case-feature-name>
```

## Cross-repository coordination
1. Create the same feature branch name from each repository's latest `main`.
2. Make only repository-relevant changes in each branch.
3. Commit and push independently; each repository has its own commit SHA and history.
4. Open a pull request in each repository when its changes are ready.
5. Verify the frontend/backend integration together before merging either side when the feature requires both.
6. Update TODO.md, IMPLEMENTATION_STATUS.md, and CHANGELOG.md in both repositories.

## Safety rules
- Do not commit cross-repository work directly to `main`.
- Do not assume matching branch names mean matching commit histories.
- Pull the latest `main` before creating a new coordinated feature branch.
- Keep secrets, tokens, credentials, and production data out of commits and documentation.
