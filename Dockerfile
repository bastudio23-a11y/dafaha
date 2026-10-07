FROM node:20-alpine

WORKDIR /app

# Copy dependency definitions and config
COPY package*.json ./
COPY .npmrc ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy all source files
COPY . ./

# Build frontend assets
RUN npm run build

# Default environment variables
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "start"]
