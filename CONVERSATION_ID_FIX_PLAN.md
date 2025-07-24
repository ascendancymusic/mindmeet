# Conversation ID Switching Bug Fix Plan

## Root Cause Analysis
The app is using local incremental IDs (1, 2, 3...) alongside Supabase UUIDs, causing:
1. Race conditions when conversations are reordered
2. Incorrect conversation switching when data loads
3. Inconsistent state management between local and remote data

## Core Problems Identified

### 1. Mixed ID System
- `activeConversationId: number | null` uses local IDs
- `conversation.supabaseId: string` uses Supabase UUIDs  
- Real-time updates use Supabase UUIDs but local state uses numbers

### 2. Conversation Selection Logic
- `setActiveConversation(id: number)` finds by local ID
- URL navigation uses Supabase UUID
- Real-time updates match by Supabase UUID but update by local ID

### 3. Data Synchronization Issues
- `fetchConversations()` creates new local IDs even for existing conversations
- Conversation order changes affect local ID mapping
- No stable identifier for conversation matching

## Critical Fix Strategy

### Phase 1: Update Primary Identifier Usage
1. Change `activeConversationId` to use Supabase UUID strings
2. Update `setActiveConversation` to work with UUIDs
3. Modify conversation selection logic throughout the app

### Phase 2: Fix Conversation Management
1. Use Supabase UUID as primary key for conversations
2. Remove local ID generation for existing conversations
3. Ensure consistent UUID usage in real-time updates

### Phase 3: Update UI Components
1. Update Chat.tsx to use UUID-based selection
2. Fix conversation list rendering
3. Ensure URL navigation consistency

## Implementation Priority
1. **HIGH**: Core store functions (setActiveConversation, etc.)
2. **HIGH**: Real-time update handlers
3. **MEDIUM**: UI components and navigation
4. **LOW**: Optimization and cleanup
