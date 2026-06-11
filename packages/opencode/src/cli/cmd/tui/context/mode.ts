import { createSignal } from "solid-js"
import { createSimpleContext } from "./helper"

type Mode = "build" | "plan"

export const { use: useMode, provider: ModeProvider } = createSimpleContext({
  name: "Mode",
  init: () => {
    const [mode, setMode] = createSignal<Mode>("build")
    return {
      mode,
      toggle: () => setMode(m => (m === "build" ? "plan" : "build")),
    }
  },
})
