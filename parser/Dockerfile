FROM nimlang/nim:2.2.2

RUN apk update
RUN apk add --no-cache \
  pcre-dev \
  curl

WORKDIR /app
COPY . .

RUN ["nimble", "-y", "build"]

EXPOSE 3000/tcp

ENTRYPOINT [ "./bin/parser" ]
