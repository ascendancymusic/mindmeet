import React, { useMemo } from "react"
import {
  ArrowDownAZ,
  PlusCircle,
  Search,
  Network,
  Eye,
  EyeOff,
  Link,
  X,
} from "lucide-react"
import { useMindMapStore } from "../store/mindMapStore"
import { useAuthStore } from "../store/authStore"

/**
 * MindMapSelector Component
 * 
 * A reusable component for selecting mindmaps with search, sort, and create functionality.
 *  * @example
 * ```tsx
* const [searchTerm, setSearchTerm] = useState("")
 * const [sortBy, setSortBy] = useState<'alphabetical' | 'lastEdited'>('lastEdited')
 * const [showCreateForm, setShowCreateForm] = useState(false)
 * const [newMapTitle, setNewMapTitle] = useState("")
 * const [showSelector, setShowSelector] = useState(false)
 * 
 * const handleSelectMindMap = (mapId: string) => {
 *   console.log("Selected mindmap:", mapId)
 *   setShowSelector(false)
 * }
 * 
 * return (
 *   <div className="relative">
 *     <button onClick={() => setShowSelector(true)}>
 *       Show MindMap Selector
 *     </button>
 *     {showSelector && (
 *       <MindMapSelector
 *         searchTerm={searchTerm}
 *         setSearchTerm={setSearchTerm}
 *         sortBy={sortBy}
 *         setSortBy={setSortBy}
 *         showCreateForm={showCreateForm}
 *         setShowCreateForm={setShowCreateForm}
 *         newMapTitle={newMapTitle}
 *         setNewMapTitle={setNewMapTitle}
 *         onSelectMindMap={handleSelectMindMap}
 *         onCreateMindMap={() => {
 *           setShowCreateForm(false)
 *           setNewMapTitle("")
 *         }}
 *         onCancelCreate={() => {
 *           setShowCreateForm(false)
 *           setNewMapTitle("")
 *         }}
 *         isAIConversation={true}
 *         onClose={() => setShowSelector(false)}
 *         excludeMapId="current-map-id-to-exclude"
 *       />
 *     )}
 *   </div>
 * )
 *           setNewMapTitle("")
 *         }}
 *         onCancelCreate={() => {
 *           setShowCreateForm(false)
 *           setNewMapTitle("")
 *         }}
 *         isAIConversation={true}
 *         onClose={() => setShowSelector(false)}
 *       />
 *     )}
 *   </div>
 * )
 *
```
 */

interface MindMapSelectorProps {
  searchTerm: string
  setSearchTerm: (term: string) => void
  sortBy: 'alphabetical' | 'lastEdited'
  setSortBy: (sortBy: 'alphabetical' | 'lastEdited') => void
  showCreateForm: boolean
  setShowCreateForm: (show: boolean) => void
  newMapTitle: string
  setNewMapTitle: (title: string) => void
  onSelectMindMap: (mapId: string) => void
  onCreateMindMap: () => void
  onCancelCreate: () => void
  isAIConversation?: boolean
  onClose: () => void
  title?: string
  mode?: 'overlay' | 'inline'
  excludeMapId?: string // ID of the current map being edited to exclude from the list
}

const MindMapSelector: React.FC<MindMapSelectorProps> = ({
  searchTerm,
  setSearchTerm,
  sortBy,
  setSortBy,
  showCreateForm,
  setShowCreateForm,
  newMapTitle,
  setNewMapTitle,
  onSelectMindMap,
  onCreateMindMap,
  onCancelCreate,
  isAIConversation = false,
  onClose,
  title = "Choose a mindmap",
  mode = 'inline',
  excludeMapId
}) => {
  const { maps } = useMindMapStore()
  const { user } = useAuthStore()

  // Maps are fetched by parent components (MindMap.tsx, Chat.tsx, etc.)
  // MindMapSelector just uses what's already in the store to avoid duplicate API calls

  // Filter and sort mindmaps based on search term and sort option
  const filteredMaps = useMemo(() => {
    let filtered = maps.filter(map => 
      map.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (excludeMapId ? map.id !== excludeMapId : true) // Only exclude if excludeMapId is provided
    )

    return filtered.sort((a, b) => {
      if (sortBy === 'alphabetical') {
        return a.title.localeCompare(b.title)
      } else {
        // Sort by lastEdited (most recent first)
        const aDate = new Date(a.updatedAt || a.createdAt || 0)
        const bDate = new Date(b.updatedAt || b.createdAt || 0)
        return bDate.getTime() - aDate.getTime()
      }
    })
  }, [maps, searchTerm, excludeMapId, sortBy])

  // Highlight search matches in text
  const highlightSearchTerm = (text: string, searchTerm: string) => {
    if (!searchTerm.trim()) return text
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <span key={index} className="bg-sky-400/30 text-sky-200 rounded px-0.5">
          {part}
        </span>
      ) : part
    )
  }

  const handleCreateMindMapAccept = () => {
    if (!newMapTitle.trim() || newMapTitle.length > 25) {
      return;
    }
    
    // Create the mindmap using the mindMapStore
    const { addMap } = useMindMapStore.getState();
    const userId = user?.id;
    
    if (userId) {
      const newMapId = addMap(newMapTitle.trim(), userId);
      console.log("Created mindmap with ID:", newMapId, "and title:", newMapTitle.trim());
      
      // Select the newly created mindmap
      onSelectMindMap(newMapId);
    } else {
      console.error("No user ID available for creating mindmap");
    }
    
    onCreateMindMap()
    onClose()
  }
  const handleCreateMindMapReject = () => {
    onCancelCreate()
  }
    // Determine container classes based on mode
  const containerClasses = mode === 'overlay' 
    ? "absolute bottom-12 left-0 z-50 w-80 bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden mindmap-selector"
    : "w-full bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden mindmap-selector"
  
  return (
    <div className={containerClasses}>      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-all duration-200"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        {/* Search and Sort Controls */}
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search mindmaps..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-800/50 border border-slate-600/50 rounded-xl text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200"
            />
          </div>
          <button
            type="button"
            onClick={() => setSortBy(sortBy === 'alphabetical' ? 'lastEdited' : 'alphabetical')}
            className="p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 border border-slate-600/50 hover:border-slate-500/50 text-slate-300 hover:text-slate-200 transition-all duration-200"
            title={sortBy === 'alphabetical' ? 'Sorted alphabetically - click for last edited' : 'Sorted by last edited - click for alphabetical'}
          >
            {sortBy === 'alphabetical' ? (
              <ArrowDownAZ className="h-4 w-4" />
            ) : (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </button>
        </div>
        
        {showCreateForm ? (
          <div className="border-b border-slate-700/50 mb-4 pb-4">
            <div className="flex flex-col gap-3">
              <input
                type="text"
                value={newMapTitle}
                onChange={(e) => setNewMapTitle(e.target.value)}
                placeholder="Enter mindmap title..."
                maxLength={25}
                className="w-full px-3 py-2.5 text-sm bg-slate-800/50 border border-slate-600/50 rounded-xl text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreateMindMapAccept()
                  } else if (e.key === "Escape") {
                    handleCreateMindMapReject()
                  }
                }}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCreateMindMapAccept}
                  disabled={!newMapTitle.trim() || newMapTitle.length > 25}
                  className="flex-1 px-3 py-2 text-sm bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:from-slate-600 disabled:to-slate-700 disabled:opacity-50 text-white rounded-xl transition-all duration-200 font-medium"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={handleCreateMindMapReject}
                  className="flex-1 px-3 py-2 text-sm bg-slate-700/50 hover:bg-slate-600/50 text-slate-200 rounded-xl transition-all duration-200 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Create new mindmap option - only for AI conversations */}
            {isAIConversation && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="w-full flex items-center gap-3 p-3 text-sm text-purple-400 hover:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 rounded-xl transition-all duration-200 mb-3 border border-purple-500/20 hover:border-purple-500/30"
              >
                <PlusCircle className="h-4 w-4" />
                <span className="font-medium">Create new mindmap</span>
              </button>
            )}
          </>
        )}
        
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {filteredMaps.length > 0 ? (
            filteredMaps.map((map) => (
              <button
                key={map.id}
                onClick={() => {
                  onSelectMindMap(map.id)
                  onClose()
                }}
                className="w-full flex items-center gap-3 p-3 text-sm text-slate-200 hover:text-slate-100 bg-slate-800/30 hover:bg-slate-700/50 rounded-xl transition-all duration-200 text-left border border-slate-700/30 hover:border-slate-600/50"
              >
                {map.visibility === 'public' ? (
                  <Eye className="h-4 w-4 text-slate-400 flex-shrink-0" />
                ) : map.visibility === 'linkOnly' ? (
                  <Link className="h-4 w-4 text-slate-400 flex-shrink-0" />
                ) : (
                  <EyeOff className="h-4 w-4 text-slate-400 flex-shrink-0" />
                )}
                <span className="flex-1 truncate font-medium">
                  {highlightSearchTerm(map.title, searchTerm)}
                </span>
                <span className="text-xs text-slate-500 whitespace-nowrap">
                  {new Date(map.updatedAt || map.createdAt || 0).toLocaleDateString()}
                </span>
              </button>
            ))
          ) : searchTerm.trim() ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
              <Search className="h-10 w-10 mb-3 opacity-50" />
              <p className="text-sm font-medium">No mindmaps found</p>
              <p className="text-xs mt-1 opacity-75">Try a different search term</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
              <Network className="h-10 w-10 mb-3 opacity-50" />
              <p className="text-sm font-medium">No mindmaps yet</p>
              <p className="text-xs mt-1 opacity-75">Create your first mindmap to share it</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MindMapSelector
