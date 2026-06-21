FROM node:24-alpine

WORKDIR /frontend

COPY package*.json ./
RUN npm ci

# prepare-env.sh 가 생성한 .env.production 을 빌드에 반영 (없으면 ARG 로 주입)
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_KAKAO_API
ARG VITE_API_BASE_URL=/api
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_KAKAO_API=$VITE_KAKAO_API
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY . .
RUN npm run build

RUN npm install -g serve

EXPOSE 5173

CMD ["serve", "-s", "dist", "-l", "5173"]
