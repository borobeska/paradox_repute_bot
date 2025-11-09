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

// Инициализация Google Sheets
let doc;
async function initializeGoogleSheet() {
  try {
    doc = new GoogleSpreadsheet(SPREADSHEET_ID);
    
    // Аутентификация с использованием сервисного аккаунта
    // Создайте сервисный аккаунт и добавьте его email в вашу таблицу как редактора
    await doc.useServiceAccountAuth({
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    });
    
    await doc.loadInfo();
    console.log('✅ Подключение к Google Таблице установлено');
    return true;
  } catch (error) {
    console.error('❌ Ошибка подключения к Google Таблице:', error);
    return false;
  }
}

// Команда /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 
    `🤖 *Paradox Repute Bot* \\- Управление репутацией\n\n` +
    `*Доступные команды:*\n` +
    `/start \\- начать работу\n` +
    `/help \\- помощь\n` +
    `/status Имя \\- показать репутацию\n` +
    `/изменить Имя Фракция Значение \\- изменить репутацию\n` +
    `/добавить Имя \\- добавить нового персонажа\n` +
    `/колонки \\- показать доступные фракции\n` +
    `/test \\- проверить работу бота\n\n` +
    `*Примеры:*\n` +
    `/status Ороч\n` +
    `/изменить Ороч Бармен 5\n` +
    `/добавить НовыйПерсонаж`,
    { parse_mode: 'MarkdownV2' }
  );
});

// Команда /help
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 
    `📋 *Помощь по командам*\n\n` +
    `/status Имя \\- показать репутацию персонажа\n` +
    `/изменить Имя Фракция Значение \\- изменить репутацию\n` +
    `/добавить Имя \\- добавить нового персонажа\n` +
    `/колонки \\- показать доступные фракции\n` +
    `/test \\- проверить работу бота\n\n` +
    `*Фракции:* Бармен, Сидор, Ученые, ДОЛГ, Бандиты, Военные, Монолит\n\n` +
    `*Диапазон значений:* от \\-5 до 5`,
    { parse_mode: 'MarkdownV2' }
  );
});

// Команда /test
bot.onText(/\/test/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, '✅ Бот работает корректно на Render\\.com!', { parse_mode: 'MarkdownV2' });
});

// Команда /колонки - показать доступные фракции
bot.onText(/\/колонки/, (msg) => {
  const chatId = msg.chat.id;
  const factions = ['Бармен', 'Сидор', 'Ученые', 'ДОЛГ', 'Бандиты', 'Военные', 'Монолит'];
  
  let response = `📋 *Доступные фракции:*\n\n`;
  factions.forEach(faction => {
    response += `• ${faction}\n`;
  });
  response += `\n*Используйте эти названия в команде /изменить*`;
  
  bot.sendMessage(chatId, response, { parse_mode: 'MarkdownV2' });
});

// Команда /status - показать репутацию персонажа
bot.onText(/\/status (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const name = match[1];

  try {
    if (!doc) {
      await initializeGoogleSheet();
    }

    const sheet = doc.sheetsByIndex[0];
    await sheet.loadCells('A1:H100'); // Загружаем ячейки
    
    const rows = await sheet.getRows();
    const headers = ['Имя', 'Бармен', 'Сидор', 'Ученые', 'ДОЛГ', 'Бандиты', 'Военные', 'Монолит'];
    
    // Ищем персонажа
    const characterRow = rows.find(row => row.Имя === name);
    
    if (characterRow) {
      let response = `📊 *Статус ${name}:*\n\n`;
      
      for (let i = 1; i < headers.length; i++) {
        const faction = headers[i];
        const value = characterRow[faction] || 0;
        const emoji = value > 0 ? '🟢' : value < 0 ? '🔴' : '⚪';
        response += `${emoji} *${faction}:* ${value}\n`;
      }
      
      bot.sendMessage(chatId, response, { parse_mode: 'MarkdownV2' });
    } else {
      bot.sendMessage(chatId, `❌ Персонаж "*${name}*" не найден\\. Используйте /добавить для создания нового персонажа\\.`, { 
        parse_mode: 'MarkdownV2' 
      });
    }
    
  } catch (error) {
    console.error('Error in /status:', error);
    bot.sendMessage(chatId, '❌ Ошибка при поиске данных в таблице', { parse_mode: 'MarkdownV2' });
  }
});

// Команда /изменить - изменить репутацию
bot.onText(/\/изменить (.+) (.+) (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const name = match[1];
  const faction = match[2];
  const value = parseInt(match[3]);

  try {
    // Проверяем значение
    if (isNaN(value) || value < -5 || value > 5) {
      bot.sendMessage(chatId, '❌ Значение должно быть числом от \\-5 до 5', { parse_mode: 'MarkdownV2' });
      return;
    }

    // Проверяем фракцию
    const validFactions = ['Бармен', 'Сидор', 'Ученые', 'ДОЛГ', 'Бандиты', 'Военные', 'Монолит'];
    if (!validFactions.includes(faction)) {
      bot.sendMessage(chatId, 
        `❌ Неверное название фракции\\. Доступные фракции: ${validFactions.join(', ')}\\. Используйте /колонки для просмотра`, 
        { parse_mode: 'MarkdownV2' }
      );
      return;
    }

    if (!doc) {
      await initializeGoogleSheet();
    }

    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();
    
    // Ищем персонажа
    const characterRow = rows.find(row => row.Имя === name);
    
    if (characterRow) {
      // Обновляем значение
      characterRow[faction] = value;
      await characterRow.save();
      
      bot.sendMessage(chatId, 
        `✅ Успешно обновлено\\!\n` +
        `*${name}:* ${faction} = ${value}`,
        { parse_mode: 'MarkdownV2' }
      );
    } else {
      bot.sendMessage(chatId, 
        `❌ Персонаж "*${name}*" не найден\\. Используйте /добавить для создания нового персонажа\\.`, 
        { parse_mode: 'MarkdownV2' }
      );
    }
    
  } catch (error) {
    console.error('Error in /изменить:', error);
    bot.sendMessage(chatId, '❌ Ошибка при обновлении данных', { parse_mode: 'MarkdownV2' });
  }
});

// Команда /добавить - добавить нового персонажа
bot.onText(/\/добавить (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const name = match[1];

  try {
    if (!doc) {
      await initializeGoogleSheet();
    }

    const sheet = doc.sheetsByIndex[0];
    const rows = await sheet.getRows();
    
    // Проверяем, нет ли уже такого имени
    const existingCharacter = rows.find(row => row.Имя === name);
    if (existingCharacter) {
      bot.sendMessage(chatId, 
        `❌ Персонаж "*${name}*" уже существует\\.`, 
        { parse_mode: 'MarkdownV2' }
      );
      return;
    }
    
    // Добавляем новую строку
    await sheet.addRow({
      'Имя': name,
      'Бармен': 0,
      'Сидор': 0,
      'Ученые': 0,
      'ДОЛГ': 0,
      'Бандиты': 0,
      'Военные': 0,
      'Монолит': 0
    });
    
    bot.sendMessage(chatId, 
      `✅ Новый персонаж "*${name}*" добавлен в таблицу\\.\n\n` +
      `Теперь вы можете установить значения репутации с помощью команды:\n` +
      `/изменить ${name} Фракция Значение`,
      { parse_mode: 'MarkdownV2' }
    );
    
  } catch (error) {
    console.error('Error in /добавить:', error);
    bot.sendMessage(chatId, '❌ Ошибка при добавлении персонажа', { parse_mode: 'MarkdownV2' });
  }
});

// Обработка обычных сообщений
bot.on('message', (msg) => {
  if (!msg.text.startsWith('/')) {
    bot.sendMessage(msg.chat.id, 
      'Отправьте /help для просмотра доступных команд', 
      { parse_mode: 'MarkdownV2' }
    );
  }
});

// Веб-сервер для Render
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Paradox Repute Bot</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          .header { background: #f0f0f0; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
          .commands { background: #f9f9f9; padding: 15px; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🤖 Paradox Repute Bot</h1>
          <p>Бот для управления репутацией персонажей</p>
          <p>Telegram: <a href="https://t.me/Paradox_Repute_Bot">@Paradox_Repute_Bot</a></p>
        </div>
        
        <div class="commands">
          <h3>📋 Доступные команды:</h3>
          <ul>
            <li><code>/start</code> - начать работу</li>
            <li><code>/help</code> - помощь</li>
            <li><code>/status [Имя]</code> - показать репутацию</li>
            <li><code>/изменить [Имя] [Фракция] [Значение]</code> - изменить репутацию</li>
            <li><code>/добавить [Имя]</code> - добавить нового персонажа</li>
            <li><code>/колонки</code> - показать доступные фракции</li>
          </ul>
        </div>
        
        <div style="margin-top: 20px;">
          <p><strong>Статус:</strong> <span style="color: green;">🟢 Активен</span></p>
          <p><strong>Хостинг:</strong> Render.com</p>
        </div>
      </body>
    </html>
  `);
});

// Инициализация и запуск сервера
const PORT = process.env.PORT || 3000;

async function startServer() {
  // Пытаемся инициализировать Google Таблицу при запуске
  await initializeGoogleSheet();
  
  app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`🤖 Бот активен!`);
  });
}

startServer().catch(console.error);