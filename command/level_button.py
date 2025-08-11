import discord


def setup(tree, user_stats, *_, **__):
    """Register a demo level command with a button."""

    class LevelView(discord.ui.View):
        def __init__(self, user_id: int) -> None:
            super().__init__()
            self.user_id = user_id

        @discord.ui.button(label="Get Level", style=discord.ButtonStyle.primary)
        async def get_level(
            self,
            interaction: discord.Interaction,
            button: discord.ui.Button,  # pragma: no cover - no logic depends on button
        ) -> None:
            stats = user_stats.get(self.user_id, {"level": 1})
            await interaction.response.send_message(
                f"You are level {stats['level']}", ephemeral=True
            )

    @tree.command(name="level-button", description="Show your level with a button")
    async def level_button(interaction: discord.Interaction) -> None:
        stats = user_stats.get(interaction.user.id, {"level": 1})
        embed = discord.Embed(
            title="Your Level", description=f"You are level **{stats['level']}**!"
        )
        view = LevelView(interaction.user.id)
        await interaction.response.send_message(embed=embed, view=view)
