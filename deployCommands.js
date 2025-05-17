// deployCommands.js
const { REST, Routes, ApplicationCommandOptionType, ChannelType, PermissionsBitField } = require('discord.js');
const dotenv = require('dotenv');
dotenv.config();

const commands = [
    // Existing commands...
    {
        name: 'level',
        description: 'Check your current level and XP',
        options: [
            {
                name: 'user',
                description: 'The user to check (optional)',
                type: ApplicationCommandOptionType.User,
                required: false
            }
        ]
    },
    {
        name: 'backup-database',
        description: 'Creates and sends a backup of the level system database (Staff Only).'
    },
    {
        name: 'add-xp',
        description: 'Add or remove XP from a user (Staff Only)',
        options: [
            { name: 'user', description: 'The user to modify XP for', type: ApplicationCommandOptionType.User, required: true },
            { name: 'amount', description: 'Amount of XP to add (negative to remove)', type: ApplicationCommandOptionType.Integer, required: true }
        ],
        default_member_permissions: PermissionsBitField.Flags.ManageGuild.toString() // Example permission
    },
    {
        name: 'add-level',
        description: 'Add or remove levels from a user (Staff Only)',
        options: [
            { name: 'user', description: 'The user to modify levels for', type: ApplicationCommandOptionType.User, required: true },
            { name: 'amount', description: 'Amount of levels to add (negative to remove)', type: ApplicationCommandOptionType.Integer, required: true }
        ],
        default_member_permissions: PermissionsBitField.Flags.ManageGuild.toString()
    },
    {
        name: 'set-level',
        description: "Set a user's level (resets XP to 0) (Staff Only)",
        options: [
            { name: 'user', description: 'The user to set level for', type: ApplicationCommandOptionType.User, required: true },
            { name: 'level', description: 'The level to set (0-100)', type: ApplicationCommandOptionType.Integer, required: true, minValue: 0, maxValue: 100 }
        ],
        default_member_permissions: PermissionsBitField.Flags.ManageGuild.toString()
    },
    {
        name: 'botinfo',
        description: 'Displays information about Maxwell Bot'
    },
    {
        name: 'createembed',
        description: 'Start building an embed message to send (Staff Only).',
        options: [
            {
                name: 'channel',
                description: 'The channel to send the final embed to.',
                type: ApplicationCommandOptionType.Channel,
                channel_types: [ChannelType.GuildText], // Ensure it's a text channel
                required: true,
            },
            {
                name: 'mention_role',
                description: 'A role to mention with the embed (optional).',
                type: ApplicationCommandOptionType.Role,
                required: false,
            }
        ],
        default_member_permissions: PermissionsBitField.Flags.ManageMessages.toString() // Example permission
    },

    // NEW LEADERBOARD COMMANDS
    {
        name: 'leaderboard',
        description: 'Manages and views the server leaderboard.',
        options: [
            {
                name: 'config',
                description: 'Configure leaderboard settings (Admin Only).',
                type: ApplicationCommandOptionType.SubcommandGroup,
                options: [
                    {
                        name: 'channel',
                        description: 'Set the channel for daily leaderboard updates (Admin Only).',
                        type: ApplicationCommandOptionType.Subcommand,
                        options: [
                            {
                                name: 'set',
                                description: 'The text channel to post the leaderboard in.',
                                type: ApplicationCommandOptionType.Channel,
                                channel_types: [ChannelType.GuildText],
                                required: true,
                            }
                        ]
                    }
                ]
            },
            {
                name: 'postnow',
                description: 'Manually posts or updates the leaderboard now (Admin Only).',
                type: ApplicationCommandOptionType.Subcommand,
            },
            {
                name: 'view',
                description: 'View the current leaderboard.',
                type: ApplicationCommandOptionType.Subcommand,
            }
        ],
        default_member_permissions: PermissionsBitField.Flags.ViewChannel.toString(), // Base permission for /leaderboard view
        // Specific subcommands like config and postnow will have stricter checks in code
    }
];

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID; // For guild-specific deployment during testing, can be removed for global

if (!token || !clientId) {
    console.error('CRITICAL ERROR: Missing DISCORD_TOKEN or CLIENT_ID in .env file. Cannot deploy commands.');
    process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);
        let data;
        if (guildId) { // For testing in a specific guild
            data = await rest.put(
                Routes.applicationGuildCommands(clientId, guildId),
                { body: commands },
            );
            console.log(`Successfully reloaded ${data.length} application (/) commands for GUILD: ${guildId}.`);
        } else { // For global deployment
            data = await rest.put(
                Routes.applicationCommands(clientId),
                { body: commands },
            );
            console.log(`Successfully reloaded ${data.length} application (/) commands GLOBALLY.`);
            console.log("Note: Global commands can take up to an hour to update across all servers.");
        }
    } catch (error) {
        console.error('Failed to deploy application commands:', error);
    }
})();
