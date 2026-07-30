FROM node:18-alpine AS builder

WORKDIR /app

COPY auth-server/package*.json ./
RUN npm install --legacy-peer-deps --ignore-scripts

# Override toolkit with local source
COPY api-server-toolkit/dist ./node_modules/api-server-toolkit/dist
COPY api-server-toolkit/src ./node_modules/api-server-toolkit/src

# Override event-server contracts with local pre-built
COPY event-server/dist/contracts ./node_modules/event-server/dist/contracts
COPY event-server/package.json ./node_modules/event-server/package.json

COPY auth-server/ .
RUN npx tsc -p tsconfig.build.json

# --- Runner ---

FROM node:18-alpine AS runner

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY auth-server/views/ ./views/

ENV NODE_ENV=production
ENV ROOT_PATH=.
EXPOSE 3001

CMD ["node", "-r", "tsconfig-paths/register", "dist/main"]
