FROM oven/bun:latest

WORKDIR /app

COPY package.json ./
COPY bun.lockb ./

RUN bun install
COPY . .

RUN bun run build

EXPOSE 3000

CMD [ "bun", "run", "start" ]