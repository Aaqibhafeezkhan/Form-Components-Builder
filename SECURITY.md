# Security

## Supported version

The `main` branch is the supported development line.

## Reporting a vulnerability

Use GitHub's **Report a vulnerability** option under the repository's Security tab for private vulnerability reports. Do not open a public issue for an unpatched vulnerability.

## Scope

The security scope includes the browser-based form builder, imported form definitions, saved local data, custom CSS, and generated HTML and React JSX.

## Known limitations

The application runs in the user's browser and stores form definitions in localStorage. It has no server-side submission endpoint. The custom CSS policy is a conservative denylist and is not a CSS parser. The HTML export contains fields and presentation only, without the full preview validation and conditional-logic runtime. CDN-hosted libraries and fonts require network access.
