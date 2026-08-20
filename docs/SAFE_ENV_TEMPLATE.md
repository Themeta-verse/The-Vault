# Safe Environment Template

This is the repository-safe equivalent of a conventional `.env.example`. It is intentionally Markdown because the managed project controls `.env.example` creation through its secret configuration interface. Copy the variable names to a **private, untracked** `.env` file only after supplying values from a credential manager. Never paste values into this document or commit them to Git.

```dotenv
# Application process
NODE_ENV=development
PORT=3000

# Persistence: use a dedicated MySQL-compatible database for each environment.
DATABASE_URL=mysql://vault_user:replace-with-strong-password@localhost:3306/the_vault

# Session signing: generate unique high-entropy values per environment.
JWT_SECRET=replace-with-a-unique-session-secret

# Current Manus OAuth adapter configuration. Replacing OAuth requires adapter code changes.
VITE_APP_ID=replace-with-oauth-application-id
OAUTH_SERVER_URL=https://replace-with-oauth-server.example
VITE_OAUTH_PORTAL_URL=https://replace-with-oauth-portal.example
OWNER_OPEN_ID=replace-with-owner-subject-id
OWNER_NAME=replace-with-owner-display-name

# Current Forge adapters for AI, storage, and notification. Keep server values private.
BUILT_IN_FORGE_API_URL=https://replace-with-forge-compatible-api.example
BUILT_IN_FORGE_API_KEY=replace-with-server-side-api-key

# Values with VITE_ are browser-visible after build. Never use privileged secrets here.
VITE_FRONTEND_FORGE_API_URL=https://replace-with-frontend-api.example
VITE_FRONTEND_FORGE_API_KEY=replace-with-public-scoped-token-or-remove-adapter
VITE_APP_TITLE=THE VAULT
VITE_APP_LOGO=
VITE_ANALYTICS_ENDPOINT=
VITE_ANALYTICS_WEBSITE_ID=
```

| Controlled requirement | Current outcome | Who must act | Exact next step |
|---|---|---|---|
| Conventional `.env.example` file | Not created because the managed project configuration blocks direct edits to environment-example files. | Project owner/platform administrator if an actual generated file is required. | Use the project secret configuration interface to manage real environment values; retain this safe template in Git and copy it to a private local `.env` as needed. |
| Live secret values | Not included anywhere in the repository. | Project owner and operations owner. | Set values only in a private secret manager or managed environment configuration. |
