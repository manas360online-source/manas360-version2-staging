import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Search, Send } from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
	fetchProviderConversations,
	fetchProviderMessages,
	sendProviderMessage,
	type ProviderConversationSummary,
	type ProviderDirectMessage,
} from '../../api/provider';

const formatRelativeTime = (value?: string | null): string => {
	if (!value) return '';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '';
	const diff = Date.now() - date.getTime();
	if (diff < 60_000) return 'Just now';
	if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
	if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
	return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const formatMessageTime = (value?: string | null): string => {
	if (!value) return '';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '';
	return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
};

const initialsFor = (conversation: ProviderConversationSummary): string => {
	const parts = conversation.patientName.split(/\s+/).filter(Boolean);
	if (parts.length === 0) return 'PT';
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
};

export default function Messages() {
	const queryClient = useQueryClient();
	const [activeConversationId, setActiveConversationId] = useState<string>('');
	const [draft, setDraft] = useState('');
	const [search, setSearch] = useState('');

	const conversationsQuery = useQuery({
		queryKey: ['providerConversations'],
		queryFn: fetchProviderConversations,
		refetchInterval: 15_000,
	});

	const filteredConversations = useMemo(() => {
		const items = conversationsQuery.data ?? [];
		const term = search.trim().toLowerCase();
		if (!term) return items;
		return items.filter((conversation) => {
			const haystack = [conversation.patientName, conversation.patientEmail, conversation.lastMessage]
				.filter(Boolean)
				.join(' ')
				.toLowerCase();
			return haystack.includes(term);
		});
	}, [conversationsQuery.data, search]);

	useEffect(() => {
		if (!filteredConversations.length) {
			setActiveConversationId('');
			return;
		}

		const exists = filteredConversations.some((conversation) => conversation.id === activeConversationId);
		if (!exists) {
			setActiveConversationId(filteredConversations[0].id);
		}
	}, [activeConversationId, filteredConversations]);

	const activeConversation = filteredConversations.find((conversation) => conversation.id === activeConversationId) ?? null;

	const messagesQuery = useQuery({
		queryKey: ['providerConversationMessages', activeConversationId],
		queryFn: () => fetchProviderMessages(activeConversationId),
		enabled: Boolean(activeConversationId),
		refetchInterval: activeConversationId ? 7_500 : false,
	});

	const sendMutation = useMutation({
		mutationFn: async (payload: { conversationId: string; patientId: string; content: string }) =>
			sendProviderMessage(payload),
		onSuccess: async () => {
			setDraft('');
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ['providerConversations'] }),
				queryClient.invalidateQueries({ queryKey: ['providerConversationMessages', activeConversationId] }),
			]);
		},
		onError: (error: any) => {
			toast.error(String(error?.response?.data?.message || error?.message || 'Unable to send message'));
		},
	});

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!activeConversation || !draft.trim() || sendMutation.isPending) return;
		sendMutation.mutate({
			conversationId: activeConversation.id,
			patientId: activeConversation.patientId,
			content: draft.trim(),
		});
	};

	const renderBubble = (message: ProviderDirectMessage) => {
		const isProvider = message.role === 'provider';
		const isSystem = message.role === 'system';

		return (
			<div
				key={message.id}
				className={`flex ${isProvider ? 'justify-end' : 'justify-start'}`}
			>
				<div
					className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
						isSystem
							? 'bg-amber-50 text-amber-900'
							: isProvider
							? 'bg-[#2D4128] text-white'
							: 'bg-[#F3F5F2] text-slate-800'
					}`}
				>
					<p className="whitespace-pre-wrap leading-6">{message.content}</p>
					<p className={`mt-2 text-[11px] ${isProvider ? 'text-white/70' : 'text-slate-500'}`}>
						{formatMessageTime(message.createdAt)}
					</p>
				</div>
			</div>
		);
	};

	return (
		<div className="min-h-screen bg-[#F6F6F1] p-6">
			<div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-7xl overflow-hidden rounded-[28px] border border-[#D9E1D5] bg-white shadow-[0_20px_70px_rgba(31,41,55,0.08)]">
				<aside className="flex w-full max-w-[360px] flex-col border-r border-[#E8EDE4] bg-[#FBFBF8]">
					<div className="border-b border-[#E8EDE4] px-6 py-5">
						<p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6B7B68]">Messages</p>
						<h1 className="mt-2 text-2xl font-semibold text-[#23313A]">Patient Inbox</h1>
						<div className="mt-4 flex items-center gap-3 rounded-2xl border border-[#E1E7DC] bg-white px-4 py-3">
							<Search className="h-4 w-4 text-[#6B7B68]" />
							<input
								value={search}
								onChange={(event) => setSearch(event.target.value)}
								placeholder="Search patients or messages"
								className="w-full border-0 bg-transparent text-sm text-[#23313A] outline-none placeholder:text-[#90A08D]"
							/>
						</div>
					</div>

					<div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
						{conversationsQuery.isLoading && (
							<div className="space-y-3 px-2 py-4">
								{Array.from({ length: 4 }).map((_, index) => (
									<div key={`provider-conversation-skeleton-${index}`} className="h-24 animate-pulse rounded-2xl bg-[#EEF2EA]" />
								))}
							</div>
						)}

						{!conversationsQuery.isLoading && filteredConversations.length === 0 && (
							<div className="px-4 py-10 text-center">
								<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#E8EFE6] text-[#4A6741]">
									<MessageSquare className="h-6 w-6" />
								</div>
								<p className="mt-4 text-sm font-semibold text-[#23313A]">No patient threads yet</p>
								<p className="mt-2 text-sm text-slate-500">
									Patients with session history or chat history will appear here.
								</p>
							</div>
						)}

						{filteredConversations.map((conversation) => {
							const isActive = conversation.id === activeConversationId;
							return (
								<button
									key={conversation.id}
									type="button"
									onClick={() => setActiveConversationId(conversation.id)}
									className={`mb-2 flex w-full items-start gap-3 rounded-2xl px-4 py-4 text-left transition ${
										isActive ? 'bg-[#E8EFE6]' : 'hover:bg-[#F1F4EE]'
									}`}
								>
									<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#DDE7D7] text-sm font-semibold text-[#2D4128]">
										{initialsFor(conversation)}
									</div>
									<div className="min-w-0 flex-1">
										<div className="flex items-start justify-between gap-3">
											<div className="min-w-0">
												<p className="truncate text-sm font-semibold text-[#23313A]">{conversation.patientName}</p>
												<p className="mt-0.5 text-xs text-slate-500">
													{conversation.hasMessageHistory ? 'Conversation active' : 'Session history only'}
												</p>
											</div>
											<p className="shrink-0 text-xs text-slate-400">{formatRelativeTime(conversation.lastMessageAt)}</p>
										</div>
										<p className="mt-2 truncate text-sm text-slate-600">
											{conversation.lastMessage || 'No messages yet. Start the conversation.'}
										</p>
									</div>
									{conversation.unreadCount > 0 && (
										<span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[#2D4128] px-2 text-xs font-semibold text-white">
											{conversation.unreadCount}
										</span>
									)}
								</button>
							);
						})}
					</div>
				</aside>

				<section className="flex min-w-0 flex-1 flex-col bg-[linear-gradient(180deg,#FCFDFB_0%,#F7F8F5_100%)]">
					{activeConversation ? (
						<>
							<div className="border-b border-[#E8EDE4] px-8 py-6">
								<p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6B7B68]">Active Chat</p>
								<div className="mt-2 flex items-center justify-between gap-4">
									<div>
										<h2 className="text-2xl font-semibold text-[#23313A]">{activeConversation.patientName}</h2>
										<p className="mt-1 text-sm text-slate-500">
											{activeConversation.patientEmail || 'Patient record connected'}
										</p>
									</div>
									<div className="rounded-full bg-[#E8EFE6] px-4 py-2 text-xs font-semibold text-[#2D4128]">
										{activeConversation.hasSessionHistory ? 'In care' : 'Messaging only'}
									</div>
								</div>
							</div>

							<div className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
								{messagesQuery.isLoading && (
									<div className="space-y-3">
										{Array.from({ length: 5 }).map((_, index) => (
											<div key={`provider-message-skeleton-${index}`} className="h-16 animate-pulse rounded-2xl bg-[#EEF2EA]" />
										))}
									</div>
								)}

								{!messagesQuery.isLoading && (messagesQuery.data?.length ?? 0) === 0 && (
									<div className="flex h-full flex-col items-center justify-center text-center">
										<div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#E8EFE6] text-[#4A6741]">
											<MessageSquare className="h-7 w-7" />
										</div>
										<p className="mt-5 text-base font-semibold text-[#23313A]">Start the conversation</p>
										<p className="mt-2 max-w-md text-sm text-slate-500">
											This patient is available because they already have clinical history with you. Send the first message to open the thread.
										</p>
									</div>
								)}

								<div className="space-y-4">
									{(messagesQuery.data ?? []).map((message) => renderBubble(message))}
								</div>
							</div>

							<form onSubmit={handleSubmit} className="border-t border-[#E8EDE4] px-8 py-5">
								<div className="flex items-end gap-3 rounded-[24px] border border-[#DDE5D9] bg-white px-4 py-3 shadow-sm">
									<textarea
										rows={1}
										value={draft}
										onChange={(event) => setDraft(event.target.value)}
										placeholder={`Message ${activeConversation.patientName}...`}
										className="max-h-40 min-h-[28px] flex-1 resize-none border-0 bg-transparent text-sm text-[#23313A] outline-none placeholder:text-[#90A08D]"
									/>
									<button
										type="submit"
										disabled={!draft.trim() || sendMutation.isPending}
										className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#2D4128] text-white transition hover:bg-[#1E2D1A] disabled:cursor-not-allowed disabled:bg-[#AAB8A5]"
									>
										<Send className="h-4 w-4" />
									</button>
								</div>
							</form>
						</>
					) : (
						<div className="flex h-full flex-col items-center justify-center px-8 text-center">
							<div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#E8EFE6] text-[#4A6741]">
								<MessageSquare className="h-7 w-7" />
							</div>
							<p className="mt-5 text-lg font-semibold text-[#23313A]">Select a patient thread</p>
							<p className="mt-2 max-w-md text-sm text-slate-500">
								Choose a patient from the left pane to review history and continue the conversation.
							</p>
						</div>
					)}
				</section>
			</div>
		</div>
	);
}