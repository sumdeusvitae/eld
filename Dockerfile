# Dockerfile

FROM mcr.microsoft.com/playwright:v1.45.0-jammy

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Run your script
CMD ["node", "scrape.js"]
