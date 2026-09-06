interface ReloadContext {
  reload(): Promise<void>;
}

interface ExtensionHost {
  registerCommand(name: string, command: {
    description: string;
    handler(args: string, context: ReloadContext): Promise<void>;
  }): void;
}

export default function pr1ReloadFixture(pi: ExtensionHost): void {
  pi.registerCommand("pr1-reload", {
    description: "Reload the isolated PR1 source-install fixture",
    handler: async (_args, context) => {
      await context.reload();
    },
  });
}
