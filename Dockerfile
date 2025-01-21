ARG NODE_VERSION=22.13.0
ARG NODE_ALPINE_VERSION=23-alpine3.20

FROM node:${NODE_ALPINE_VERSION}

WORKDIR /app

COPY . .

RUN npm install

ARG NODE_ENV=development

EXPOSE 3000

CMD ["npm", "run", "dev"]
