const { Markup } = require('telegraf');
const { getAllUsers, getUserMedia } = require('../utils/db');
const Media = require('../models/Media');

const lastMediaMessageMap = new Map();
const lastUiMessageMap = new Map();

module.exports = (bot, safeReply, safeTelegram) => {
  bot.action('admin_panel', async (ctx) => {
    const isAdmin = ctx.from.id.toString() === process.env.ADMIN_ID;
    if (!isAdmin) return;

    const users = await getAllUsers();
    const buttons = users.map(u => [
      Markup.button.callback(`🧑 ${u.full_name || 'Tanpa Nama'} (${u._id})`, `admin_gallery_${u._id}`)
    ]);

    await safeReply(ctx, 'reply', '📋 Pilih user untuk melihat media mereka:', {
      reply_markup: Markup.inlineKeyboard(buttons)
    });
  });

  bot.action(/admin_gallery_(\d+)/, async (ctx) => {
    const userId = parseInt(ctx.match[1]);
    const mediaList = await getUserMedia(userId);

    if (!mediaList.length) return safeReply(ctx, 'reply', '📂 Galeri user ini kosong.');
    const grouped = {};
    mediaList.forEach(m => {
      if (!grouped[m.type]) grouped[m.type] = [];
      grouped[m.type].push(m);
    });

    const buttons = Object.keys(grouped).map(type => [
      Markup.button.callback(`📦 ${type.toUpperCase()} (${grouped[type].length})`, `admin_gallery_type_${userId}_${type}_0`)
    ]);

    await safeReply(ctx, 'reply', '🗂 Kategori media:', {
      reply_markup: Markup.inlineKeyboard(buttons)
    });
  });

  bot.action(/admin_gallery_type_(\d+)_(\w+)_(\d+)/, async (ctx) => {
    const userId = parseInt(ctx.match[1]);
    const type = ctx.match[2];
    const page = parseInt(ctx.match[3]);
    const perPage = 5;

    const all = await getUserMedia(userId);
    const filtered = all.filter(m => m.type === type);
    const totalPages = Math.ceil(filtered.length / perPage);
    const paged = filtered.slice(page * perPage, (page + 1) * perPage);

    const buttons = paged.map((m, i) => [
      Markup.button.callback(`📎 Media ${page * perPage + i + 1}`, `admin_gallery_show_${m._id}_${userId}_${type}_${page}`)
    ]);

    const navButtons = [];
    if (page > 0) navButtons.push(Markup.button.callback('« Prev', `admin_gallery_type_${userId}_${type}_${page - 1}`));
    if (page < totalPages - 1) navButtons.push(Markup.button.callback('Next »', `admin_gallery_type_${userId}_${type}_${page + 1}`));

    const inline = Markup.inlineKeyboard([
      ...buttons,
      ...(navButtons.length ? [navButtons] : [])
    ]);

    await safeReply(ctx, 'reply', `📂 ${type.toUpperCase()} - Halaman ${page + 1} dari ${totalPages}`, {
      reply_markup: inline.reply_markup
    });
  });

  bot.action(/admin_gallery_show_(.+)_(\d+)_(\w+)_(\d+)/, async (ctx) => {
    const mediaId = ctx.match[1];
    const userId = parseInt(ctx.match[2]);
    const type = ctx.match[3];
    const page = parseInt(ctx.match[4]);

    const media = (await getUserMedia(userId)).find(m => m._id.toString() === mediaId);
    if (!media) return safeReply(ctx, 'reply', '❌ Media tidak ditemukan.');

    const lastMediaId = lastMediaMessageMap.get(ctx.from.id);
    if (lastMediaId) {
      try { await ctx.telegram.deleteMessage(ctx.chat.id, lastMediaId); } catch (_) {}
    }

    const lastUiId = lastUiMessageMap.get(ctx.from.id);
    if (lastUiId) {
      try { await ctx.telegram.deleteMessage(ctx.chat.id, lastUiId); } catch (_) {}
    }

    const content = {
      type: media.type === 'photo' ? 'photo' : media.type === 'video' ? 'video' : 'document',
      media: media.file_id
    };

    const sent = await ctx.telegram.sendMediaGroup(ctx.chat.id, [content]);
    if (sent?.[0]?.message_id) {
      lastMediaMessageMap.set(ctx.from.id, sent[0].message_id);
    }

    const backBtn = Markup.inlineKeyboard([
      [Markup.button.callback('🔙 Kembali', `admin_gallery_type_${userId}_${type}_${page}`)],
      [Markup.button.callback('🗑 Hapus Media Ini', `admin_delete_${mediaId}_${userId}_${type}_${page}`)]
    ]);

    const msg = await ctx.reply('📁 Kontrol media:', {
      reply_markup: backBtn.reply_markup
    });

    lastUiMessageMap.set(ctx.from.id, msg.message_id);
  });

  bot.action(/admin_delete_(.+)_(\d+)_(\w+)_(\d+)/, async (ctx) => {
    const mediaId = ctx.match[1];
    const userId = parseInt(ctx.match[2]);
    const type = ctx.match[3];
    const page = parseInt(ctx.match[4]);

    const mediaList = await getUserMedia(userId);
    const media = mediaList.find(m => m._id.toString() === mediaId);
    if (!media) return safeReply(ctx, 'reply', '❌ Media tidak ditemukan.');

    await Media.deleteOne({ _id: mediaId });

    const lastMsg = lastMediaMessageMap.get(ctx.from.id);
    if (lastMsg) {
      try { await ctx.telegram.deleteMessage(ctx.chat.id, lastMsg); } catch (_) {}
    }

    const lastUi = lastUiMessageMap.get(ctx.from.id);
    if (lastUi) {
      try { await ctx.telegram.deleteMessage(ctx.chat.id, lastUi); } catch (_) {}
    }

    await ctx.telegram.answerCbQuery(ctx.callbackQuery.id, '✅ Media dihapus.');
    ctx.callbackQuery.data = `admin_gallery_type_${userId}_${type}_${page}`;
    return bot.handleUpdate({ ...ctx.update, callback_query: ctx.callbackQuery });
  });
};
