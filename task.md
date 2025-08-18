# Mindmap Data Migration Guide for Client Code

## 1. Collaborators Update
### Old Columns to Replace: `mindmaps.collaborators` (JSONB)

**New Table: `mindmap_collaborations`**
Columns:
- `id`: UUID (primary key)
- `mindmap_id`: UUID
- `collaborator_id`: UUID (user being invited)
- `inviter_id`: UUID (user who invited)
- `status`: TEXT (enum: 'pending', 'accepted', 'rejected')
- `created_at`: Timestamp
- `updated_at`: Timestamp

**Required Changes**:
- Replace direct array/JSONB access with database queries
- Use `mindmap_collaborations` for all collaboration operations
- Handle collaboration status explicitly

## 2. Likes Update
### Old Columns to Replace: `mindmaps.liked_by` (UUID array)

**New Tables**:
- `mindmap_likes`: Individual likes
  - `mindmap_id`: UUID
  - `user_id`: UUID
  - `created_at`: Timestamp

- `mindmap_like_counts`: Aggregated like counts
  - `mindmap_id`: UUID (primary key)
  - `like_count`: Integer

**Required Changes**:
- Replace like checking via array with database queries
- Use separate tables for individual likes and total count
- Remove `likes` column from `mindmaps`

## 3. Saves Update
### Old Columns to Replace: 
- `mindmaps.saved_by` (UUID array)
- `profiles.saves` (text array)

**New Tables**:
- `mindmap_saves`: Individual saves
  - `mindmap_id`: UUID
  - `user_id`: UUID
  - `created_at`: Timestamp

- `mindmap_save_counts`: Aggregated save counts
  - `mindmap_id`: UUID (primary key)
  - `save_count`: Integer

**Required Changes**:
- Remove `saved_by` from `mindmaps`
- Remove `saves` from `profiles`
- Use database queries to check and count saves
- Track saves via dedicated `mindmap_saves` table


## Client-Side Query Pattern examples (TypeScript/Supabase)
```typescript
// Fetch collaborators
const { data: collaborations } = await supabase
  .from('mindmap_collaborations')
  .select('collaborator_id, status')
  .eq('mindmap_id', mindmapId)

// Add collaborator
await supabase
  .from('mindmap_collaborations')
  .insert({
    mindmap_id: mindmapId,
    collaborator_id: newUserId,
    inviter_id: currentUserId,
    status: 'pending'
  })



  // Check if user liked
const { data: userLike } = await supabase
  .from('mindmap_likes')
  .select()
  .eq('mindmap_id', mindmapId)
  .eq('user_id', currentUserId)
  .single()

// Get total likes
const { data: likeCount } = await supabase
  .from('mindmap_like_counts')
  .select('like_count')
  .eq('mindmap_id', mindmapId)
  .single()

// Add like
await supabase
  .from('mindmap_likes')
  .insert({
    mindmap_id: mindmapId,
    user_id: currentUserId
  })



// Check if user saved
const { data: userSave } = await supabase
  .from('mindmap_saves')
  .select()
  .eq('mindmap_id', mindmapId)
  .eq('user_id', currentUserId)
  .single()

// Get total saves
const { data: saveCount } = await supabase
  .from('mindmap_save_counts')
  .select('save_count')
  .eq('mindmap_id', mindmapId)
  .single()

// Add save
await supabase
  .from('mindmap_saves')
  .insert({
    mindmap_id: mindmapId,
    user_id: currentUserId
  })