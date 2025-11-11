FROM node:18-alpine

# Install OpenSSL and other required dependencies
RUN apk add --no-cache openssl libc6-compat

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install all dependencies (including dev dependencies for Prisma CLI)
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma Client for the correct platform
RUN npx prisma generate

# Remove dev dependencies after Prisma generation
RUN npm prune --production

# Create a non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Change ownership of the app directory to the nodejs user
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 8080

CMD ["npm", "start"]
