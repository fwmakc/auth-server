FROM node:18-alpine AS builder

WORKDIR /app

# Build @lms/common → tarball at /shared/lms-common-1.0.0.tgz
COPY shared/package*.json shared/tsconfig.json shared/.npmignore /shared/
COPY shared/src/ /shared/src/
RUN cd /shared && npm install && npm run build && npm pack

# Install deps (file:../shared/lms-common-1.0.0.tgz resolves to /shared/)
COPY auth-server/package*.json auth-server/.npmrc ./
RUN npm install --no-package-lock

# Build service
COPY auth-server/ ./
RUN npm run build

# --- Runner ---

FROM node:18-alpine AS runner

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY auth-server/views/ ./views/

ENV NODE_ENV=production
ENV ROOT_PATH=.
EXPOSE 3001

CMD ["node", "dist/main"]