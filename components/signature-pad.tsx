"use client"

import type React from "react"

import { useRef, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Trash2, Check, RotateCcw } from "lucide-react"

interface SignaturePadProps {
  value?: string
  onChange: (signature: string) => void
  width?: number
  height?: number
}

export default function SignaturePad({ value, onChange, width = 400, height = 200 }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Configuration du canvas
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.strokeStyle = "#000000"
    ctx.lineWidth = 2

    // Charger la signature existante si elle existe
    if (value) {
      const img = new Image()
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0)
        setHasSignature(true)
      }
      img.src = value
    }
  }, [value])

  const getEventPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    if ("touches" in e) {
      // Touch event
      const touch = e.touches[0] || e.changedTouches[0]
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      }
    } else {
      // Mouse event
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      }
    }
  }

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const pos = getEventPos(e)
    setIsDrawing(true)
    setLastPoint(pos)
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    if (!isDrawing || !lastPoint) return

    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    const currentPos = getEventPos(e)

    // Dessiner une ligne lisse entre le dernier point et le point actuel
    ctx.beginPath()
    ctx.moveTo(lastPoint.x, lastPoint.y)
    ctx.lineTo(currentPos.x, currentPos.y)
    ctx.stroke()

    setLastPoint(currentPos)
    setHasSignature(true)
  }

  const stopDrawing = () => {
    setIsDrawing(false)
    setLastPoint(null)
    saveSignature()
  }

  const saveSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dataURL = canvas.toDataURL("image/png")
    onChange(dataURL)
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
    onChange("")
  }

  const undoLastStroke = () => {
    // Pour une vraie fonction d'annulation, il faudrait stocker l'historique des traits
    // Pour l'instant, on efface tout
    clearSignature()
  }

  return (
    <div className="space-y-4">
      <Card className="bg-white border-2 border-slate-300">
        <CardContent className="p-4">
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className="w-full h-48 cursor-crosshair touch-none"
            style={{ touchAction: "none" }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={clearSignature}
          className="flex-1 py-3 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
          disabled={!hasSignature}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Effacer
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={undoLastStroke}
          className="flex-1 py-3 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
          disabled={!hasSignature}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Annuler
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={saveSignature}
          className="flex-1 py-3 border-green-600 text-green-400 hover:bg-green-900/20"
          disabled={!hasSignature}
        >
          <Check className="mr-2 h-4 w-4" />
          Valider
        </Button>
      </div>

      <p className="text-sm text-slate-400 text-center">
        Signez avec votre doigt ou votre stylet dans la zone blanche ci-dessus
      </p>
    </div>
  )
}
