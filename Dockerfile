# Build stage for React app
FROM node:20-slim AS build

# Set the working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy all project files
COPY . .

# Build the React application
RUN npm run build

# Build the server TypeScript files
RUN npm run build:server

# Production stage
FROM node:20-slim

# Set working directory
WORKDIR /app
# Copy only the built assets and server files from the build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist/server ./dist/server
COPY --from=build /app/package.json ./

# Install only production dependencies
RUN npm install --omit=dev --no-package-lock

# Expose the port the Express server will run on
EXPOSE 3001

# Set production environment
ENV NODE_ENV=production

# Run the Express server which will serve both the API and static files
CMD ["npm", "run", "start:prod"]
