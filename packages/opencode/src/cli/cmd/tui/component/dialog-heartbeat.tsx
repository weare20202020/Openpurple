import { useLocal } from "@tui/context/local"
import { useSDK } from "@tui/context/sdk"
import { useDialog } from "@tui/ui/dialog"
import { useToast } from "@tui/ui/toast"
import { useTheme } from "@tui/context/theme"
import { DialogSelect } from "@tui/ui/dialog-select"
import * as Heartbeat from "@tui/util/heartbeat"

function statusLine(sessionID: string) {
  const active = Heartbeat.get(sessionID)
  return active
    ? `Active: ${active.mode === "task" ? "Task Time" : "Pure Time"}, every ${active.intervalMinutes} min`
    : "Inactive"
}

export function DialogHeartbeat(props: { sessionID: string }) {
  const dialog = useDialog()
  const toast = useToast()
  const { theme } = useTheme()

  const active = Heartbeat.get(props.sessionID)
  const status = statusLine(props.sessionID)

  const options = [
    {
      value: "task" as const,
      title: "Task Time",
      description: "Check the task list on each tick; stops itself when every task is complete.",
    },
    {
      value: "pure" as const,
      title: "Pure Time",
      description: "Fire on every interval, ignoring the task list.",
    },
    ...(active
      ? [
          {
            value: "stop" as const,
            title: "Stop heartbeat",
            description: status,
          },
        ]
      : []),
  ]

  return (
    <DialogSelect
      title="Heartbeat"
      options={options}
      onSelect={(option) => {
        const mode = option.value
        if (mode === "stop") {
          Heartbeat.stop(props.sessionID)
          toast.show({ message: "Heartbeat stopped", variant: "info" })
          dialog.clear()
          return
        }
        dialog.replace(() => <DialogHeartbeatInterval sessionID={props.sessionID} mode={mode} />)
      }}
      footer={<text fg={theme.textMuted}>{status}</text>}
    />
  )
}

export function DialogHeartbeatInterval(props: { sessionID: string; mode: Heartbeat.HeartbeatMode }) {
  const local = useLocal()
  const sdk = useSDK()
  const dialog = useDialog()
  const toast = useToast()
  const { theme } = useTheme()

  const options = Heartbeat.HEARTBEAT_INTERVALS.map((minutes) => ({
    value: minutes,
    title: minutes === 1 ? "Every 1 minute" : `Every ${minutes} minutes`,
  }))

  return (
    <DialogSelect
      title="Heartbeat interval"
      options={options}
      onSelect={(option) => {
        const agent = local.agent.current()
        const model = local.model.current()
        if (!agent || !model) {
          toast.show({ variant: "error", message: "Heartbeat needs a selected agent and model" })
          dialog.clear()
          return
        }
        Heartbeat.start({
          client: sdk.client,
          sessionID: props.sessionID,
          agent: agent.name,
          model: { providerID: model.providerID, modelID: model.modelID },
          mode: props.mode,
          intervalMinutes: option.value,
          notify: (message) => toast.show({ message, variant: "info" }),
        })
        toast.show({
          message: `Heartbeat started: ${props.mode === "task" ? "Task Time" : "Pure Time"}, every ${option.value} min`,
          variant: "info",
        })
        dialog.clear()
      }}
      footer={<text fg={theme.textMuted}>{statusLine(props.sessionID)}</text>}
    />
  )
}
