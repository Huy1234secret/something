// deployCommands.js
const { REST, Routes, ApplicationCommandOptionType, ChannelType, PermissionsBitField } = require('discord.js');
const dotenv = require('dotenv');
dotenv.config();

const commands = [
    // Shop and AdminShop
    {
        name: 'shop',
        description: 'Displays the server shop where you can buy items.',
        options: [
            {
                name: 'channel',
                description: 'The channel where the shop embed will be displayed or updated.',
                type: ApplicationCommandOptionType.Channel,
                channel_types: [ChannelType.GuildText],
                required: false,
            }
        ]
    },
    {
        name: 'adminshop',
        description: 'Manage the server shop (Admin/Staff Only).',
        default_member_permissions: PermissionsBitField.Flags.ManageGuild.toString(),
        options: [
            {
                name: 'restock',
                description: 'Manually restocks all items in the shop immediately.',
                type: ApplicationCommandOptionType.Subcommand,
            },
            {
                name: 'setchannel',
                description: 'Sets the default channel for shop display and auto-updates.',
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: 'channel',
                        description: 'The text channel to set for the shop.',
                        type: ApplicationCommandOptionType.Channel,
                        channel_types: [ChannelType.GuildText],
                        required: true,
                    }
                ]
            }
        ]
    },
    // User stat and admin commands
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
        name: 'see-user',
        description: "View another user's inventory, bank, or level.",
        options: [
            {
                name: 'user',
                description: 'The user to inspect.',
                type: ApplicationCommandOptionType.User,
                required: true
            },
            {
                name: 'info',
                description: 'What information to view.',
                type: ApplicationCommandOptionType.String,
                required: true,
                choices: [
                    { name: 'Inventory', value: 'inventory' },
                    { name: 'Bank', value: 'bank' },
                    { name: 'Level', value: 'level' }
                ]
            }
        ]
    },
    {
        name: 'backup-database',
        description: 'Creates and sends a backup of the level system database (Staff Only).',
        default_member_permissions: PermissionsBitField.Flags.ManageGuild.toString(),
    },
    {
        name: 'add-xp',
        description: 'Add or remove XP from a user (Staff Only)',
        options: [
            { name: 'user', description: 'The user to modify XP for', type: ApplicationCommandOptionType.User, required: true },
            { name: 'amount', description: 'Amount of XP to add (negative to remove)', type: ApplicationCommandOptionType.Integer, required: true }
        ],
        default_member_permissions: PermissionsBitField.Flags.ManageGuild.toString()
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
            { name: 'level', description: 'The level to set (0-40)', type: ApplicationCommandOptionType.Integer, required: true, minValue: 0, maxValue: 40 }
        ],
        default_member_permissions: PermissionsBitField.Flags.ManageGuild.toString()
    },
    {
        name: 'ping',
        description: 'Replies with Pong! and the bot\'s latency.',
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
                channel_types: [ChannelType.GuildText],
                required: true,
            },
            {
                name: 'mention_role',
                description: 'A role to mention with the embed (optional).',
                type: ApplicationCommandOptionType.Role,
                required: false,
            }
        ],
        default_member_permissions: PermissionsBitField.Flags.ManageMessages.toString()
    },
    {
        name: 'leaderboard',
        description: 'Manages and views the server leaderboard.',
        options: [
            {
                name: 'view',
                description: 'View the current server leaderboard.',
                type: ApplicationCommandOptionType.Subcommand,
            },
            {
                name: 'config',
                description: 'Configure leaderboard settings (Admin Only).',
                type: ApplicationCommandOptionType.SubcommandGroup,
                options: [
                    {
                        name: 'channel',
                        description: 'Sets the channel for leaderboard updates.',
                        type: ApplicationCommandOptionType.Subcommand,
                        options: [
                            {
                                name: 'set',
                                description: 'The text channel to set for the leaderboard.',
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
            }
        ]
    },
    {
        name: 'inventory',
        description: 'Access your inventory, balance, and charms.',
    },
     {
        name: 'use-item',
        description: 'Use an item from your inventory.',
        options: [
            {
                name: 'item',
                description: 'The item to use from your inventory (ID or name).',
                type: ApplicationCommandOptionType.String,
                required: true,
                autocomplete: true
            },
            {
                name: 'amount',
                description: 'How many to use (default: 1).',
                type: ApplicationCommandOptionType.Integer,
                required: false,
                minValue: 1,
            }
        ]
    },
    {
        name: 'database',
        description: 'View data from a specific database table (Admin Only).',
        options: [
            {
                name: 'table',
                description: 'The name of the database table to view.',
                type: ApplicationCommandOptionType.String,
                required: true,
                choices: [
                    { name: 'Users', value: 'users' },
                    { name: 'User Inventory', value: 'userInventory' },
                    { name: 'User Active Charms', value: 'userActiveCharms' },
                    { name: 'Guild Settings', value: 'guildSettings' },
                    { name: 'User DM Settings', value: 'userDmSettings' },
                    { name: 'User Loot Alert Settings', value: 'userLootAlertSettings' },
                    { name: 'User Global Loot Alert Settings', value: 'userGlobalLootAlertSettings' },
                    { name: 'Embed Sessions', value: 'embed_sessions' },
                    { name: 'Guild Shop Items', value: 'guildShopItems' },
                    { name: 'Guild Shop Settings', value: 'guildShopSettings' },
                    { name: 'Robux Withdrawals', value: 'robux_withdrawals' }, // New Table
                ]
            }
        ],
        default_member_permissions: PermissionsBitField.Flags.Administrator.toString()
    },
    {
        name: 'add-coin',
        description: 'Add coins to a user (Staff Only).',
        options: [
            {
                name: 'user',
                description: 'The user to add coins to.',
                type: ApplicationCommandOptionType.User,
                required: true
            },
            {
                name: 'amount',
                description: 'Amount of coins to add (negative to remove).',
                type: ApplicationCommandOptionType.Integer,
                required: true
            }
        ],
        default_member_permissions: PermissionsBitField.Flags.ManageGuild.toString()
    },
    {
        name: 'add-gem',
        description: 'Add gems to a user (Staff Only).',
        options: [
            {
                name: 'user',
                description: 'The user to add gems to.',
                type: ApplicationCommandOptionType.User,
                required: true
            },
            {
                name: 'amount',
                description: 'Amount of gems to add (negative to remove).',
                type: ApplicationCommandOptionType.Integer,
                required: true
            }
        ],
        default_member_permissions: PermissionsBitField.Flags.ManageGuild.toString()
    },
    {
        name: 'give-item',
        description: 'Give an item to a user (Staff Only).',
        options: [
            { name: 'user', description: 'The user to give the item to.', type: ApplicationCommandOptionType.User, required: true },
            {
                name: 'item_id',
                description: 'The ID or name of the item to give.',
                type: ApplicationCommandOptionType.String,
                required: true,
                autocomplete: true
            },
            { name: 'amount', description: 'Amount of the item to give.', type: ApplicationCommandOptionType.Integer, required: true, minValue: 1 }
        ],
        default_member_permissions: PermissionsBitField.Flags.ManageGuild.toString()
    },
    {
        name: 'add-user',
        description: "Manage a user's items, roles, and currencies (Staff Only).",
        options: [
            {
                name: 'user',
                description: 'The user to manage.',
                type: ApplicationCommandOptionType.User,
                required: true,
            }
        ],
        default_member_permissions: PermissionsBitField.Flags.ManageGuild.toString(),
    },
    {
        name: 'withdraw-robux', // NEW COMMAND
        description: 'Request to withdraw Robux from your bot balance.',
        // No options needed as it will use a modal
    },
    {
        name: 'bank',
        description: 'Access your bank to deposit, withdraw, or upgrade.',
    },
    {
        name: 'admin-reset-data',
        description: 'Selectively resets user data for this guild (IRREVERSIBLE).',
        default_member_permissions: PermissionsBitField.Flags.Administrator.toString(),
        options: [
            {
                name: 'target_guild_id',
                description: 'Confirm current Guild ID for safety.',
                type: ApplicationCommandOptionType.String,
                required: true,
            },
            {
                name: 'confirmation',
                description: 'Type "CONFIRM DATA RESET" to proceed.',
                type: ApplicationCommandOptionType.String,
                required: true,
            },
            {
                name: 'user',
                description: 'Specific user to reset instead of all users',
                type: ApplicationCommandOptionType.User,
                required: false,
            },
            {
                name: 'reset_all_users',
                description: 'MUST BE TRUE to confirm this affects all users in the specified data types.',
                type: ApplicationCommandOptionType.Boolean,
                required: true,
            },
            {
                name: 'reset_levels_xp',
                description: 'Reset levels and XP for all users? (Default: false)',
                type: ApplicationCommandOptionType.Boolean,
                required: false,
            },
            {
                name: 'reset_balances',
                description: 'Reset coin/gem balances (inventory & bank) for all users? (Default: false)',
                type: ApplicationCommandOptionType.Boolean,
                required: false,
            },
            {
                name: 'reset_inventory',
                description: 'Reset item inventories for all users? (Default: false)',
                type: ApplicationCommandOptionType.Boolean,
                required: false,
            },
            {
                name: 'reset_active_charms',
                description: 'Reset active charms for all users? (Default: false)',
                type: ApplicationCommandOptionType.Boolean,
                required: false,
            }
        ]
    },
    {
        name: 'usersettings',
        description: 'Manage your personal bot settings.',
        options: [
            {
                name: 'view',
                description: 'View your current bot settings.',
                type: ApplicationCommandOptionType.Subcommand,
            }
        ]
    },
    {
        name: 'set-setting',
        description: 'Configure your personal alert settings.',
    },
    {
        name: 'delete-all-commands',
        description: 'Xóa TẤT CẢ các lệnh slash command của bot khỏi Discord API (Chỉ Admin).',
        default_member_permissions: PermissionsBitField.Flags.Administrator.toString(),
        options: [
            {
                name: 'confirmation',
                description: 'Nhập CHÍNH XÁC "CONFIRM DELETE ALL" để xác nhận.',
                type: ApplicationCommandOptionType.String,
                required: true,
            },
            {
                name: 'scope',
                description: 'Phạm vi xóa: Toàn cầu (Global) hay của Guild hiện tại (Guild).',
                type: ApplicationCommandOptionType.String,
                required: true,
                choices: [
                    { name: 'Global Commands (across all servers)', value: 'global' },
                    { name: 'Guild Commands (only on this server)', value: 'guild' },
                ]
            }
        ]
    },
    {
        name: 'deploy-commands',
        description: 'Force update all slash commands for this bot.',
        default_member_permissions: PermissionsBitField.Flags.Administrator.toString(),
        options: [
            {
                name: 'scope',
                description: 'Where to deploy the commands.',
                type: ApplicationCommandOptionType.String,
                required: false,
                choices: [
                    { name: 'Global Commands (all servers)', value: 'global' },
                    { name: 'Guild Commands (this server)', value: 'guild' }
                ]
            }
        ]
    },
    {
        name: 'export-guild-data',
        description: 'Exports all user stats, inventory, and related data for this guild (Admin Only).',
        default_member_permissions: PermissionsBitField.Flags.Administrator.toString(),
    },
    {
        name: 'item-info',
        description: 'View detailed information about an item by searching or Browse.',
        options: [
            {
                name: 'item_name',
                description: 'The name or ID of the item to search for (optional).',
                type: ApplicationCommandOptionType.String,
                required: false,
                autocomplete: true
            }
        ]
    },
    {
        name: 'start-giveaway',
        description: 'Starts a new giveaway setup process.',
        options: [
            {
                name: 'channel',
                description: 'The channel where the giveaway will be hosted.',
                type: ApplicationCommandOptionType.Channel,
                channel_types: [ChannelType.GuildText],
                required: true,
            }
        ]
    },
    {
        name: 'daily',
        description: 'Commands for daily rewards and streaks.',
        options: [
            {
                name: 'check',
                description: 'Check your daily rewards and claim them.',
                type: ApplicationCommandOptionType.Subcommand,
            },
            {
                name: 'restore-streak',
                description: 'Use gems to restore your lost daily streak.',
                type: ApplicationCommandOptionType.Subcommand,
            }
        ]
    },
    {
        name: 'toggle-notifications',
        description: 'Enable or disable all non-daily notifications globally.',
        options: [
            {
                name: 'enabled',
                description: 'Set to true to enable non-daily notifications.',
                type: ApplicationCommandOptionType.Boolean,
                required: true,
            }
        ],
        default_member_permissions: PermissionsBitField.Flags.Administrator.toString()
    }
];

async function deployCommands(token = process.env.DISCORD_TOKEN, clientId = process.env.CLIENT_ID, guildId = process.env.GUILD_ID) {
    if (!token || !clientId) {
        throw new Error('Missing DISCORD_TOKEN or CLIENT_ID in environment.');
    }
    const rest = new REST({ version: '10' }).setToken(token);
    console.log(`Started refreshing ${commands.length} application (/) commands.`);
    let data;
    if (guildId) {
        data = await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands },
        );
        console.log(`Successfully reloaded ${data.length} application (/) commands for GUILD: ${guildId}.`);
    } else {
        data = await rest.put(
            Routes.applicationCommands(clientId),
            { body: commands },
        );
        console.log(`Successfully reloaded ${data.length} application (/) commands GLOBALLY.`);
        console.log("Note: Global commands can take up to an hour to update across all servers.");
    }
    return data;
}

module.exports = deployCommands;

if (require.main === module) {
    deployCommands().catch(error => {
        console.error('Failed to deploy application commands:', error);
        process.exit(1);
    });
}
