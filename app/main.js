const Discord = require("discord.js");
const client = new Discord.Client();
var shell = require("shelljs");
shell.config.silent = true;
const Gamedig = require('gamedig');
const servers = JSON.parse(process.env.GAMESERVERS_JSON)
const { setIntervalAsync } = require('set-interval-async/legacy')

const buildServerMessage = async (server) => {
  const {id, type, host, port, discordStatusChanelId} = server
  const query = await Gamedig.query({
    type,
    host,
    port
  })

  return {discordStatusChanelId, message: `${query.raw.rules.GameName}: ${query.raw.game}
  Players: ${query.players.length}/${query.maxplayers}
  Map: ${query.map}
  Version: ${query.raw.rules.Version}
  GameMode: ${query.raw.rules.GameMode}
  steam://connect/${query.raw.rules.IP}:${query.raw.rules.Port}`}
}

const buildMessage = async () => {
  //server info
  const rawMemory = [].concat.apply([], shell
    .exec("free -m")
    .split("\n")[1].split(/\s/)).filter((x => x));

  rawMemory.shift()

  const memory = {
    total: (parseInt(rawMemory[0]) / 1024).toFixed(1).replace('.0',''),
    used: (parseInt(rawMemory[1]) / 1024).toFixed(1).replace('.0',''),
    // free: (parseInt(rawMemory[2]) / 1024).toFixed(1).replace('.0',''),
    // shared: (parseInt(rawMemory[3]) / 1024).toFixed(1).replace('.0',''),
    // cache: (parseInt(rawMemory[4]) / 1024).toFixed(1).replace('.0',''),
    // available: (parseInt(rawMemory[5]) / 1024).toFixed(1).replace('.0','')
  }

  const diskRaw = shell.exec('df | grep /$').split(/\s/)
  const disk = {
    filesystem: diskRaw[0],
    blocks: diskRaw[1],
    used: (parseInt(diskRaw[2])/1024/1024).toFixed(1).replace('.0',''),
    available: (parseInt(diskRaw[3])/1024/1024).toFixed(1).replace('.0',''),
    usedPercent: diskRaw[5],
    mountpoint: diskRaw[6]
  }

  let message = [`Resources:
  Memory: ${((parseInt(rawMemory[1]) * 100) / parseInt(rawMemory[0])).toFixed()}%
    Used:  ${memory.used}gb
    Total: ${memory.total}gb
  Disk: ${disk.usedPercent}
    Used:  ${disk.used}gb
    Free:  ${disk.available}gb

`]

  let serverMessages = []
  for (const server of servers)
    serverMessages.push(await buildServerMessage(server))
  return {message, serverMessages}
}

const updateLastMessage = async (message, channelId) => {
  const channel = await client.channels.cache.get(channelId)

  let lastMessage
  let newMessage = false
  try{
    lastMessage = await channel.messages.fetch(channel.lastMessageID)
  }catch{
    newMessage = true
  }

  let messageContent = message + `

  ${new Date().toISOString()}`

  messageContent = messageContent.replace(process.env.REPLACE_IP, process.env.REPLACE_DOMAIN)

  if(newMessage){
    channel.send(messageContent)
  }else{
    try{
      const something = await lastMessage.edit(messageContent)
    }catch{
      channel.send(messageContent)
    }
  }
}

const updateStatus = async () => {
  const infos = await buildMessage()
  let mainMessageContent = [infos.message, ...infos.serverMessages.map(x => x.message)].join('') 
  await updateLastMessage(mainMessageContent, process.env.SERVER_STATUS_CHANNEL_ID)
  for (const gameserver of infos.serverMessages)
    await updateLastMessage(gameserver.message, gameserver.discordStatusChanelId)
};

let intervalTimer;
client.on("ready", async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  console.log(`Monitoring: ${JSON.stringify(servers)}`)
  await updateStatus();
  intervalTimer = setIntervalAsync(updateStatus, parseInt(process.env.UPDATE_INTERVAL_MS));
});

try{
  console.log("starting with setIntervalAsync")
  client.login(process.env.STATUS_BOT_DISCORD_TOKEN);
}catch(error){
  console.log(error)
  process.exit()
}
