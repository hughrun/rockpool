FROM node:carbon-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN apk add --no-cache tzdata
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone
RUN npm install
COPY . .
RUN npm i sass -g
EXPOSE 3000
CMD ["npm", "start"]