const { Client, GatewayIntentBits, Partials} = require('discord.js');
const fs = require('fs')
const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel]
});

const axios = require('axios')
axios.defaults.timeout = 5000

const data = {
  storage: "src/storage",
  urls: {
    mcpingurl: "https://api.mcstatus.io/v2/status/",
    wyn: "https://api.wynncraft.com/v3/",
    wyntills: "https://athena.wynntils.com/cache/get/",
    ashcon: "https://api.ashcon.app/mojang/v2/"
  },
  user: null, //do not change, changes automatically after once event
  started: new Date()
}

const tokens = JSON.parse(fs.readFileSync(data.storage+"/tokens.json"))
client.login(tokens.disc_token)

const Utility = {
  Date: {
    /**
     * Current date in epochTime, Use new Date().getTime() for miliseconds
     * @returns {Integer} Epoch Time
     */
    now: () => (new Date() / 1000).toFixed(),
    /**
     * Relative time from given timestamp till now
     * @param {*} time time in EPOCH MILISECONDS
     * @param {String} include String of allowed usables, ydhms (year, day, hour, minute, second)
     * @param dura true to use miliseconds instead of epoch time
     * @param {Number} onlyFans  set to value if u want the output to be only biggest num, like 2y instead of 2y 29d etc
     * @returns 
     */
    relative: (time, include, dura, onlyFans) => {
      const elapsedTime = dura ? time : new Date() - new Date(time);
      let totalSeconds = Math.floor(elapsedTime / 1000);

      const units = {
        y: 31536000,
        d: 86400,
        h: 3600,
        m: 60,
        s: 1
      };

      const array = [];

      for (const [unit, value] of Object.entries(units)) {
        if (include.includes(unit)) {
          const amount = Math.floor(totalSeconds / value);
          if (amount > 0) array.push(`${amount}${unit}`);
          totalSeconds -= amount * value;
        }
      }

      if (onlyFans) return array.slice(0, onlyFans).join(' ') ?? '0s'
      return array.length ? array.join(' ') : '0s';
    }
  },
  Num: {
    /**
     * Turn a number into a prefixed number like 10000 into 10K
     * @param {Number} num 
     * @returns {String}
     */
    Small: (num) => {
      if (num < 10000) return Number(num)
      if (num > 10000 && num < 1000000) return Number((num / 1000).toFixed(1)) + "K"
      if (num > 1000000 && num < 1000000000) return Number((num / 1000000).toFixed(1)) + "M"
      if (num > 1000000000 && num < 1000000000000) return Number((num / 1000000000).toFixed(1)) + "B"
      return Number((num / 1000000000000).toFixed(1)) + "T"
    }
  }
}

module.exports = { tokens, data, client, updateVariable, getLang, axios, send, log_str, Utility }

client.once('ready', async (c) => {
  log_str('[MAIN] Initialized')
  data.user = c.user
  require('./workers/commands/handler.js')(client)
  require('./workers/process/war_logger.js')
  require('./workers/process/guild_logger')
  require('./workers/process/scheduler.js')
  console.log(await require('./workers/commands/register.js')?? "Successfuly registered commands")
  require('./workers/commands/commands/map.js')
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

function log_str(message) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(`${data.storage}/logs/${new Date(data.started).getTime()}.log`, `[${timestamp}] ${message}\n`);
}