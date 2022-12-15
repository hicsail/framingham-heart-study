FROM ubuntu:16.04
FROM node:14

WORKDIR /usr/src/anchor
COPY . /usr/src/anchor/

RUN apt-get update

#Needed to connect to MongoDB
RUN apt-get install -y netcat

RUN npm install

EXPOSE 9000

CMD sh docker_run.sh