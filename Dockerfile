# Use official Playwright image
FROM mcr.microsoft.com/playwright:v1.44.1-jammy

# Set working directory
WORKDIR /app

# Copy files
COPY package*.json ./
COPY . .

# Install dependencies (Playwright already installed in base image)
RUN npm install

# Make sure script is executable if needed
# RUN chmod +x scrape.js

# Default command (can be overridden)
CMD ["node", "scrape.js"]
