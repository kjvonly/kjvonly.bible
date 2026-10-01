# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package*.json ./
COPY kjvonly-pwa/package.json ./kjvonly-pwa/package.json
COPY cli/package.json ./cli/package.json

RUN npm install --ignore-scripts --include=optional

COPY . .

ARG BASE_PATH=
ARG APP_GIT_COMMIT=unknown
ARG APP_GIT_TAG=
ENV BASE_PATH=${BASE_PATH}
ENV VITE_APP_GIT_COMMIT=${APP_GIT_COMMIT}
ENV VITE_APP_GIT_TAG=${APP_GIT_TAG}

RUN npm run prepare --workspace @kjvonly/pwa
RUN --mount=type=secret,id=build_env,target=/app/kjvonly-pwa/.env.production.local \
    npm run build --workspace @kjvonly/pwa

FROM nginx:alpine AS runtime

COPY kjvonly-pwa/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/kjvonly-pwa/build /usr/share/nginx/html

EXPOSE 80
