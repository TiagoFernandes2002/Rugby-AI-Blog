FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Aqui definimos a API para falar com o backend no docker-compose
ENV VITE_API_URL=http://localhost:4000

# Vite em modo dev, exposto para fora
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]
