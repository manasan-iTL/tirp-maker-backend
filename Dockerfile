FROM node:20-slim
WORKDIR /usr/src/app
COPY package*.json ./
ENV NODE_ENV = production
RUN npm install --only=production
COPY . ./
CMD [ "npm", "start" ]