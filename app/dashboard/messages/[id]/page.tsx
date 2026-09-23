"use client";

import { useParams } from "next/navigation";

import { MessageThread } from "@/components/pages/messages/messageThread";

export default function MessageThreadPage() {
  const params = useParams<{ id: string }>();
  return <MessageThread conversationId={params.id} />;
}
