import { createMemo } from "solid-js"
import { useLocal } from "@tui/context/local"
import { DialogSelect } from "@tui/ui/dialog-select"
import { useDialog } from "@tui/ui/dialog"
import { useSDK } from "@tui/context/sdk"
import { useRoute } from "@tui/context/route"
import { useSync } from "@tui/context/sync"

export function DialogAgent() {
  const local = useLocal()
  const dialog = useDialog()
  const sdk = useSDK()
  const route = useRoute()
  const sync = useSync()

  const options = createMemo(() =>
    local.agent.list().map((item) => {
      return {
        value: item.name,
        title: item.name,
        description: item.native ? "native" : item.description,
      }
    }),
  )

  return (
    <DialogSelect
      title="Select agent"
      current={local.agent.current()?.name}
      options={options()}
      onSelect={(option) => {
        local.agent.set(option.value)
        dialog.clear()
        const existing = sync.data.session.find((s) => s.agent === option.value)
        if (existing) {
          route.navigate({ type: "session", sessionID: existing.id })
        } else {
          void sdk.client.session.create({ agent: option.value }).then((result) => {
            if (result.data?.id) {
              route.navigate({ type: "session", sessionID: result.data.id })
            }
          })
        }
      }}
    />
  )
}
