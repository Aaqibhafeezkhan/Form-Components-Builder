# Changelog

All notable changes to this project are documented here.

## [1.1.0]

### Fixed

- Reworked the sample contact form as an importable form JSON export with valid field identifiers and existing conditional and validation rules.
- Enforced field pattern rules during validation and bounded the regular-expression tester inputs.
- Replaced silent QR data truncation with a size-limit message and a JSON-download instruction.
- Generated UUID v4 identifiers with the Web Crypto API when available.

### Security

- Escaped user-controlled values in generated HTML and JSX and skipped unsafe field identifiers.
- Added recursive dangerous-key checks and strict size limits for user-triggered imports.
- Added a restrictive custom CSS policy for settings, imported forms and applied styles.
- Hardened custom template storage against malformed data and storage failures.

### Changed

- Removed the external Google Fonts dependency from generated HTML and used a system font stack.
- Added a shared test harness and extracted built-in template data into its own module.
- Corrected project metadata and documentation to describe the implemented behavior and limitations.
