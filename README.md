# MITSO Schedule Bot
Бот для получения расписания мит со в тг... (а конкретнее [@mitsoScheldueBot](https://t.me/mitsoScheldueBot))

Реализация работы с API расписания находится в [отдельном пакете](https://github.com/bit0r1n/mitso-parser)

Вот кому-то делать нечего, вот и делает этих ваших ботов

### Запуск
TL;DR: botfather new bot -> `$ BOT_TOKEN=<bot token> docker compose up -d`

ладно мне лень расписывать чет


*опционально, для работы через вебхуки*

запустить бота с перменными:

 * `WEBHOOK_DOMAIN` - адрес, на который Telegram будет отправлять хуки
 * `WEBHOOK_SECRET` - "токен", который Telgram будет отправлять для защиты от посторонних запросов
 * `WEBHOOK_PATH` - путь, на который будут отправляться запросы
 
