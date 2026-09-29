# AI Context — auth-server

> Auto-generated. Run `npm run ai-context` to regenerate.
> Generated: 2026-09-29T00:12:25.484Z

---

## Controllers

### AccountController [Авторизация]

Base path: `/account`

| Method | Path |
|--------|------|
| `GET` | `/account/self` |

### AccountRoleAssignmentController [account-roles]

Base path: `/account/:accountId/roles`

| Method | Path |
|--------|------|
| `POST` | `/account/:accountId/roles` |
| `DELETE` | `/account/:accountId/roles` |

### AccountSessionsController

Base path: `/account/sessions`

| Method | Path |
|--------|------|
| `GET` | `/account/sessions/get_by_auth_id` |

### AccountStrategiesController [Стратегии авторизации]

Base path: `/account/strategies`

| Method | Path |
|--------|------|
| `GET` | `/account/strategies/self` |
| `GET` | `/account/strategies/self/:name` |
| `GET` | `/account/strategies/oauth/login` |
| `GET` | `/account/strategies/oauth/redirect` |
| `GET` | `/account/strategies/google/login` |
| `GET` | `/account/strategies/google/redirect` |
| `GET` | `/account/strategies/leader/login` |
| `GET` | `/account/strategies/leader/redirect` |
| `GET` | `/account/strategies/2035/login` |
| `GET` | `/account/strategies/2035/redirect` |

### TwoFactorAccountController [Двухфакторная аутентификация]

Base path: `/account/methods/2fa`

| Method | Path |
|--------|------|
| `GET` | `/account/methods/2fa/status` |
| `POST` | `/account/methods/2fa/setup` |
| `POST` | `/account/methods/2fa/setup/confirm` |
| `POST` | `/account/methods/2fa/disable` |
| `POST` | `/account/methods/2fa/verify` |

### FormsAccountController [Авторизация через формы]

Base path: `/account`

| Method | Path |
|--------|------|
| `POST` | `/account/change/:code` |
| `GET` | `/account/confirm/:code` |
| `POST` | `/account/login` |
| `POST` | `/account/logout` |
| `POST` | `/account/register` |
| `POST` | `/account/reset` |

### MethodsAccountController [Авторизация]

Base path: `/account/methods`

| Method | Path |
|--------|------|
| `POST` | `/account/methods/change/:code` |
| `GET` | `/account/methods/confirm/:code` |
| `POST` | `/account/methods/login` |
| `POST` | `/account/methods/logout` |
| `POST` | `/account/methods/register` |
| `POST` | `/account/methods/reset` |
| `POST` | `/account/methods/hash/:string` |
| `POST` | `/account/methods/deactivate` |
| `DELETE` | `/account/methods/delete/:id` |

### OpenAccountController [OAuth 2.0]

Base path: `/account`

| Method | Path |
|--------|------|
| `GET` | `/account` |

### RolesController

Base path: `/roles`

| Method | Path |
|--------|------|
| `GET` | `/roles/find` |
| `GET` | `/roles/find/first` |
| `GET` | `/roles/find/many/:ids` |
| `GET` | `/roles/find/:id` |
| `GET` | `/roles/count` |
| `GET` | `/roles/self` |
| `POST` | `/roles/create` |
| `PATCH` | `/roles/update/:id` |
| `POST` | `/roles/position/sort` |
| `POST` | `/roles/position/move/:id` |
| `DELETE` | `/roles/remove/:id` |

### ClientsController

Base path: `/clients`

| Method | Path |
|--------|------|
| `GET` | `/clients/token` |
| `GET` | `/clients/self` |

### UsersController

Base path: `/users`

| Method | Path |
|--------|------|
| `GET` | `/users/find` |
| `GET` | `/users/find/first` |
| `GET` | `/users/find/many/:ids` |
| `GET` | `/users/find/:id` |
| `GET` | `/users/count` |
| `GET` | `/users/self` |
| `POST` | `/users/create` |
| `PATCH` | `/users/update/:id` |
| `POST` | `/users/position/sort` |
| `POST` | `/users/position/move/:id` |
| `DELETE` | `/users/remove/:id` |

### UserinfoController [OIDC]

| Method | Path |
|--------|------|
| `GET` | `/userinfo` |

### TokenController [Токены]

Base path: `/token`

| Method | Path |
|--------|------|
| `POST` | `/token//` |
| `POST` | `/token/revoke` |
| `DELETE` | `/token/revoke/:id` |

---

## Services

### AccountService extends `CommonService`

- `create(accountDto: AccountDto,
    relations: Array<RelationsDto> = undefined): Promise<AccountEntity>`
- `update(id: number,
    accountDto: AccountDto,
    relations: Array<RelationsDto> = undefined): Promise<AccountEntity>`
- `findByUsername(username: string): Promise<AccountEntity>`
- `login(accountDto: AccountDto): Promise<AccountEntity>`
- `hardDelete(id: number): Promise<boolean>`

### AccountConfirmService

- `findById(id: number): Promise<AccountConfirmEntity>`
- `findByCode(code: string, type = "code"): Promise<AccountConfirmEntity>`
- `remove(id: number): Promise<boolean>`

### AccountRolesService

- `assign(accountId: number, dto: AccountRoleAssignmentDto): Promise<void>`
- `removeByAccount(accountId: number): Promise<void>`
- `findByAccount(accountId: number): Promise<AccountRoleEntity[]>`

### AccountSessionsService extends `CommonService`

- `getByAuthId(authId: number,
    relations: Array<RelationsDto> = undefined): Promise<AccountSessionsEntity[]>`

### AccountStrategiesService extends `CommonService`

- `find(find: FindDto,
    bind: BindDto = { allow: true }): Promise<AccountStrategiesEntity[]>`
- `findFirst(find: FindDto,
    bind: BindDto = { allow: true }): Promise<AccountStrategiesEntity>`
- `findMany(find: FindManyDto,
    bind: BindDto = { allow: true }): Promise<AccountStrategiesEntity[]>`
- `findOne(find: FindOneDto,
    bind: BindDto = { allow: true }): Promise<AccountStrategiesEntity>`
- `encodeTokens(authStrategiesDto: AccountStrategiesDto): Promise<AccountStrategiesDto>`
- `decodeTokens(authStrategiesDto: AccountStrategiesEntity): Promise<AccountStrategiesEntity>`
- `decodeEntries(authStrategiesDto: Array<AccountStrategiesEntity>): Promise<AccountStrategiesEntity[]>`
- `updateBy(authStrategiesDto: AccountStrategiesDto,
    relations: Array<RelationsDto> = undefined): Promise<AccountStrategiesEntity>`
- `removeBy(authStrategiesDto: AccountStrategiesDto): Promise<boolean>`

### TwoFactorAccountService

- `enabled(): boolean`
- `find(accountId: number): Promise<AccountTwoFactorEntity | null>`
- `status(account: AccountEntity): Promise<`
- `challenge(account: AccountEntity): Promise<`
- `setup(account: AccountEntity,
    method: TwoFactorMethod): Promise<`
- `confirmSetup(account: AccountEntity,
    code: string): Promise<`
- `disable(account: AccountEntity, password: string): Promise<boolean>`
- `verify(mfaToken: string, code: string, request?: any, response?: any, state?: any): Promise<any>`
- `checkTotp(row: AccountTwoFactorEntity,
    code: string): Promise<boolean>`
- `sendCode(account: AccountEntity): Promise<void>`
- `upsertPending(accountId: number,
    method: TwoFactorMethod,
    secret: { encrypted: string; iv: string } | null): Promise<AccountTwoFactorEntity>`
- `encryptSecret(secret: string): Promise<`
- `decryptSecret(secret: { encrypted: string; iv: string } | null | undefined): Promise<string | null>`
- `generateRecoveryCodes(): Promise<`
- `consumeRecoveryCode(row: AccountTwoFactorEntity,
    code: string): Promise<boolean>`
- `registerFailure(row: AccountTwoFactorEntity): Promise<void>`
- `randomBlock(): string`

### FormsAccountService

- `change(accountDto: AccountDto, code: string, req, res): Promise<any>`
- `confirm(code: string, req, res): Promise<any>`
- `login(grantsTokenDto: GrantsTokenDto,
    response_type: string,
    req,
    res): Promise<any>`
- `logout(req, res): Promise<any>`
- `register(accountDto: AccountDto,
    subject: string,
    req,
    res): Promise<any>`
- `reset(accountDto: AccountDto, subject: string, req, res): Promise<any>`

### MethodsAccountService

- `change(accountDto: AccountDto, code: string, req, res): Promise<any>`
- `confirm(code: string, req, res): Promise<any>`
- `login(grantsTokenDto: GrantsTokenDto, req, res): Promise<any>`
- `logout(req, res): Promise<any>`
- `register(accountDto: AccountDto,
    subject: string,
    req,
    res): Promise<any>`
- `reset(accountDto: AccountDto, subject: string, req, res): Promise<any>`
- `deactivate(password: string, req, res): Promise<any>`
- `delete(targetUserId: number, req, res): Promise<any>`
- `hash(string: string): Promise<any>`

### OpenAccountService

- `signCode(data: object): string`
- `verifyCodeSignature(code: string): object`
- `code(clientsDto: ClientsDto,
    id: number,
    state: string): Promise<string>`
- `token(clientsDto: ClientsDto,
    id: number,
    state: string): Promise<string>`
- `verify(openAccountDto: OpenAccountDto): Promise<ClientsDto>`
- `codeGenerate(clientsDto: ClientsDto,
    id: number): Promise<ClientsEntity>`
- `codeVerify(code: string, clientsDto: ClientsDto): Promise<number>`

### PasswordPolicyService

- `enabled(name: string): boolean`
- `number(name: string, fallback: number): number`
- `validate(password: string): string[]`
- `assertValid(password: string): void`

### ClientsService extends `CommonService`

- `create(clientsDto: ClientsDto,
    relations: Array<RelationsDto> = undefined,
    bind: BindDto): Promise<ClientsEntity>`
- `clientsVerify(client_id: string, client_secret: string): Promise<any>`
- `clientsGetWhere(where: object,
    relations: Array<RelationsDto> = undefined): Promise<ClientsEntity>`

### UsersService extends `CommonService`

- `findByHash(hash: string): Promise<UsersEntity>`
- `linkToAuth(userId: number, authId: number): Promise<any>`

### GrantsTokenService

- `authorizationCode(grantsTokenDto: GrantsTokenDto): Promise<any>`
- `clientCredentials(grantsTokenDto: GrantsTokenDto): Promise<any>`
- `key(grantsTokenDto: GrantsTokenDto, request, response): Promise<any>`
- `password(grantsTokenDto: GrantsTokenDto,
    request,
    response): Promise<any>`
- `refreshToken(grantsTokenDto: GrantsTokenDto): Promise<any>`
- `revoke(token: string): Promise<any>`
- `revokeAll(accountId: number): Promise<any>`

### TokenService

- `one(data, configKey, defaultExpires = ""): Promise<any>`
- `pair(data): Promise<any>`
- `prepare(token: TokenDto, state: any): Promise<any>`
- `refresh(refresh_token: string, callback = null): Promise<any>`
- `verify(token: string, type: string): Promise<any>`

---

## Entities

### AccountEntity

| Column | Type |
|--------|------|
| `id` | `number` |
| `createdAt` | `Date` |
| `updatedAt` | `Date` |
| `username` | `string` |
| `password` | `string` |
| `isActivated` | `boolean` |
| `isSuperuser` | `boolean` |
| `isDeleted` | `boolean` |

Relations: `AccountSessionsEntity`, `AccountStrategiesEntity`, `AccountConfirmEntity`, `ClientsEntity`, `UsersEntity`, `AccountRoleEntity`


### AccountConfirmEntity

| Column | Type |
|--------|------|
| `id` | `number` |
| `createdAt` | `Date` |
| `updatedAt` | `Date` |
| `code` | `string` |
| `type` | `string` |

Relations: `AccountEntity`


### AccountRoleEntity

| Column | Type |
|--------|------|
| `id` | `number` |
| `accountId` | `number` |
| `roleId` | `number` |
| `tenantScope` | `string` |

Relations: `AccountEntity`, `RoleEntity`


### AccountSessionsEntity

| Column | Type |
|--------|------|
| `id` | `number` |
| `createdAt` | `Date` |
| `updatedAt` | `Date` |
| `description` | `string` |
| `ip` | `string` |
| `userAgent` | `string` |
| `referrer` | `string` |
| `method` | `string` |
| `locale` | `string` |
| `timezone` | `string` |

Relations: `AccountEntity`


### AccountStrategiesEntity

| Column | Type |
|--------|------|
| `id` | `number` |
| `createdAt` | `Date` |
| `updatedAt` | `Date` |
| `name` | `string` |
| `uid` | `string` |
| `json` | `string` |
| `accessToken` | `string` |
| `refreshToken` | `string` |

Relations: `AccountEntity`


### AccountTwoFactorEntity

| Column | Type |
|--------|------|
| `id` | `number` |
| `createdAt` | `Date` |
| `updatedAt` | `Date` |
| `enabled` | `boolean` |
| `recoveryCodes` | `string[]` |
| `failedAttempts` | `number` |
| `lockedUntil` | `Date` |

Relations: `AccountEntity`


### RoleEntity

| Column | Type |
|--------|------|
| `id` | `number` |
| `createdAt` | `Date` |
| `updatedAt` | `Date` |
| `name` | `string` |
| `description` | `string` |

Relations: `AccountRoleEntity`


### ClientsEntity

| Column | Type |
|--------|------|
| `id` | `number` |
| `createdAt` | `Date` |
| `updatedAt` | `Date` |
| `client_id` | `string` |
| `client_secret` | `string` |
| `client_password` | `string` |
| `client_type` | `TypeClients` |
| `title` | `string` |
| `description` | `string` |
| `client_uri` | `string` |
| `code` | `string` |
| `publishedAt` | `Date` |
| `isPublished` | `boolean` |

Relations: `AccountEntity`, `ClientsRedirectsEntity`


### ClientsRedirectsEntity

| Column | Type |
|--------|------|
| `id` | `number` |
| `createdAt` | `Date` |
| `updatedAt` | `Date` |
| `uri` | `string` |

Relations: `ClientsEntity`


### UsersEntity

| Column | Type |
|--------|------|
| `id` | `number` |
| `createdAt` | `Date` |
| `updatedAt` | `Date` |
| `email` | `string` |
| `phone` | `string` |
| `name` | `string` |
| `lastName` | `string` |
| `parentName` | `string` |
| `avatar` | `string` |
| `birthday` | `Date` |
| `locale` | `string` |
| `address` | `string` |
| `timezone` | `string` |
| `gender` | `TypeGenders` |

Relations: `AccountEntity`


### RefreshTokenEntity (table: `refresh_tokens`)


---

## DTOs

### AccountDto

| Field | Type | Optional |
|-------|------|----------|
| `createdAt` | `Date` | yes |
| `updatedAt` | `Date` | yes |
| `username` | `string` | yes |
| `password` | `string` | yes |
| `subject` | `string` | yes |
| `isActivated` | `boolean` | yes |
| `isSuperuser` | `boolean` | yes |
| `sessions` | `AccountSessionsDto[]` | yes |
| `strategies` | `AccountStrategiesDto[]` | yes |
| `confirm` | `AccountConfirmDto[]` | yes |
| `clients` | `ClientsDto[]` | yes |
| `users` | `UsersDto` | yes |

### AccountConfirmDto

| Field | Type | Optional |
|-------|------|----------|
| `createdAt` | `Date` | yes |
| `updatedAt` | `Date` | yes |
| `code` | `string` | no |
| `type` | `string` | no |

### AccountRoleAssignmentDto

| Field | Type | Optional |
|-------|------|----------|
| `roleId` | `number` | no |
| `tenant` | `string` | yes |
| `roles` | `RoleAssignmentItem[]` | no |

### AccountSessionsDto

| Field | Type | Optional |
|-------|------|----------|
| `createdAt` | `Date` | yes |
| `updatedAt` | `Date` | yes |
| `description` | `string` | yes |
| `ip` | `string` | yes |
| `userAgent` | `string` | yes |
| `referrer` | `string` | yes |
| `method` | `string` | yes |
| `locale` | `string` | yes |
| `timezone` | `string` | yes |
| `account` | `AccountDto` | yes |

### AccountStrategiesDto

| Field | Type | Optional |
|-------|------|----------|
| `createdAt` | `Date` | yes |
| `updatedAt` | `Date` | yes |
| `name` | `string` | yes |
| `uid` | `string` | yes |
| `json` | `string` | yes |
| `accessToken` | `string` | yes |
| `refreshToken` | `string` | yes |
| `account` | `AccountDto` | yes |

### TwoFactorSetupDto

| Field | Type | Optional |
|-------|------|----------|
| `code` | `string` | no |
| `password` | `string` | no |
| `mfa_token` | `string` | no |
| `code` | `string` | no |
| `state` | `string` | yes |

### OpenAccountDto

| Field | Type | Optional |
|-------|------|----------|
| `response_type` | `TypeResponses` | no |
| `client_id` | `string` | no |
| `redirect_uri` | `string` | no |
| `state` | `string` | no |

### RoleDto

| Field | Type | Optional |
|-------|------|----------|
| `name` | `string` | yes |
| `description` | `string` | yes |

### ClientsDto

| Field | Type | Optional |
|-------|------|----------|
| `createdAt` | `Date` | yes |
| `updatedAt` | `Date` | yes |
| `client_id` | `string` | yes |
| `client_secret` | `string` | yes |
| `client_password` | `string` | yes |
| `client_type` | `TypeClients` | yes |
| `title` | `string` | yes |
| `description` | `string` | yes |
| `client_uri` | `string` | yes |
| `code` | `string` | yes |
| `publishedAt` | `Date` | yes |
| `isPublished` | `boolean` | yes |
| `redirect_uri` | `string` | yes |
| `redirects` | `ClientsRedirectsDto[]` | yes |

### ClientsRedirectsDto

| Field | Type | Optional |
|-------|------|----------|
| `createdAt` | `Date` | yes |
| `updatedAt` | `Date` | yes |
| `uri` | `string` | no |
| `client` | `ClientsDto` | yes |

### UsersDto

| Field | Type | Optional |
|-------|------|----------|
| `createdAt` | `Date` | yes |
| `updatedAt` | `Date` | yes |
| `email` | `string` | yes |
| `phone` | `string` | yes |
| `name` | `string` | yes |
| `lastName` | `string` | yes |
| `parentName` | `string` | yes |
| `avatar` | `string` | yes |
| `birthday` | `Date` | yes |
| `locale` | `string` | yes |
| `address` | `string` | yes |
| `timezone` | `string` | yes |
| `gender` | `TypeGenders` | yes |

### GrantsTokenDto

| Field | Type | Optional |
|-------|------|----------|
| `grant_type` | `TypeGrants` | no |
| `client_id` | `string` | yes |
| `client_secret` | `string` | yes |
| `client_password` | `string` | yes |
| `username` | `string` | yes |
| `password` | `string` | yes |
| `refresh_token` | `string` | yes |
| `code` | `string` | yes |
| `key` | `string` | yes |
| `redirect_uri` | `string` | yes |
| `state` | `string` | yes |

### TokenDto

| Field | Type | Optional |
|-------|------|----------|
| `access_token` | `string` | yes |
| `expires_in` | `number` | yes |
| `refresh_token` | `string` | yes |
