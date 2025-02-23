FROM node:20-alpine

WORKDIR /app

# Создаем временную директорию и устанавливаем права
RUN mkdir -p /tmp/voice-messages && chmod 777 /tmp/voice-messages

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "start:dev"]