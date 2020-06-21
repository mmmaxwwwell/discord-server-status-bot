const Discord = require("discord.js");
const client = new Discord.Client();
const { readFileSync, readFile } = require("fs");
var shell = require("shelljs");

const updateStatus = () => {
  const memVals = shell
    .exec("cat /proc/meminfo | head -n 2")
    .split("\n")
    .map((v, i) => (parseInt(v.replace(/[^0-9]/g, ""))/1000000).toFixed(1))
    .filter((val) => val)
    .reverse();

  const memString = `${memVals[1]}/${memVals[2]}gb free/total ram`.replace('.0','')
  // console.log({ memVals , memString});
  client.user.setActivity(memString, {
    type: "PLAYING",
    // url: "https://www.example.com"
  });
};

let intervalTimer;
client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
  updateStatus();
  intervalTimer = setInterval(updateStatus, 10000);
});

client.login(process.env.DISCORD_TOKEN);

clearInterval(intervalTimer);
