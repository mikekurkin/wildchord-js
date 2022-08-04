FROM node:18.7.0

WORKDIR /app

COPY package.json package.json
RUN npm install

COPY tsconfig.json tsconfig.json
# COPY .sassrc .sassrc
COPY .parcelrc .parcelrc

EXPOSE 8080
