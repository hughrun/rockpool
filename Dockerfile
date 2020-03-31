FROM node:carbon-alpine
WORKDIR /usr/src/app
COPY package*.json ./ 
RUN npm install
COPY . .
RUN npm i sass -g
EXPOSE 3000
CMD ["npm", "start"]