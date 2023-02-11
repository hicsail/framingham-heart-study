FROM node:8

WORKDIR /usr/src/fhs
COPY . /usr/src/fhs

RUN npm install

EXPOSE 5000

CMD ["npm", "run", "start"]