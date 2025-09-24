FROM node:18

# Set the working directory
WORKDIR /usr/src/app

# Install pnpm globally
RUN npm install -g pnpm

# Copy package.json and package-lock.json (ou pnpm-lock.yaml si présent)
COPY package*.json ./
COPY pnpm-lock.yaml* ./

# Install dependencies avec pnpm
RUN pnpm install

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 4000

# Command to run the application
CMD ["pnpm", "start"]