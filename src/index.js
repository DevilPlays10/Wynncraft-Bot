const { Client, GatewayIntentBits} = require('discord.js');
const fs = require('fs')
const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});
const axios = require('axios')
axios.defaults.timeout = 2500

const data = {
  storage: "src\\storage",
  urls: {
    mcpingurl: "https://api.mcstatus.io/v2/status/",
    wyn: "https://api.wynncraft.com/v3/"
  },
  user: null, //do not change, changes automatically after once event
}

const tokens = JSON.parse(fs.readFileSync(data.storage+"/tokens.json"))
client.login(tokens.disc_token)

module.exports = { tokens, data, client, updateVariable, getLang, axios, send }

client.once('ready', async (c) => {
  require('./workers/handler.js')(client)
  require('./workers/process/war_logger.js')
  data.user = c.user
  console.log(await require('./workers/register.js')?? "Successfuly registered commands")
});

function updateVariable(route, key, newValue) {
  const data = fs.readFileSync(route, 'utf8');
  const config = JSON.parse(data);
  config[key] = newValue;
 fs.writeFileSync(route, JSON.stringify(config, null, 2), 'utf8');
}

function getLang(interaction) {
  const lang = JSON.parse(fs.readFileSync(data.storage + "/languages.json"))
  return lang[interaction.locale.slice(0, 2)]?? lang.en
}
/**
 * Send a message to a discord channel
 * @param {string} id discord channel id
 * @param {object} data data to send in object format {content: String} ...
 * @returns message object
 */
async function send(id, data) {
  try {
    const channel = client.channels.cache.get(id)
    return await channel.send(data)
  } catch(e)  {
    return e
  }
}