const sendError = async (client, channelId, title, error) => {
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) return;
  const content = `**${title}**\n\n\`\`\`${error && error.stack ? error.stack : String(error)}\`\`\``;
  await channel.send({ content }).catch(() => {});
};

function setupErrorHandling(client, channelId) {
  process.on('unhandledRejection', error => {
    sendError(client, channelId, 'Unhandled Rejection', error);
  });
  process.on('uncaughtException', async error => {
    await sendError(client, channelId, 'Uncaught Exception', error);
    process.exit(1);
  });
  client.on('error', error => {
    sendError(client, channelId, 'Client Error', error);
  });
}

module.exports = { setupErrorHandling };
