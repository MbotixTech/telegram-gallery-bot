const { Markup } = require('telegraf');
const { getUserMedia } = require('../utils/db');
const Media = require('../models/Media');

const lastMediaMessageMap = new Map();
const lastGalleryUiMap = new Map();

module.exports = (bot, safeReply, safeTelegram) => {
  bot.action(/gallery_\d+/, async (ctx) => {
    const userId = ctx.from.id;
    const mediaList = await getUserMedia(userId);
    if (!mediaList.length) return safeReply(ctx, 'reply', '📂 Galeri kamu kosong.');

    const grouped = {};
    for (const m of mediaList) {
      if (!m.type || !m.file_id) continue;
      if (!grouped[m.type]) grouped[m.type] = [];
      grouped[m.type].push(m);
    }

    const buttons = Object.keys(grouped).map(type => [
      Markup.button.callback(`📦 ${type.toUpperCase()} (${grouped[type].length})`, `gallery_type_${type}_0`)
    ]);

    buttons.push([Markup.button.callback('🔙 Kembali ke Menu', 'start')]);
    const keyboard = Markup.inlineKeyboard(buttons);

    try {
      await ctx.editMessageText('🗂 Pilih kategori media:', {
        reply_markup: keyboard.reply_markup
      });
    } catch (err) {
      const sent = await safeTelegram(ctx, 'sendMessage', ctx.chat.id, '🗂 Pilih kategori media:', {
        reply_markup: keyboard.reply_markup
      });
      lastGalleryUiMap.set(ctx.from.id, sent.message_id);
    }
  });

  bot.action(/gallery_type_(\w+)_(\d+)/, async (ctx) => {
    const [_, type, pageStr] = ctx.match;
    const userId = ctx.from.id;
    const page = parseInt(pageStr);
    const perPage = 4;

    const all = await getUserMedia(userId);
    const filtered = all.filter(m => m.type === type);
    const totalPages = Math.ceil(filtered.length / perPage);
    const paged = filtered.slice(page * perPage, (page + 1) * perPage);

    const mediaButtons = paged.map((m, i) => [
      Markup.button.callback(`📎 Media ${page * perPage + i + 1}`, `gallery_show_${m._id}_${type}_${page}`)
    ]);

    const nav = [];
    if (page > 0) nav.push(Markup.button.callback('« Prev', `gallery_type_${type}_${page - 1}`));
    if (page < totalPages - 1) nav.push(Markup.button.callback('Next »', `gallery_type_${type}_${page + 1}`));

    const back = [Markup.button.callback('🔙 Kembali ke Kategori', `gallery_${userId}`)];

    const inline = Markup.inlineKeyboard([
      ...mediaButtons,
      ...(nav.length ? [nav] : []),
      back
    ]);

    const fullText = `📂 ${type.toUpperCase()} - Halaman ${page + 1} dari ${totalPages}`;

    try {
      const sent = await ctx.editMessageText(fullText, {
        reply_markup: inline.reply_markup
      });
      lastGalleryUiMap.set(ctx.from.id, sent.message_id);
    } catch (err) {
      const sent = await safeTelegram(ctx, 'sendMessage', ctx.chat.id, fullText, {
        reply_markup: inline.reply_markup
      });
      lastGalleryUiMap.set(ctx.from.id, sent.message_id);
    }
  });

  bot.action(/gallery_show_(.+)_(\w+)_(\d+)/, async (ctx) => {
    const mediaId = ctx.match[1];
    const userId = ctx.from.id;
    const media = await Media.findById(mediaId);
    if (!media || media.userId !== userId) {
      return safeReply(ctx, 'reply', '❌ Media tidak ditemukan atau bukan milikmu.');
    }

    const content = {
      type: media.type === 'photo' ? 'photo' : media.type === 'video' ? 'video' : 'document',
      media: media.file_id
    };

    const lastMsgId = lastMediaMessageMap.get(userId);
    if (lastMsgId) {
      try {
        await ctx.telegram.deleteMessage(ctx.chat.id, lastMsgId);
      } catch (_) {}
    }

    const lastUiMsgId = lastMediaMessageMap.get(`${userId}_ui`);
    if (lastUiMsgId) {
      try {
        await ctx.telegram.deleteMessage(ctx.chat.id, lastUiMsgId);
      } catch (_) {}
    }

    const sent = await ctx.telegram.sendMediaGroup(ctx.chat.id, [content]);
    if (sent?.[0]?.message_id) {
      lastMediaMessageMap.set(userId, sent[0].message_id);
    }

    const backBtn = Markup.inlineKeyboard([
      [Markup.button.callback('🔙 Kembali ke Halaman', `gallery_type_${media.type}_0`)],
      [Markup.button.callback('🗑 Hapus Media Ini', `delete_${media._id}`)]
    ]);

    const msg = await ctx.reply('📁 Pilih media lain atau kembali:', {
      reply_markup: backBtn.reply_markup
    });
    lastMediaMessageMap.set(`${userId}_ui`, msg.message_id);
  });

  bot.action(/delete_(.+)/, async (ctx) => {
    const mediaId = ctx.match[1];
    const userId = ctx.from.id;
    const media = await Media.findById(mediaId);

    if (!media || media.userId !== userId) {
      return safeReply(ctx, 'reply', '❌ Tidak diizinkan.');
    }

    await Media.deleteOne({ _id: mediaId });

    const lastMediaMsgId = lastMediaMessageMap.get(userId);
    if (lastMediaMsgId) {
      try {
        await ctx.telegram.deleteMessage(ctx.chat.id, lastMediaMsgId);
      } catch (_) {}
    }

    const lastUiMsgId = lastMediaMessageMap.get(`${userId}_ui`);
    if (lastUiMsgId) {
      try {
        await ctx.telegram.deleteMessage(ctx.chat.id, lastUiMsgId);
      } catch (_) {}
    }

    const lastGalleryUi = lastGalleryUiMap.get(userId);
    if (lastGalleryUi) {
      try {
        await ctx.telegram.deleteMessage(ctx.chat.id, lastGalleryUi);
      } catch (_) {}
    }

    await ctx.telegram.answerCbQuery(ctx.callbackQuery.id, '✅ Media dihapus.');
    ctx.callbackQuery.data = `gallery_type_${media.type}_0`;
    return bot.handleUpdate({ ...ctx.update, callback_query: ctx.callbackQuery });
  });
};