export {};

const applicationId = process.env.DISCORD_APPLICATION_ID;
const botToken = process.env.DISCORD_BOT_TOKEN;
const guildId = process.env.DISCORD_GUILD_ID;

if (!applicationId || !botToken) {
  throw new Error(
    "DISCORD_APPLICATION_ID und DISCORD_BOT_TOKEN müssen gesetzt sein.",
  );
}

const commands = [
  {
    name: "clash-help",
    description: "Zeigt die verfügbaren Clash-Tool-Befehle.",
    description_localizations: {
      "en-US": "Shows the available Clash Tool commands.",
    },
  },
  {
    name: "clash-plan",
    description: "Teilt eine kompakte Clash-Tool-Planung.",
    description_localizations: {
      "en-US": "Shares a compact Clash Tool plan.",
    },
    options: [
      {
        type: 3,
        name: "summary",
        description: "Zusammenfassung aus dem Clash Tool",
        description_localizations: {
          "en-US": "Summary from the Clash Tool",
        },
        required: true,
        max_length: 1700,
      },
    ],
  },
];

const endpoint = guildId
  ? `https://discord.com/api/v10/applications/${applicationId}/guilds/${guildId}/commands`
  : `https://discord.com/api/v10/applications/${applicationId}/commands`;
const response = await fetch(endpoint, {
  method: "PUT",
  headers: {
    authorization: `Bot ${botToken}`,
    "content-type": "application/json",
  },
  body: JSON.stringify(commands),
});

if (!response.ok) {
  throw new Error(
    `Discord command registration failed (${response.status}): ${await response.text()}`,
  );
}

console.log(
  `${commands.length} Discord-Befehle ${guildId ? "für den Testserver" : "global"} registriert.`,
);
