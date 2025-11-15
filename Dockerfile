FROM node:lts

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

# Installe netcat (version openbsd)
RUN apt-get update && apt-get install -y netcat-openbsd

COPY . .

RUN npm run build

EXPOSE 4000

CMD ["npm", "start"]