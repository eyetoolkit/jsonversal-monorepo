FROM node:20-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && corepack prepare pnpm@latest --activate && pnpm install --frozen-lockfile
COPY tsconfig.json ./
COPY src ./src
RUN pnpm run build
EXPOSE 3000
ENV STDOUT_MODE=http
ENV PORT=3000
CMD ["node", "dist/index.js"]
