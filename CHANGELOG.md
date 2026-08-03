# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0] - 2026-08-03

Version reset to pre-release. The auth server is functional (41 tests, JWT/JWKS, SSO providers, account lifecycle) but the overall stack is not yet production-hardened. Pinned to `api-server-toolkit#v0.9.0`.

## [2.0.0] - 2026-08-03

### Stack v2 alignment
- Major version aligned with api-server-toolkit v2.x
- Pinned to `api-server-toolkit#v2.1.0`
- Pinned to `event-server#v2.0.0`
- OAuth2 authorization server: JWT RS256, social login (Google, Leader-ID, UNTI), password reset, event publishing
- OIDC: JWKS, discovery, `/userinfo`
- 5 grant types: password, refresh_token, authorization_code, client_credentials, key
- 5 test suites, 41 tests
