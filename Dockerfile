FROM node:24-alpine

WORKDIR /app

COPY package*.json ./
COPY .npmrc ./
RUN npm ci --legacy-peer-deps

COPY . ./
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "--import", "tsx", "server.ts"]
