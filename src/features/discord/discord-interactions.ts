export type DiscordOption = {
  name: string;
  value?: string | number | boolean;
  options?: DiscordOption[];
};
export type DiscordInteraction = {
  type: number;
  data?: { name?: string; options?: DiscordOption[] };
};

type DiscordResponse = {
  type: number;
  data?: { content: string; flags?: number };
};

function optionValue(
  options: DiscordOption[] | undefined,
  name: string,
): string {
  const option = options?.find((item) => item.name === name);
  return option?.value === undefined ? "" : String(option.value).trim();
}

export function buildDiscordInteractionResponse(
  interaction: DiscordInteraction,
): DiscordResponse {
  if (interaction.type === 1) return { type: 1 };

  const command = interaction.data?.name;
  if (command === "clash-help") {
    return {
      type: 4,
      data: {
        flags: 64,
        content:
          "**Clash Tool**\nNutze `/clash-plan summary:<deine Planung>`, um eine kompakte Planung im Discord-Channel auszugeben. Vollständige Pläne kannst du zusätzlich direkt aus der App per Webhook teilen.",
      },
    };
  }
  if (command === "clash-plan") {
    const summary = optionValue(interaction.data?.options, "summary").slice(
      0,
      1700,
    );
    return {
      type: 4,
      data: {
        content: summary
          ? `**Clash-Tool-Planung**\n${summary}`
          : "Bitte gib die Option `summary` an oder teile deinen Plan direkt aus der Clash-Tool-App.",
        flags: summary ? undefined : 64,
      },
    };
  }

  return {
    type: 4,
    data: {
      flags: 64,
      content: "Unbekannter Clash-Tool-Befehl. Nutze `/clash-help`.",
    },
  };
}
