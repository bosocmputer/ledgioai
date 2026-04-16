"use client"

import { useState, useRef, useCallback } from "react"
import { Check, GripVertical } from "lucide-react"

interface Agent {
  id: string
  name: string
  emoji: string
  role: string
}

interface Props {
  agents: Agent[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

export function DragDropAgentPicker({ agents, selectedIds, onChange }: Props) {
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<"selected" | "available" | null>(null)
  const dragCounter = useRef(0)

  const selected = agents.filter((a) => selectedIds.includes(a.id))
  const available = agents.filter((a) => !selectedIds.includes(a.id))

  function toggle(id: string) {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((i) => i !== id)
        : [...selectedIds, id]
    )
  }

  // Reorder within selected list
  const handleDragStartSelected = useCallback((e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id)
    e.dataTransfer.effectAllowed = "move"
    setDragId(id)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }, [])

  const handleDropOnSelected = useCallback(
    (e: React.DragEvent, targetId?: string) => {
      e.preventDefault()
      const sourceId = e.dataTransfer.getData("text/plain")
      if (!sourceId) return

      // If from available → add
      if (!selectedIds.includes(sourceId)) {
        if (targetId) {
          const idx = selectedIds.indexOf(targetId)
          const newIds = [...selectedIds]
          newIds.splice(idx, 0, sourceId)
          onChange(newIds)
        } else {
          onChange([...selectedIds, sourceId])
        }
      } else if (targetId && sourceId !== targetId) {
        // Reorder
        const newIds = selectedIds.filter((i) => i !== sourceId)
        const idx = newIds.indexOf(targetId)
        newIds.splice(idx, 0, sourceId)
        onChange(newIds)
      }

      setDragId(null)
      setDropTarget(null)
    },
    [selectedIds, onChange]
  )

  const handleDropOnAvailable = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const sourceId = e.dataTransfer.getData("text/plain")
      if (sourceId && selectedIds.includes(sourceId)) {
        onChange(selectedIds.filter((i) => i !== sourceId))
      }
      setDragId(null)
      setDropTarget(null)
    },
    [selectedIds, onChange]
  )

  function zoneEnter(zone: "selected" | "available") {
    return (e: React.DragEvent) => {
      e.preventDefault()
      dragCounter.current++
      setDropTarget(zone)
    }
  }

  function zoneLeave() {
    return (e: React.DragEvent) => {
      e.preventDefault()
      dragCounter.current--
      if (dragCounter.current <= 0) {
        dragCounter.current = 0
        setDropTarget(null)
      }
    }
  }

  const agentCard = (agent: Agent, isSelected: boolean, draggable: boolean) => (
    <div
      key={agent.id}
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", agent.id)
        e.dataTransfer.effectAllowed = "move"
        setDragId(agent.id)
        dragCounter.current = 0
      }}
      onDragEnd={() => { setDragId(null); setDropTarget(null); dragCounter.current = 0 }}
      onDragOver={handleDragOver}
      onDrop={(e) => {
        if (isSelected) handleDropOnSelected(e, agent.id)
      }}
      onClick={() => toggle(agent.id)}
      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-left transition-all select-none ${
        dragId === agent.id ? "opacity-40" : ""
      } ${
        isSelected
          ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950"
          : "border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
      }`}
    >
      {draggable && (
        <GripVertical className="h-4 w-4 flex-shrink-0 cursor-grab text-gray-400 active:cursor-grabbing" />
      )}
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-xl dark:bg-gray-800">
        {agent.emoji}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{agent.name}</p>
        <p className="truncate text-xs text-gray-500 dark:text-gray-400">{agent.role}</p>
      </div>
      {isSelected && <Check className="h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />}
    </div>
  )

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Selected (drop zone) */}
      <div
        onDragOver={handleDragOver}
        onDragEnter={zoneEnter("selected")}
        onDragLeave={zoneLeave()}
        onDrop={(e) => handleDropOnSelected(e)}
        className={`rounded-xl border-2 border-dashed p-4 transition-colors min-h-[120px] ${
          dropTarget === "selected"
            ? "border-blue-400 bg-blue-50 dark:bg-blue-950/40"
            : "border-gray-300 bg-gray-50/50 dark:border-gray-600 dark:bg-gray-800/50"
        }`}
      >
        <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
          ✅ สมาชิกในทีม ({selected.length})
        </h3>
        {selected.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400">
            ลาก Agent มาวางที่นี่ หรือคลิกเลือก
          </p>
        ) : (
          <div className="space-y-2">
            {selected.map((a) => agentCard(a, true, true))}
          </div>
        )}
      </div>

      {/* Available (drop zone to remove) */}
      <div
        onDragOver={handleDragOver}
        onDragEnter={zoneEnter("available")}
        onDragLeave={zoneLeave()}
        onDrop={handleDropOnAvailable}
        className={`rounded-xl border-2 border-dashed p-4 transition-colors min-h-[120px] ${
          dropTarget === "available"
            ? "border-orange-400 bg-orange-50 dark:bg-orange-950/40"
            : "border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-900"
        }`}
      >
        <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
          📋 Agent ที่ยังว่าง ({available.length})
        </h3>
        {available.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400">
            Agent ทั้งหมดอยู่ในทีมแล้ว
          </p>
        ) : (
          <div className="space-y-2">
            {available.map((a) => agentCard(a, false, true))}
          </div>
        )}
      </div>
    </div>
  )
}
