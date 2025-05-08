const { Telegraf, Markup } = require('telegraf');
const PQueue = require('p-queue').default;
const {
  connectDB,
  saveMedia,
  getUserMedia,
  deleteMedia,
  getAllUsers,
  getUserMediaByTypePaged
} = require('./utils/db');
const Media = require('./models/Media');
require('dotenv').config();

console.log('🚀 Bot is starting...');

const bot = new Telegraf(process.env.BOT_TOKEN);
connectDB(process.env.MONGO_URI);

const ADMIN_ID = process.env.ADMIN_ID;
const userUploadMap = new Map();
const replyQueue = new PQueue({ concurrency: 3 });

const safeReply = (ctx, method, ...args) => {
  console.log(`[${method.toUpperCase()}]`, args);
  return replyQueue.add(() => ctx[method](...args));
};
const safeTelegram = (ctx, method, ...args) => {
  console.log(`[TG.${method}]`, args);
  return replyQueue.add(() => ctx.telegram[method](...args));
};

let botInfo = null;
let botPhotoFileId = null;

(async () => {
  botInfo = await bot.telegram.getMe();
  console.log(`🤖 Bot jalan sebagai @${botInfo.username}`);
  const photos = await bot.telegram.getUserProfilePhotos(botInfo.id, { limit: 1 });
  if (photos.total_count > 0) {
    botPhotoFileId = photos.photos[0][0].file_id;
    console.log('📸 Foto profil bot disimpan.');
  } else {
    console.log('⚠️ Bot tidak memiliki foto profil.');
  }
})();

const showStartMenu = async (ctx) => {
  const { first_name, last_name, id } = ctx.from;
  const fullName = [first_name, last_name].filter(Boolean).join(' ');
  const isAdmin = id.toString() === ADMIN_ID;
  const userMenu = [
    [{ text: '📤 Upload Media', callback_data: 'upload' }],
    [{ text: '📁 Lihat Galeri', callback_data: 'gallery_0' }]
  ];
  const adminMenu = [
    ...userMenu,
    [{ text: '🧑‍💻 Admin Panel', callback_data: 'admin_panel' }]
  ];

  try {
    if (botPhotoFileId) {
      await ctx.replyWithPhoto(botPhotoFileId, {
        caption: `👋 Selamat datang kembali, *${fullName}*!`,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: isAdmin ? adminMenu : userMenu }
      });
    } else {
      await ctx.reply(`👋 Selamat datang kembali, *${fullName}*!`, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: isAdmin ? adminMenu : userMenu }
      });
    }
  } catch (err) {
    console.log('❌ Gagal kirim start menu:', err.message);
  }
};

bot.start(async (ctx) => {
  await showStartMenu(ctx);
});

bot.action('upload', async (ctx) => {
  const userId = ctx.from.id;
  console.log(`📥 Upload mode ON by ${userId}`);
  const waitMsg = await safeReply(ctx, 'reply', '⏳ Kirim semua media yang ingin diupload. Jika selesai, tekan tombol di bawah.');

  userUploadMap.set(userId, {
    active: true,
    waitMsgId: waitMsg.message_id
  });

  const doneButton = Markup.inlineKeyboard([
    [Markup.button.callback('✅ Selesai Upload', 'done_upload')]
  ]);
  await ctx.reply('📦 Klik jika selesai upload:', { reply_markup: doneButton.reply_markup });
});

bot.action('done_upload', async (ctx) => {
  const userId = ctx.from.id;
  const state = userUploadMap.get(userId);
  userUploadMap.delete(userId);
  await ctx.answerCbQuery('✅ Upload selesai!');

  if (state?.waitMsgId) {
    try {
      await ctx.telegram.deleteMessage(ctx.chat.id, state.waitMsgId);
    } catch (_) {}
  }

  try {
    await ctx.deleteMessage();
  } catch (_) {}
});

bot.on('message', async (ctx) => {
  const msg = ctx.message;
  const userId = ctx.from.id;
  const fullName = [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ');

  const uploadState = userUploadMap.get(userId);
  if (!uploadState?.active) {
    console.log(`⚠️ Media dari ${userId} diabaikan karena belum klik Upload`);
    return;
  }

  let file_id, type;

  if (msg.photo) file_id = msg.photo.at(-1).file_id, type = 'photo';
  else if (msg.video) file_id = msg.video.file_id, type = 'video';
  else if (msg.document) file_id = msg.document.file_id, type = 'document';
  else if (msg.audio) file_id = msg.audio.file_id, type = 'audio';
  else if (msg.voice) file_id = msg.voice.file_id, type = 'voice';
  else if (msg.animation) file_id = msg.animation.file_id, type = 'animation';
  else if (msg.sticker) file_id = msg.sticker.file_id, type = 'sticker';
  else return safeReply(ctx, 'reply', '❌ Jenis file belum didukung.');

  await saveMedia(userId, file_id, type, fullName);
  console.log(`✅ Saved media: ${type} - ${file_id} by ${userId}`);

  try { await ctx.deleteMessage(msg.message_id); } catch (e) {}

  if (uploadState?.waitMsgId) {
    try {
      await safeTelegram(ctx, 'editMessageText', ctx.chat.id, uploadState.waitMsgId, undefined, '✅ Media berhasil disimpan!');
      setTimeout(() => safeTelegram(ctx, 'deleteMessage', ctx.chat.id, uploadState.waitMsgId).catch(() => {}), 3000);
    } catch (e) {}
  }
});

require('./handlers/gallery')(bot, safeReply, safeTelegram);
require('./handlers/admin')(bot, safeReply, safeTelegram);

bot.launch();
console.log('✅ Bot launched');