FROM node:20-bookworm-slim

WORKDIR /app

# Install python and dependencies for OCR
RUN apt-get update && apt-get install -y python3 python3-pip python3-venv libgl1 libglib2.0-0

COPY package*.json ./
RUN npm install

# Install patchright browsers and OS dependencies
RUN npx patchright install chromium
RUN npx patchright install-deps chromium

COPY . .

# Set up Python venv and install ddddocr
RUN python3 -m venv /app/venv
RUN /app/venv/bin/pip install --no-cache-dir ddddocr

# Generate Prisma Client
RUN npx prisma generate

EXPOSE 5000

CMD ["npx", "tsx", "src/index.ts"]
