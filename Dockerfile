# Use Python 3.11 base (so scikit-learn / torch wheels match) and add Node.js
FROM python:3.11-slim

# Install OS-level dependencies and Node.js 20
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl ca-certificates build-essential git && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Upgrade pip/setuptools/wheel so Python packages install cleanly
RUN python3 -m pip install --upgrade pip setuptools wheel

# Set working directory
WORKDIR /app

# Copy package definitions first (for cache)
COPY package*.json ./
COPY python-requirements.txt ./
COPY pyproject.toml ./

# Install dependencies
RUN npm ci
RUN python3 -m pip install -r python-requirements.txt

# Copy rest of the code
COPY . .

# Build frontend / bundle backend
RUN npm run build

# Copy needed Python agent scripts into the compiled output so subprocesses can find them
RUN mkdir -p dist/services
RUN cp server/services/ai-agent.py dist/services/
RUN cp server/services/rag-service.py dist/services/
RUN cp server/services/ai-agent.py dist/
RUN cp server/services/rag-service.py dist/


# Environment
ENV PYTHON_PATH=python3
ENV NODE_ENV=production

# Expose (Render injects PORT)
EXPOSE 3000

# Start
CMD ["npm", "start"]
