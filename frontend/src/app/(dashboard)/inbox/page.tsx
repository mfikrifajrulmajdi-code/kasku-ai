"use client"

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bot, User, Send, Search, CheckCheck, Clock, Settings2 } from 'lucide-react';

const mockChats = [
  { id: 1, name: "Budi Santoso", phone: "+62 812-3456-7890", lastMessage: "Apakah stok masih ada?", time: "10:32 AM", unread: 2, isTakeover: false },
  { id: 2, name: "Siti Rahma", phone: "+62 813-9876-5432", lastMessage: "Terima kasih, Kak!", time: "09:15 AM", unread: 0, isTakeover: true },
  { id: 3, name: "Ahmad Zain", phone: "+62 856-1122-3344", lastMessage: "Bisa kirim hari ini?", time: "Kemarin", unread: 0, isTakeover: false },
];

const mockMessages = [
  { id: 1, sender: 'customer', text: 'Halo, saya mau pesan produk A.', time: '10:30 AM' },
  { id: 2, sender: 'bot', text: 'Halo Budi! Terima kasih telah menghubungi KasKu. Produk A saat ini tersedia. Ada yang bisa kami bantu?', time: '10:30 AM' },
  { id: 3, sender: 'customer', text: 'Apakah stok masih ada?', time: '10:32 AM' },
];

export default function InboxPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeChat, setActiveChat] = useState<typeof mockChats[0] | null>(mockChats[0]);
  const [isTakeover, setIsTakeover] = useState(mockChats[0]?.isTakeover || false);
  const [replyText, setReplyText] = useState('');

  const filteredChats = mockChats.filter(chat => 
    chat.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    chat.phone.includes(searchQuery)
  );

  const handleSend = () => {
    if (!replyText.trim()) return;
    // Mock API call to /api/inbox/send-reply
    console.log("Sending reply:", replyText);
    setReplyText('');
  };

  const handleTakeoverToggle = () => {
    // Mock API call to /api/inbox/takeover
    setIsTakeover(!isTakeover);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] w-full gap-4 p-4 text-slate-100 bg-slate-950/50">
      {/* Left Column - Chat List */}
      <Card className="w-1/3 flex flex-col h-full border-slate-800 bg-slate-900/40 backdrop-blur-md shadow-2xl">
        <CardHeader className="pb-4 border-b border-slate-800">
          <CardTitle className="text-xl font-bold flex items-center justify-between">
            Live Inbox
            <Badge variant="outline" className="border-indigo-500/50 text-indigo-400 bg-indigo-500/10">
              {mockChats.length} Chats
            </Badge>
          </CardTitle>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Search chats..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-800/50 border-slate-700 text-slate-200 placeholder:text-slate-500 focus-visible:ring-indigo-500/50"
            />
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-0 scrollbar-thin scrollbar-thumb-slate-700">
          {filteredChats.map(chat => (
            <div 
              key={chat.id}
              onClick={() => { setActiveChat(chat); setIsTakeover(chat.isTakeover); }}
              className={`p-4 border-b border-slate-800/50 cursor-pointer transition-all hover:bg-slate-800/60 ${activeChat?.id === chat.id ? 'bg-indigo-950/30 border-l-4 border-l-indigo-500' : 'border-l-4 border-l-transparent'}`}
            >
              <div className="flex justify-between items-start mb-1">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border border-slate-700">
                    <AvatarFallback className="bg-slate-800 text-indigo-400 font-bold">{chat.name.substring(0,2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-medium text-slate-200 text-sm">{chat.name}</h4>
                    <p className="text-xs text-slate-400">{chat.phone}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] text-slate-500 font-medium">{chat.time}</span>
                  {chat.unread > 0 && (
                    <Badge className="h-5 w-5 p-0 flex items-center justify-center rounded-full bg-indigo-500 hover:bg-indigo-600 font-bold text-[10px]">
                      {chat.unread}
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="flex justify-between items-end mt-2">
                <p className="text-xs text-slate-400 truncate max-w-[180px]">{chat.lastMessage}</p>
                {chat.isTakeover ? (
                   <Badge variant="outline" className="text-[9px] h-4 px-1.5 py-0 border-amber-500/50 text-amber-400 bg-amber-500/10 flex items-center gap-1">
                     <User className="w-2.5 h-2.5" /> Human CS
                   </Badge>
                ) : (
                   <Badge variant="outline" className="text-[9px] h-4 px-1.5 py-0 border-emerald-500/50 text-emerald-400 bg-emerald-500/10 flex items-center gap-1">
                     <Bot className="w-2.5 h-2.5" /> Bot AI
                   </Badge>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Right Column - Active Chat */}
      <Card className="w-2/3 flex flex-col h-full border-slate-800 bg-slate-900/40 backdrop-blur-md shadow-2xl overflow-hidden relative">
        {activeChat ? (
          <>
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur z-10">
               <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border border-slate-700">
                    <AvatarFallback className="bg-slate-800 text-indigo-400 font-bold">{activeChat.name.substring(0,2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-slate-100">{activeChat.name}</h3>
                    <p className="text-xs text-slate-400">{activeChat.phone}</p>
                  </div>
               </div>
               <div className="flex items-center gap-3">
                 <div className="flex items-center gap-2 mr-2">
                   <span className="text-xs font-medium text-slate-400">Takeover Mode</span>
                   <Button 
                     variant={isTakeover ? "default" : "outline"} 
                     size="sm" 
                     onClick={handleTakeoverToggle}
                     className={isTakeover ? "bg-amber-500 hover:bg-amber-600 text-amber-950 font-bold border-none" : "border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"}
                   >
                     {isTakeover ? (
                       <><User className="w-4 h-4 mr-2" /> CS Active</>
                     ) : (
                       <><Bot className="w-4 h-4 mr-2 text-emerald-400" /> Bot Active</>
                     )}
                   </Button>
                 </div>
                 <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-200 hover:bg-slate-800">
                   <Settings2 className="w-5 h-5" />
                 </Button>
               </div>
            </div>

            {/* Banner */}
            {isTakeover && (
              <div className="bg-amber-500/10 border-y border-amber-500/30 px-4 py-2 flex items-center justify-center gap-2 text-amber-200/90 text-xs font-medium z-10 backdrop-blur">
                <User className="w-4 h-4" />
                AI paused for this chat. Human CS is responding.
              </div>
            )}

            {/* Message Feed */}
            <CardContent className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 scrollbar-thin scrollbar-thumb-slate-700 bg-slate-950/20 relative">
              <div className="flex flex-col gap-4">
                {mockMessages.map(msg => {
                  const isUser = msg.sender === 'customer';
                  return (
                    <div key={msg.id} className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 shadow-md relative group ${
                        isUser 
                          ? 'bg-slate-800 text-slate-200 rounded-tl-sm border border-slate-700/50' 
                          : 'bg-indigo-600 text-white rounded-tr-sm border border-indigo-500/50'
                      }`}>
                        {!isUser && (
                          <div className="flex items-center gap-1 mb-1 opacity-70">
                            {msg.sender === 'bot' ? <Bot className="w-3 h-3" /> : <User className="w-3 h-3" />}
                            <span className="text-[9px] uppercase font-bold tracking-wider">{msg.sender}</span>
                          </div>
                        )}
                        <p className="text-sm leading-relaxed">{msg.text}</p>
                        <div className="flex justify-end items-center gap-1 mt-1 opacity-60">
                          <span className="text-[10px]">{msg.time}</span>
                          {!isUser && <CheckCheck className="w-3 h-3" />}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>

            {/* Bottom Input */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/80 backdrop-blur z-10 flex gap-2">
              <Input 
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your message as Human CS..." 
                className="flex-1 bg-slate-800/50 border-slate-700 text-slate-200 focus-visible:ring-indigo-500/50"
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              />
              <Button 
                onClick={handleSend}
                className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-900/20"
              >
                <Send className="w-4 h-4 mr-2" />
                Kirim Pesan
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
            <Bot className="w-16 h-16 mb-4 opacity-20" />
            <h3 className="text-lg font-medium text-slate-400">Select a chat to start messaging</h3>
          </div>
        )}
      </Card>
    </div>
  );
}
