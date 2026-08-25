import { useCallback, useMemo, useState } from 'react'
import {
  SITE_CHAT_ATTACHMENTS_MAX,
  SITE_CHAT_GUEST_UPLOAD_MAX_BYTES,
  formatUploadMaxLabel,
} from '@shared/siteChatLimits.js'

const DEFAULT_MAX_FILE_BYTES = SITE_CHAT_GUEST_UPLOAD_MAX_BYTES
const DEFAULT_MAX_ATTACHMENTS = SITE_CHAT_ATTACHMENTS_MAX

function guessAttachmentKind(file) {
  if (file.type.startsWith('image/')) return 'IMAGE'
  const name = file.name.toLowerCase()
  if (/\.(jpe?g|png|gif|webp|heic|heif|avif|bmp|svg)$/.test(name)) return 'IMAGE'
  return 'FILE'
}

export function useChatAttachments(opts) {
  const {
    enabled = true,
    uploadFile,
    revokeFile,
    onError,
    maxFileBytes = DEFAULT_MAX_FILE_BYTES,
    maxAttachments = DEFAULT_MAX_ATTACHMENTS,
    fileTooLargeMessage = formatUploadMaxLabel(DEFAULT_MAX_FILE_BYTES),
    maxAttachmentsMessage = `Не более ${DEFAULT_MAX_ATTACHMENTS} вложений`,
    uploadErrorFallback = 'Не удалось загрузить файл',
  } = opts

  const [pendingRefs, setPendingRefs] = useState([])

  const uploadBusy = useMemo(() => pendingRefs.some((r) => r.uploading), [pendingRefs])

  const pendingOutgoingAttachments = useMemo(
    () =>
      pendingRefs.map((r) => ({
        clientKey: r.clientToken,
        filename: r.filename,
        kind: r.kind,
        imageSrc: r.kind === 'IMAGE' ? r.fileUrl || r.localPreviewUrl || null : null,
        uploading: r.uploading,
      })),
    [pendingRefs]
  )

  const canSendAttachmentMessage = useMemo(
    () =>
      pendingRefs.some((r) => Boolean(r.fileUrl?.trim()) && !r.uploading) &&
      !pendingRefs.some((r) => r.uploading),
    [pendingRefs]
  )

  const pendingAttachmentsHint = useMemo(() => {
    if (!pendingRefs.length) return undefined
    if (uploadBusy) return 'Загружаем файл...'
    return undefined
  }, [pendingRefs.length, uploadBusy])

  const getReadyAttachments = useCallback(() => {
    return pendingRefs.filter((r) => r.fileUrl && !r.uploading)
  }, [pendingRefs])

  const clearPendingAttachments = useCallback(() => {
    setPendingRefs((prev) => {
      for (const row of prev) {
        if (row.localPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(row.localPreviewUrl)
      }
      return []
    })
  }, [])

  const attachChatFiles = useCallback(
    async (files) => {
      if (!enabled || !files.length || uploadBusy) return
      const room = maxAttachments - pendingRefs.length
      if (room <= 0) {
        onError(maxAttachmentsMessage)
        return
      }
      onError(null)
      for (const file of files.slice(0, room)) {
        if (file.size > maxFileBytes) {
          onError(fileTooLargeMessage)
          continue
        }
        const clientToken = `${Date.now()}-${Math.random()}`
        const kind = guessAttachmentKind(file)
        const localPreviewUrl = kind === 'IMAGE' ? URL.createObjectURL(file) : undefined
        setPendingRefs((prev) => [
          ...prev,
          {
            clientToken,
            filename: file.name,
            kind,
            mimeType: file.type || 'application/octet-stream',
            localPreviewUrl,
            uploading: true,
          },
        ])
        try {
          const uploaded = await uploadFile(file)
          setPendingRefs((prev) =>
            prev.map((r) =>
              r.clientToken === clientToken
                ? {
                    ...r,
                    uploading: false,
                    fileUrl: uploaded.url,
                    kind: uploaded.kind,
                    mimeType: uploaded.mimeType,
                    filename: uploaded.filename,
                  }
                : r
            )
          )
        } catch (e) {
          setPendingRefs((prev) => {
            const row = prev.find((r) => r.clientToken === clientToken)
            if (row?.localPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(row.localPreviewUrl)
            return prev.filter((r) => r.clientToken !== clientToken)
          })
          onError(e instanceof Error ? e.message : uploadErrorFallback)
        }
      }
    },
    [
      enabled,
      fileTooLargeMessage,
      maxAttachments,
      maxAttachmentsMessage,
      maxFileBytes,
      onError,
      pendingRefs.length,
      uploadBusy,
      uploadErrorFallback,
      uploadFile,
    ]
  )

  const removePendingChatAttachment = useCallback(
    (clientKey) => {
      if (!enabled) return
      setPendingRefs((prev) => {
        const row = prev.find((r) => r.clientToken === clientKey)
        if (row?.localPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(row.localPreviewUrl)
        if (row?.fileUrl && revokeFile) {
          void revokeFile(row.fileUrl).catch(() => undefined)
        }
        return prev.filter((r) => r.clientToken !== clientKey)
      })
    },
    [enabled, revokeFile]
  )

  return {
    pendingRefs,
    uploadBusy,
    pendingOutgoingAttachments,
    canSendAttachmentMessage,
    pendingAttachmentsHint,
    attachChatFiles,
    removePendingChatAttachment,
    getReadyAttachments,
    clearPendingAttachments,
  }
}
