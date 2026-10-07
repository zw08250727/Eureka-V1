import type { AgentGateway } from "@/features/workbench/model/types";
import type { SpacesController } from "./use-spaces";
import { M } from "./model/store";
export function teamGateway(
  controller: SpacesController,
  space: string,
  actor: string,
  file?: string,
  history?: string,
): AgentGateway {
  return {
    async send(prompt, context, options, signal) {
      signal.throwIfAborted();
      const reply = controller.change((s) =>
        M.ask(M.get(s, space), prompt, file || null, actor, history || null, {
          fileIds: options.fileIds,
          web: options.web,
          appData: options.apps,
        }),
      );
      return { title: "Ask Agent · 本地模拟", text: reply.answer, items: [] };
    },
  };
}
