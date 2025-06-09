const { REST, Routes, ApplicationCommandOptionType } = require('discord.js');
const { data, tokens: {disc_token: token} } = require('../index.js')

const commands = [
  {
    name: 'territory_add',
    description: 'Add territory tracker',
    options: [
      {
        name: 'guild',
        description: 'Name of guild, use <GLOBAL> for all territory changes',
        type: ApplicationCommandOptionType.String,
        required: true
      }
    ]
  },
  {
    name: 'territory_remove',
    description: 'Remove an existing territory tracker',
  },
  {
    name: 'latency',
    description: 'Displays bot latency and uptime',
  },
  {
    name: 'mcping',
    description: 'Pings a Minecraft Server',
    options: [
      {
        name: 'server',
        description: 'Type of Minecraft server to ping',
        type: ApplicationCommandOptionType.String,
        required: true,
        choices: [
          { name: 'Java', value: 'java' },
          { name: 'Bedrock', value: 'bedrock' },
        ],
      },
      {
        name: 'ip',
        description: 'IP Address of the server to ping',
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: 'port',
        description: 'Port of the Minecraft Server *25565|19132',
        type: ApplicationCommandOptionType.Integer,
        required: false,
      },
    ],
  },
  {
    name: 'player',
    description: "Get player's details",
    options: [
      {
        name: 'name',
        description: 'Name of the person',
        type: ApplicationCommandOptionType.String,
        required: true,
      }
    ],
  },
  {
    name: 'guild',
    description: "Get guild details",
    options: [
      {
        name: 'name',
        description: 'Prefix or name of the guild',
        type: ApplicationCommandOptionType.String,
        required: true,
      }
    ],
  },
];

module.exports = (async () => {
    try {
      const rest = new REST().setToken(token);
      console.log('Started refreshing application (/) commands.');
  
      await rest.put(
        Routes.applicationCommands(data.user.id),
        { body: commands },
      );
  
    } catch (error) {
      return(error);
    }
})();