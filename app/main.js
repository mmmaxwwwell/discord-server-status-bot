const Discord = require("discord.js");
const client = new Discord.Client();
var shell = require("shelljs");
shell.config.silent = true;
const Gamedig = require('gamedig');
const servers = JSON.parse(process.env.GAMESERVERS_JSON)
const moment = require('moment')
const tz = require('moment-timezone')
const { setIntervalAsync } = require('set-interval-async/legacy')
const hostIp = shell.exec('ip route show | awk \'/default/ {print $3}\'')

const buildServerMessage = async (server) => {
  const {id, type, host, port, discordStatusChanelId} = server
  let query
  try{
    query = await Gamedig.query({
      type,
      host,
      port
    }).catch((err)=>{
      // console.log(err)
    })
  }catch(ex){

  }

  if(!query)
    return ""
  switch (type){
    case '7d2d':
      return {discordStatusChanelId, message: `🧟🧟🧟
      ${query.raw.rules.GameName}: ${query.raw.game}
      Players: ${query.players.length}/${query.maxplayers}
      Map: ${query.map}
      Version: ${query.raw.rules.Version}
      GameMode: ${query.raw.rules.GameMode}
      steam://connect/${query.raw.rules.IP}:${query.raw.rules.Port}`}
    case 'rust':
      const wiped = new moment(parseInt(query.raw.tags.split(',').find(x => x.startsWith('born')).replace(/\D/g,''))*1000).tz('America/New_York').format("MMMM Do YYYY, h:mm:ss a z")
      return {discordStatusChanelId, message: `${query.name}: ${query.raw.game}
      Players: ${query.players.length}/${query.maxplayers}
      Map: ${query.map.replace('Map','')}
      Wiped: ${wiped}
      World Size: ${parseInt(query.raw.rules['world.size'])/1000}km
      FPS Average: ${query.raw.rules.fps_avg}
      steam://connect/${query.connect}`}
    case 'spaceengineers':
      console.log({query})
      console.log(query.raw.rules)
      return {discordStatusChanelId, message: `🛰🚀🌌☄
      Players: ${query.raw.numplayers}/${query.maxplayers}`}
  }
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

  let message = [`👑
Resources:
  Memory: ${((parseInt(rawMemory[1]) * 100) / parseInt(rawMemory[0])).toFixed()}%
    Used:  ${memory.used}gb
    Total: ${memory.total}gb
  
For more detailed stats on our servers, and quick connect links, check out:
${servers.map(x => `<#${x.discordStatusChanelId}>`).join('\n')}`]
  let serverMessages = []
  for (let server of servers){
    serverMessages.push(await buildServerMessage(server))
  }
  return {message, serverMessages}
}

const updateLastMessage = async (message, channelId) => {
  const channel = await client.channels.cache.get(channelId)

  let lastMessage
  let newMessage 

  if(!channel){
    // console.log(`channel ${channelId} not found`)
    return
  }

  if(!channel.lastMessageID)
    newMessage = true
  else
    try{
      lastMessage = await channel.messages.fetch(channel.lastMessageID)
    }catch(ex){
      console.error(ex)
      newMessage = true
    }

  let messageContent = message + `

  ${new Date().toISOString()}`

  messageContent = messageContent.replace(/((:?\d{1,3}\.){3,3}\d{1,3})/g, process.env.REPLACE_DOMAIN)

  try{
    if(newMessage)
      await channel.send(messageContent)
    else
      await lastMessage.edit(messageContent)
  }catch{

  }
}

const updateStatus = async () => {
  const infos = await buildMessage()
  let mainMessageContent = [infos.message].join('') 
  await updateLastMessage(mainMessageContent, process.env.SERVER_STATUS_CHANNEL_ID)
  for (const gameserver of infos.serverMessages){
    await updateLastMessage(gameserver.message, gameserver.discordStatusChanelId)
  }
};

let intervalTimer;
client.on("ready", async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  console.log(`Monitoring: ${JSON.stringify(servers)}`)
  intervalTimer = setIntervalAsync(updateStatus, parseInt(process.env.UPDATE_INTERVAL_MS));
});

try{
  console.log("starting with setIntervalAsync")
  client.login(process.env.STATUS_BOT_DISCORD_TOKEN);
}catch(error){
  console.log(error)
  process.exit()
}
