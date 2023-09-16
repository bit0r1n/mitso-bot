FROM alpine:latest

RUN apk add --no-cache curl

WORKDIR /cron

COPY ./crontab /etc/cron.d/crontab

RUN chmod 0644 /etc/cron.d/crontab

RUN /usr/bin/crontab /etc/cron.d/crontab

ENTRYPOINT [ "cron", "-f" ]