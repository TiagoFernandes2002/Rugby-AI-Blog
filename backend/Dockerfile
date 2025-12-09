FROM public.ecr.aws/docker/library/node:20-alpine


WORKDIR /app


COPY package*.json ./


RUN npm install


COPY . .


ENV PORT=4000


CMD ["node", "src/index.js"]
