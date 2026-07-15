# Auth Server

OAuth2-сервер авторизации: регистрация, вход, выдача JWT, social login.

Перенесён из [api-server](https://github.com/fwmakc/api-server) на этапе разделения монолита (Stage 2, Issue #6).

## Возможности

- Регистрация и активация пользователей (bcrypt)
- Вход по паролю (password grant)
- OAuth2 token endpoint: authorization_code, refresh_token, client_credentials, password, key
- OAuth2 authorize endpoint (code + implicit flow)
- Social login: Google, Leader-ID, UNTI/2035, custom OAuth
- Управление OAuth-клиентами (client_id, client_secret, redirect_uri)
- Сессии и логирование входов
- Отправка email (подтверждение регистрации, сброс пароля)

## Статус

Код перенесён из api-server. Дальнейшие шаги (Stage 3):

- [ ] Перевести JWT с HMAC (JWT_SECRET) на RS256 (асимметричные ключи)
- [ ] Добавить `/.well-known/jwks.json` endpoint
- [ ] Добавить `/.well-known/openid-configuration` (OIDC Discovery)
- [ ] Добавить `/userinfo` endpoint (OIDC)
- [ ] Добавить `/revoke` endpoint (RFC 7009)
- [ ] Добавить Keycloak стратегию

## Архитектура

См. [Issue #6](https://github.com/fwmakc/api-server/issues/6) — полная схема разделения.

## Запуск

```shell
npm install
npm run dev
```
