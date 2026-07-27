"use client"

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Users, Download, Save, MessageSquare, ToggleLeft, ToggleRight, Sparkles } from 'lucide-react';

export default function GroupsPage() {
  const [autoWelcome, setAutoWelcome] = useState(true);
  const [welcomeMessage, setWelcomeMessage] = useState('Halo {member_name}! Selamat datang di {group_name}. Jangan lupa baca rules ya!');
  const [groupJid, setGroupJid] = useState('');

  const handleSaveConfig = () => {
    // Mock API call to /api/groups/config
    console.log("Saving config:", { autoWelcome, welcomeMessage });
    alert("Configuration saved successfully!");
  };

  const handleExportCsv = () => {
    // Mock API call to /api/groups/extract-csv
    if(!groupJid) {
      alert("Please enter a valid Group JID");
      return;
    }
    console.log("Exporting CSV for JID:", groupJid);
    alert(`Exporting members for ${groupJid} to CSV...`);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 text-slate-100 min-h-[calc(100vh-4rem)]">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
          <Users className="w-8 h-8 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            WhatsApp Group Automation
            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20">
              PRO
            </Badge>
          </h1>
          <p className="text-slate-400 mt-1">Manage group settings, automated greeters, and member extraction.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Greeter Configuration */}
        <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-md shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2 text-slate-200">
              <MessageSquare className="w-5 h-5 text-indigo-400" />
              Group Greeter Configuration
            </CardTitle>
            <CardDescription className="text-slate-400">
              Configure automatic welcome messages for new members.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 relative z-10">
            <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/30 border border-slate-700/50">
              <div>
                <h4 className="font-medium text-slate-200">Auto-Welcome New Members</h4>
                <p className="text-sm text-slate-400">Send message automatically when someone joins.</p>
              </div>
              <button 
                onClick={() => setAutoWelcome(!autoWelcome)} 
                className="text-slate-300 hover:text-white transition-colors focus:outline-none"
              >
                {autoWelcome ? <ToggleRight className="w-10 h-10 text-emerald-400" /> : <ToggleLeft className="w-10 h-10 text-slate-500" />}
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-300">Welcome Message Template</label>
                <Badge variant="outline" className="text-[10px] bg-slate-800 text-slate-300 border-slate-600">Supports variables</Badge>
              </div>
              <textarea 
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                className="w-full min-h-[120px] p-3 rounded-md bg-slate-800/50 border border-slate-700 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                placeholder="Type your welcome message here..."
              />
              <div className="flex gap-2 text-xs text-slate-400">
                <span>Available tags:</span>
                <button onClick={() => setWelcomeMessage(prev => prev + '{member_name}')} className="px-1.5 py-0.5 bg-slate-800 rounded hover:bg-slate-700 text-indigo-300 transition-colors">{`{member_name}`}</button>
                <button onClick={() => setWelcomeMessage(prev => prev + '{group_name}')} className="px-1.5 py-0.5 bg-slate-800 rounded hover:bg-slate-700 text-indigo-300 transition-colors">{`{group_name}`}</button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="pt-2 relative z-10 border-t border-slate-800/50 mt-4">
            <Button onClick={handleSaveConfig} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-900/20">
              <Save className="w-4 h-4 mr-2" />
              Simpan Pengaturan
            </Button>
          </CardFooter>
        </Card>

        {/* Card 2: Member Extractor */}
        <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-md shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2 text-slate-200">
              <Download className="w-5 h-5 text-emerald-400" />
              Group Member Extractor
            </CardTitle>
            <CardDescription className="text-slate-400">
              Extract all member phone numbers from a specific group.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 relative z-10">
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-300">Group JID</label>
              <div className="relative">
                <Input 
                  value={groupJid}
                  onChange={(e) => setGroupJid(e.target.value)}
                  placeholder="e.g. 120363012345@g.us"
                  className="bg-slate-800/50 border-slate-700 text-slate-200 placeholder:text-slate-500 focus-visible:ring-emerald-500/50"
                />
              </div>
              <p className="text-xs text-slate-500">You can find the Group JID in the chat URL or via bot logs.</p>
            </div>
            
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-200/80 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <p>Exporting to CSV allows you to use these numbers for broadcast campaigns or custom audience targeting.</p>
            </div>
          </CardContent>
          <CardFooter className="pt-2 relative z-10 border-t border-slate-800/50 mt-4">
            <Button onClick={handleExportCsv} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-900/20">
              <Download className="w-4 h-4 mr-2" />
              Ekspor Anggota ke CSV
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
