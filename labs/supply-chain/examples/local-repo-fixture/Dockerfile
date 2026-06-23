FROM node:24.11.1-alpine3.22

LABEL org.opencontainers.image.title="local-repo-fixture"
LABEL org.opencontainers.image.version="0.1.0"

WORKDIR /app

COPY package.json package.json
COPY src src

USER node

CMD ["node", "src/index.js"]
