import React, { useState } from 'react';
import { Keyboard, TextCursor, Link, Youtube, Image, Network, Instagram, Twitter, Facebook, AudioWaveform, ListMusic, Users } from 'lucide-react';
import { Modal } from './Modal';
import { TikTokIcon } from './icons/TikTokIcon';
import { SpotifyIcon } from './icons/SpotifyIcon';
import { SoundCloudIcon } from './icons/SoundCloudIcon';

interface MindMapHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NodeTypeInfo {
  id: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  usage: string;
  category: 'basic' | 'music' | 'social';
}

const nodeTypesInfo: NodeTypeInfo[] = [
  {
    id: 'default',
    icon: <TextCursor className="w-5 h-5" />,
    label: 'Text Node',
    description: 'Add simple text content to your mind map.',
    usage: 'Perfect for notes, ideas, and basic information. Click to edit the text directly.',
    category: 'basic'
  },
  {
    id: 'link',
    icon: <Link className="w-5 h-5" />,
    label: 'Link Node',
    description: 'Add clickable URLs to external websites.',
    usage: 'Enter any URL and it will become a clickable link. Great for references and resources.',
    category: 'basic'
  },
  {
    id: 'youtube-video',
    icon: <Youtube className="w-5 h-5" />,
    label: 'YouTube Video',
    description: 'Embed YouTube videos directly in your mind map.',
    usage: 'Simply search a video or paste YouTube URL to embed the video. Videos can be played without leaving your mindmap.',
    category: 'basic'
  },
  {
    id: 'image',
    icon: <Image className="w-5 h-5" />,
    label: 'Image Node',
    description: 'Upload and display images in your mind map.',
    usage: 'Upload images from your device. You can also drag and drop images from your file explorer or from the internet.',
    category: 'basic'
  },
  {
    id: 'mindmap',
    icon: <Network className="w-5 h-5" />,
    label: 'Mindmap Node',
    description: 'Embed another mind map within your current one.',
    usage: 'Create hierarchical mind maps by linking to other mind maps you\'ve created.',
    category: 'basic'
  },
  {
    id: 'spotify',
    icon: <SpotifyIcon className="w-5 h-5" />,
    label: 'Spotify song',
    description: 'Embed Spotify songs',
    usage: 'Simply search a song or paste a Spotify URL to embed playable song directly in your mindmap. NOTE: You must be logged in to Spotify to listen to the full song.',
    category: 'music'
  },
  {
    id: 'soundcloud',
    icon: <SoundCloudIcon className="w-5 h-5" />,
    label: 'SoundCloud Track',
    description: 'Embed SoundCloud audio tracks.',
    usage: 'Share SoundCloud tracks and podcasts by pasting SoundCloud URLs.',
    category: 'music'
  },
  {
    id: 'audio',
    icon: <AudioWaveform className="w-5 h-5" />,
    label: 'Audio File',
    description: 'Upload and play audio files.',
    usage: 'Upload MP3, WAV, or other audio files to create playable audio nodes. NOTE: Currently unstable',
    category: 'music'
  },
  {
    id: 'playlist',
    icon: <ListMusic className="w-5 h-5" />,
    label: 'Playlist',
    description: 'Create custom playlists with multiple tracks.',
    usage: 'Combine multiple music tracks into organized playlists within your mind map. Click "+ Add" and then click on any audio, Spotify, SoundCloud, or YouTube video node to add it to the playlist.',
    category: 'music'
  },
  {
    id: 'instagram',
    icon: <Instagram className="w-5 h-5" />,
    label: 'Instagram',
    description: 'Link to Instagram profiles and posts.',
    usage: 'Share Instagram profiles or specific posts by adding Instagram URLs.',
    category: 'social'
  },
  {
    id: 'twitter',
    icon: <Twitter className="w-5 h-5" />,
    label: 'Twitter/X',
    description: 'Link to Twitter/X profiles and tweets.',
    usage: 'Share Twitter profiles or specific tweets by adding Twitter URLs.',
    category: 'social'
  },
  {
    id: 'facebook',
    icon: <Facebook className="w-5 h-5" />,
    label: 'Facebook',
    description: 'Link to Facebook profiles and pages.',
    usage: 'Share Facebook profiles, pages, or posts by adding Facebook URLs.',
    category: 'social'
  },
  {
    id: 'youtube',
    icon: <Youtube className="w-5 h-5" />,
    label: 'YouTube Channel',
    description: 'Link to YouTube channels and profiles.',
    usage: 'Share YouTube channels by adding channel URLs (different from video embedding).',
    category: 'social'
  },
  {
    id: 'tiktok',
    icon: <TikTokIcon className="w-5 h-5" />,
    label: 'TikTok',
    description: 'Link to TikTok profiles and videos.',
    usage: 'Share TikTok profiles or specific videos by adding TikTok URLs.',
    category: 'social'
  }
];

export function MindMapHelpModal({ isOpen, onClose }: MindMapHelpModalProps) {
  const [selectedNodeType, setSelectedNodeType] = useState<NodeTypeInfo | null>(null);
  const [activeCategory, setActiveCategory] = useState<'basic' | 'music' | 'social'>('basic');
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-6 max-w-2xl bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold flex items-center gap-2 bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
            <div className="p-2 bg-blue-500/10 rounded-xl">
              <Keyboard className="w-5 h-5 text-blue-400" />
            </div>
            MindMap Help
          </h2>
        </div>

        <div className="space-y-5">
          <section>
            <h3 className="text-lg font-semibold text-slate-100 mb-3">Keyboard Shortcuts</h3>
            <div className="bg-slate-800/40 rounded-xl p-3 space-y-2 border border-slate-700/30">
              <div className="flex justify-between items-center">
                <span className="text-slate-300 text-sm">Undo</span>
                <kbd className="px-2 py-1 bg-slate-700/70 rounded text-xs text-blue-300 border border-slate-600/50">Ctrl + Z</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-300 text-sm">Redo</span>
                <kbd className="px-2 py-1 bg-slate-700/70 rounded text-xs text-blue-300 border border-slate-600/50">Ctrl + Y</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-300 text-sm">Save Changes</span>
                <kbd className="px-2 py-1 bg-slate-700/70 rounded text-xs text-blue-300 border border-slate-600/50">Ctrl + S</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-300 text-sm">Move Node with Children</span>
                <kbd className="px-2 py-1 bg-slate-700/70 rounded text-xs text-blue-300 border border-slate-600/50">Hold Ctrl + drag</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-300 text-sm">Area Selection</span>
                <kbd className="px-2 py-1 bg-slate-700/70 rounded text-xs text-blue-300 border border-slate-600/50">Hold Shift + drag</kbd>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-slate-100 mb-3">Basic Usage</h3>
            <div className="bg-slate-800/40 rounded-xl p-3 space-y-2 text-slate-300 text-sm border border-slate-700/30">
              <p><strong className="text-blue-300">Adding Nodes:</strong> Use the node menu on the left to add different types of nodes.</p>
              <p><strong className="text-blue-300">Connecting Nodes:</strong> Drag from a node's handle to connect it to another node.</p>
              <p><strong className="text-blue-300">Editing Nodes:</strong> Click on a node to select it and edit its properties.</p>
              <p><strong className="text-blue-300">Deleting Nodes:</strong> Select a node and press the delete button in the toolbar.</p>
              <p><strong className="text-blue-300">Moving the Canvas:</strong> Click and drag on empty space to move around.</p>
              <p><strong className="text-blue-300">Zooming:</strong> Use the mouse wheel or the controls in the bottom right.</p>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-slate-100 mb-3">Interactive Node Types</h3>
            <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/30">
              {/* Category Selector */}
              <div className="flex flex-wrap gap-2 mb-3">
                {(['basic', 'music', 'social'] as const).map((category) => (
                  <button
                    key={category}
                    onClick={() => {
                      setActiveCategory(category);
                      setSelectedNodeType(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      activeCategory === category
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                    }`}
                  >
                    {category === 'basic' && 'Basic'}
                    {category === 'music' && 'Music'}
                    {category === 'social' && 'Social'}
                  </button>
                ))}
              </div>

              {/* Node Types Grid and Details */}
              {activeCategory !== 'social' ? (
                <>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {nodeTypesInfo
                      .filter(nodeType => nodeType.category === activeCategory)
                      .map((nodeType) => (
                        <button
                          key={nodeType.id}
                          onClick={() => setSelectedNodeType(nodeType)}
                          className={`p-2.5 rounded-lg border transition-all duration-200 hover:scale-105 ${
                            selectedNodeType?.id === nodeType.id
                              ? 'bg-blue-600/20 border-blue-400 ring-2 ring-blue-400/50'
                              : 'bg-slate-700/30 border-slate-600/50 hover:border-blue-400/50'
                          }`}
                        >
                          <div className="flex flex-col items-center gap-1.5">
                            <div className="text-blue-400">
                              {nodeType.icon}
                            </div>
                            <span className="text-xs text-slate-300 text-center font-medium leading-tight">
                              {nodeType.label}
                            </span>
                          </div>
                        </button>
                      ))}
                  </div>
                  {/* Selected Node Type Details */}
                  {selectedNodeType && (
                    <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-600/50">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="text-blue-400">
                          {selectedNodeType.icon}
                        </div>
                        <h4 className="font-semibold text-slate-100">{selectedNodeType.label}</h4>
                      </div>
                      <p className="text-slate-300 text-sm mb-2 leading-relaxed">{selectedNodeType.description}</p>
                      <div className="bg-blue-900/20 rounded p-2 border-l-2 border-blue-400">
                        <p className="text-blue-200 text-sm leading-relaxed">
                          <strong>How to use:</strong> {selectedNodeType.usage}
                        </p>
                      </div>
                    </div>
                  )}
                  {!selectedNodeType && (
                    <div className="text-center py-4 text-slate-400">
                      <div className="text-xl mb-1">👆</div>
                      <p className="text-sm">Click on any node type above to learn more about it</p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {nodeTypesInfo
                      .filter(nodeType => nodeType.category === 'social')
                      .map((nodeType) => (
                        <div
                          key={nodeType.id}
                          className="p-2.5 rounded-lg bg-slate-700/30 border border-slate-600/50 flex flex-col items-center gap-1.5"
                        >
                          <div className="text-blue-400">
                            {nodeType.icon}
                          </div>
                          <span className="text-xs text-slate-300 text-center font-medium leading-tight">
                            {nodeType.label}
                          </span>
                        </div>
                      ))}
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-600/50 text-center">
                    <div className="flex justify-center mb-2">
                      <Users className="w-7 h-7 text-blue-400" />
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed">
                      <strong className="text-blue-300">Social Nodes:</strong>  <br />
                      Simply type the username of the selected platform without any @ symbol.<br />
                      The node will automatically link to the correct profile.
                    </p>
                  </div>
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    </Modal>
  );
}
