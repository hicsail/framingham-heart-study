FROM node:16-alpine

RUN apk add --no-cache python3 make g++

WORKDIR /usr/src/fhs

COPY package.json package-lock.json* ./

RUN npm install

COPY . .

ENV NODE_ENV=production

EXPOSE 9000

CMD ["npm", "run", "start"]
