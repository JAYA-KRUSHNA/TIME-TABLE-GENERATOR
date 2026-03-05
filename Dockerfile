FROM node:20-slim

# Install build tools for better-sqlite3
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files first for layer caching
COPY package*.json ./
RUN npm ci

# Copy the rest
COPY . .

# Build Next.js
RUN npm run build

# Copy existing database so the app starts with pre-loaded data
RUN mkdir -p prisma
COPY prisma/dev.db prisma/dev.db

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["npm", "start"]
