FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && mkdir -p /app/.server-data /app/backups /app/private && chown -R node:node /app
COPY --chown=node:node server ./server
COPY --chown=node:node src ./src
COPY --chown=node:node index.html ./
USER node
ENV BIND_HOST=0.0.0.0
EXPOSE 4180
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD node -e "fetch('http://127.0.0.1:4180/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node","server/main.mjs"]
