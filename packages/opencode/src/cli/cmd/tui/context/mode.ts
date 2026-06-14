import { createSimpleContext } from "./helper"
import { useKV } from "./kv"

type Mode = "build" | "plan"

const KV_KEY = "agent_modes"

export const { use: useMode, provider: ModeProvider } = createSimpleContext({
  name: "Mode",
  init: () => {
    const kv = useKV()
    return {
      mode: (agent: string): Mode => {
        const all = kv.get(KV_KEY, {}) as Record<string, Mode>
        return all[agent] === "plan" ? "plan" : "build"
      },
      set: (agent: string, m: Mode) => {
        const all = (kv.get(KV_KEY, {}) ?? {}) as Record<string, Mode>
        kv.set(KV_KEY, { ...all, [agent]: m })
      },
      toggle: (agent: string) => {
        const all = (kv.get(KV_KEY, {}) ?? {}) as Record<string, Mode>
        const next: Mode = all[agent] === "plan" ? "build" : "plan"
        kv.set(KV_KEY, { ...all, [agent]: next })
      },
    }
  },
})
