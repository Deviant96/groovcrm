# Authentication

- Login page with email/password
- Password hashed with bcrypt (cost 12)
- JWT access + refresh tokens
- Remember me extends refresh lifetime
- Protected SPA routes via Vue Router guard
- Logout revokes refresh token hash
- Change password from Settings (revokes all refresh tokens)
