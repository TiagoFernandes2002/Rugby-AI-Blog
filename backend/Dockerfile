FROM public.ecr.aws/docker/library/node:20-alpine

# Pasta de trabalho dentro do container
WORKDIR /app

# Copiar só package.json primeiro (melhor para cache)
COPY package*.json ./

# Instalar dependências
RUN npm install

# Copiar o resto do código
COPY . .

# Porta que a app usa
ENV PORT=4000

# Comando para arrancar o servidor
CMD ["node", "src/index.js"]
