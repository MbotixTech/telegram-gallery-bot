# 🚀 Telegram Gallery Bot

**Telegram Gallery Bot** is a media management bot built with Node.js and Telegraf.js. It allows users to upload, preview, and delete media (photos, videos, documents, etc.) with a smooth and interactive Telegram UI.

---

<p align="center">
  <img src="https://img.shields.io/github/license/MbotixTech/telegram-gallery-bot?style=flat-square" alt="License">
  <img src="https://img.shields.io/github/stars/MbotixTech/telegram-gallery-bot?style=flat-square" alt="Stars">
  <img src="https://img.shields.io/github/forks/MbotixTech/telegram-gallery-bot?style=flat-square" alt="Forks">
</p>

---

## ✨ Features

* 📤 Upload media only when upload mode is active.
* 🗂 Paginated media gallery by type (photo, video, document, etc).
* 🔎 Preview and delete media directly from Telegram.
* 🧑‍💻 Admin Panel to view other users' media.
* 📸 Automatically sends bot's profile photo on `/start`.
* 💬 Clean and responsive inline button UI.

---

## ⚙️ Tech Stack

* **Node.js** – JavaScript runtime
* **Telegraf.js** – Telegram Bot framework
* **MongoDB (Mongoose)** – Media database
* **PQueue** – Concurrency control for safe message replies

---

## 🚀 Getting Started

```bash
git clone https://github.com/yourusername/telegram-gallery-bot.git
cd telegram-gallery-bot
npm install
```

### Environment Variables

Create a `.env` file in the root directory:

```env
BOT_TOKEN=your_telegram_bot_token
ADMIN_ID=123456789
MONGO_URI=mongodb://localhost:27017/gallerybot
```

---

## ▶️ Running the Bot

```bash
npm start / node index.js
```

---

## 🧪 Project Structure

```
├── index.js               # Main bot logic
├── models/Media.js        # MongoDB schema
├── utils/db.js            # DB functions
├── handlers/gallery.js    # Gallery features (list, preview, delete)
├── handlers/admin.js      # Admin panel logic
├── .env                   # Secrets & config
```

---

## 🧠 How It Works

1. User sends `/start` → bot replies with photo + menu
2. User clicks `📤 Upload Media` → enters upload mode
3. Sends media → bot saves & deletes original message
4. Clicks `✅ Selesai Upload` → upload mode ends
5. User clicks `📁 Lihat Galeri` → sees media list by type
6. Clicks media → sees preview + delete button

---

## 📸 Preview

|                  Menu View                  |                  Media Preview                 |
| :-----------------------------------------: | :--------------------------------------------: |
| ![image](https://github.com/user-attachments/assets/7ef3f82e-f783-4b0e-85cc-1d2a63e150f1) | ![image](https://github.com/user-attachments/assets/4e21bea3-2435-47b2-9a7e-10838a0af2d3) |



---

## 💬 Contact

* Developer: [@xiaogarpu](https://t.me/xiaogarpu)

---

## 📄 License

This project is licensed under the MIT License – see the [LICENSE](LICENSE) file for details.
