"use client"

import { useEffect, useState, useCallback } from "react"
import { useConversationsStore } from "@/stores"
import { usePolling } from "@/hooks"
import { ConversationList } from "@/components/conversations/conversation-list"
import { ConversationThread } from "@/components/conversations/conversation-thread"

export default function ConversationsPage() {
  const {
    conversations,
    selectedConversationId,
    selectedMessages,
    isLoading,
    isLoadingThread,
    isSending,
    searchQuery,
    conversationStatus,
    fetchConversations,
    selectConversation,
    clearSelection,
    setSearchQuery,
    setConversationStatus,
    refreshMessages,
    closeConversation,
    archiveConversation,
    reopenConversation,
    markAsRead,
    sendMessage,
    sendMedia,
  } = useConversationsStore()

  const [isTabVisible, setIsTabVisible] = useState(true)

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId) || null

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  useEffect(() => {
    const handleVisibility = () => {
      setIsTabVisible(document.visibilityState === "visible")
    }
    document.addEventListener("visibilitychange", handleVisibility)
    return () => document.removeEventListener("visibilitychange", handleVisibility)
  }, [])

  const handleRefresh = useCallback(() => {
    refreshMessages()
  }, [refreshMessages])

  usePolling(handleRefresh, { interval: 10000, enabled: isTabVisible })

  const handleBack = useCallback(() => {
    clearSelection()
  }, [clearSelection])

  const handleSendText = useCallback(async (text: string) => {
    await sendMessage(text)
  }, [sendMessage])

  const handleSendMedia = useCallback(async (payload: {
    media_type: "image" | "video" | "audio" | "document"
    media_id?: string
    caption?: string
    filename?: string
  }) => {
    await sendMedia(payload)
  }, [sendMedia])

  const handleClose = useCallback(() => {
    if (selectedConversationId) closeConversation(selectedConversationId)
  }, [selectedConversationId, closeConversation])

  const handleArchive = useCallback(() => {
    if (selectedConversationId) archiveConversation(selectedConversationId)
  }, [selectedConversationId, archiveConversation])

  const handleReopen = useCallback(() => {
    if (selectedConversationId) reopenConversation(selectedConversationId)
  }, [selectedConversationId, reopenConversation])

  const handleMarkRead = useCallback(() => {
    if (selectedConversationId) markAsRead(selectedConversationId)
  }, [selectedConversationId, markAsRead])

  return (
    <div className="flex h-[calc(100vh-5rem)] min-h-[620px] flex-col overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
      {/* Desktop: side by side */}
      <div className="hidden lg:flex flex-1 min-h-0">
        <div className="w-[380px] shrink-0 border-r border-border/60 bg-background/40 xl:w-[420px]">
          <ConversationList
            conversations={conversations}
            selectedConversationId={selectedConversationId}
            searchQuery={searchQuery}
            isLoading={isLoading}
            conversationStatus={conversationStatus}
            onSelect={selectConversation}
            onSearchChange={setSearchQuery}
            onStatusChange={setConversationStatus}
          />
        </div>
        <div className="flex-1">
          <ConversationThread
            messages={selectedMessages}
            conversation={selectedConversation}
            isLoading={isLoadingThread}
            isSending={isSending}
            onSendText={handleSendText}
            onSendMedia={handleSendMedia}
            onClose={handleClose}
            onArchive={handleArchive}
            onReopen={handleReopen}
            onMarkRead={handleMarkRead}
          />
        </div>
      </div>

      {/* Mobile: show list OR thread */}
      <div className="lg:hidden flex-1 min-h-0">
        {selectedConversationId ? (
          <ConversationThread
            messages={selectedMessages}
            conversation={selectedConversation}
            isLoading={isLoadingThread}
            isSending={isSending}
            onBack={handleBack}
            onSendText={handleSendText}
            onSendMedia={handleSendMedia}
            onClose={handleClose}
            onArchive={handleArchive}
            onReopen={handleReopen}
            onMarkRead={handleMarkRead}
          />
        ) : (
          <ConversationList
            conversations={conversations}
            selectedConversationId={selectedConversationId}
            searchQuery={searchQuery}
            isLoading={isLoading}
            conversationStatus={conversationStatus}
            onSelect={selectConversation}
            onSearchChange={setSearchQuery}
            onStatusChange={setConversationStatus}
          />
        )}
      </div>
    </div>
  )
}
