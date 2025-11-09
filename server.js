const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const { GoogleSpreadsheet } = require('google-spreadsheet');

const app = express();
app.use(express.json());

// Конфигурация
const BOT_TOKEN = '8025399591:AAEhP3OfGFn33pP6T5-I36JlbfkSeak5Po0';
const SPREADSHEET_ID = '1TyZDzXKHY0YjfCl17Ytubu-nZtKZI_awFaC47i0lzjo';

// Инициализация бота
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

console.log('🤖 Бот запускается...');

// Команда /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 
    `🤖 *Paradox Repute Bot* \\- Управление репутацией\n\n` +
    `*Доступные команды:*\n` +
    `/start \\- начать работу\n` +
    `/help \\- помощь\n` +
    `/status Имя \\- показать репутацию\n` +
    `/test \\- проверить работу бота\n\n` +
    `*Пример:* /status Ороч`,
    { parse_mode: 'MarkdownV2' }
  );
});

// Команда /help
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 
    `📋 *Помощь по командам*\n\n` +
    `/status Имя \\- показать репутацию персонажа\n` +
    `/test \\- проверить работу бота\n` +
    `/help \\- эта справка\n\n` +
    `*Фракции:* Бармен, Сидор, Ученые, ДОЛГ, Бандиты, Военные, Монолит`,
    { parse_mode: 'MarkdownV2' }
  );
});

// Команда /test
bot.onText(/\/test/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, '✅ Бот работает корректно на Render\\.com!', { parse_mode: 'MarkdownV2' });
});

// Команда /status
bot.onText(/\/status (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const name = match[1];

  try {
    bot.sendMessage(chatId, `🔍 Ищу данные для: *${name}*`, { parse_mode: 'MarkdownV2' });
    
    // Здесь позже добавим работу с Google Таблицами
    // Сначала убедимся что бот работает
    
    setTimeout(() => {
      bot.sendMessage(chatId,
        `📊 *Статус ${name}:*\n` +
        `🟢 Бармен: 2\n` +
        `🔴 Сидор: \\-1\n` +
        `🟢 Ученые: 3\n` +
        `⚪ ДОЛГ: 0\n` +
        `🔴 Бандиты: \\-2\n` +
        `⚪ Военные: 0\n` +
        `🟢 Монолит: 4\n\n` +
        `*Это тестовые данные*\n` +
        `Работа с таблицей будет настроена позже`,
        { parse_mode: 'MarkdownV2' }
      );
    }, 1000);
    
  } catch (error) {
    console.error('Error:', error);
    bot.sendMessage(chatId, '❌ Ошибка при поиске данных', { parse_mode: 'MarkdownV2' });
  }
});

// Обработка обычных сообщений
bot.on('message', (msg) => {
  if (!msg.text.startsWith('/')) {
    bot.sendMessage(msg.chat.id, 'Отправьте /help для просмотра команд');
  }
});

// Веб-сервер для Render
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>Paradox Repute Bot</title></head>
      <body>
        <h1>🤖 Paradox Repute Bot</h1>
        <p>Бот работает на Render.com!</p>
        <p>Telegram: <a href="https://t.me/Paradox_Repute_Bot">@Paradox_Repute_Bot</a></p>
      </body>
    </html>
  `);
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`🤖 Бот активен!`);
});