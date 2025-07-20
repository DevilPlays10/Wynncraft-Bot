const cmd_mcping = require('./commands/mcping.js')
const cmd_latency = require('./commands/latency.js')
const cmd_player = require('./commands/player.js')
const cmd_guild = require('./commands/guild.js')
const cmd_war_tracker = require('./commands/territory_tracker.js')
const cmd_bubble = require('./commands/bubble.js')

const autoComplete = require('./autocomplete.js')

const {log_str} = require('../../index.js')

const cmd = {
    3: {
      "guild_cmd_button1": cmd_guild.buttons,
      "guild_cmd_button2": cmd_guild.buttons,
      "player_cmd_button1": cmd_player.buttons,
      "player_cmd_button2": cmd_player.buttons,
      "war_tracker_remove_MENU": cmd_war_tracker.menu
    },
}

const autoCompleteENUM = {
  'guild-name': autoComplete.Guilds,
  'territory_add-guild': autoComplete.Guilds,
  'territory_add-territory': autoComplete.Territories
}

const cmd_autoEMBED = {
  "mcping": cmd_mcping,
  "latency": cmd_latency,
  "player": cmd_player.player,
  "guild": cmd_guild.guild,
  "territory_add": cmd_war_tracker.Add,
  "territory_remove": cmd_war_tracker.Remove,
  "bubble": cmd_bubble
}


module.exports = ((client) => {
  client.on('interactionCreate', async (int) =>{
    try {
      //auto handle chat commands
      if (cmd_autoEMBED[int.commandName] && int.isChatInputCommand()) {
        log_str(`[Handler-AUTO] ${int.user.tag} used '${int.commandName?? int.customId?? int.id} (${int.type})' With args: ${int.options?.data.map(ent=>`${ent.name}(${ent.type}): ${ent.value}`).join(", ")}`)
        await int.editReply(await cmd_autoEMBED[int.commandName](int))
      }
       //auto complete handle
      else if (int.isAutocomplete() && autoCompleteENUM[`${int.commandName}-${int.options.getFocused(true).name}`]) {
        autoCompleteENUM[`${int.commandName}-${int.options.getFocused(true).name}`](int)
      }
       //manual handler all
      else if (cmd[int.type] && cmd[int.type][int.commandName?? int.customId]) cmd[int.type][int.commandName?? int.customId](int)
    } catch (e) {
      log_str(`(Handler) [ERROR] ${e.stack.split("\n")[0]}`)
      console.log(e)
    } 
  })
})