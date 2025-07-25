FROM nimlang/nim:2.2.4-ubuntu-regular

RUN apt-get update && apt-get install -y curl libpcre3 libpcre3-dev

WORKDIR /app
COPY . .

RUN [ "nimble", "-y", "-d:ssl", "-d:release", "--opt:speed", "--mm:orc", "--threads:on", "-d:useStdLib", "-d:ThreadPoolSize=4", "build" ]

EXPOSE 3000/tcp

ENTRYPOINT [ "./bin/parser" ]
