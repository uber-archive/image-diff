# Releasing
Releases are done via `foundry` to guarantee consistent sets of changes across developers. To perform a release:

1. Update the `CHANGELOG.md` with a message (if not done so in the PR)

2. Stage changes
    ```bash
    git add -p
    ```

3. Run `./release.sh {{semver}}`
    ```bash
    ./release.sh {{semver}}
    # For example:
    # ./release.sh 1.2.0
    ```

    Under the hood, `./release.sh` will:

    1. Update the version in `package.json`
    2. Create a new `git commit` for "Release 1.2.0"
    3. Create `git tag` for `1.2.0`
    4. Push `master` branch
    5. Push git tags
    6. Publish to `npm`
