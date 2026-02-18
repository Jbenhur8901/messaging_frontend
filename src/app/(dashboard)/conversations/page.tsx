"use client"

import { useEffect, useState, useCallback } from "react"
import { useConversationsStore } from "@/stores"
import { usePolling } from "@/hooks"
import { ConversationList } from "@/components/conversations/conversation-list"
import { ConversationThread } from "@/components/conversations/conversation-thread"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, MessageSquareMore } from "lucide-react"

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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <MessageSquareMore className="h-5 w-5" />
            Conversations
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Suivez vos conversations WhatsApp en temps réel
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-[12px] rounded-lg gap-1.5"
          onClick={() => fetchConversations()}
          disabled={isLoading}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Actualiser
        </Button>
      </div>

      {/* Content */}
      <Card className="border-transparent overflow-hidden h-[calc(100vh-12rem)]">
        {/* Desktop: side by side */}
        <div className="hidden lg:flex h-full">
          <div className="w-[360px] border-r border-border/40 shrink-0">
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

        {/* Mobile: list + sheet */}
        <div className="lg:hidden h-full">
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

          <Sheet
            open={!!selectedConversationId}
            onOpenChange={(open) => {
              if (!open) clearSelection()
            }}
          >
            <SheetContent side="right" className="w-full sm:max-w-full p-0">
              {selectedConversation && (
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
              )}
            </SheetContent>
          </Sheet>
        </div>
      </Card>
    </div>
  )
}
