FROM oven/bun:1.2.0

WORKDIR /app

COPY package.json ./
COPY bun.lockb ./

RUN bun install
COPY . .

RUN bun run build

EXPOSE 3000/tcp

CMD [ "bun", "run", "start" ]
