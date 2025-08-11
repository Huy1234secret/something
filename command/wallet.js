async function sendWalletCard(user, send, data) {
  const stats = data.user_stats[user.id] || { coins: 0, diamonds: 0, deluxe_coins: 0 };
  await send(
    `Coins: ${stats.coins}\nDiamonds: ${stats.diamonds}\nDeluxe Coins: ${stats.deluxe_coins}`
  );
}

module.exports = { sendWalletCard };
