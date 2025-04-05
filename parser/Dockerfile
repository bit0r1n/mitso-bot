FROM nimlang/nim:2.2.2

RUN apt-get update && apt-get install -y curl libpcre3 libpcre3-dev

WORKDIR /app
COPY . .

RUN ["nimble", "-y", "build"]

EXPOSE 3000/tcp

ENTRYPOINT [ "./bin/parser" ]
