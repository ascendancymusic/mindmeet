# Remaining Color System Issues to Fix

Based on the grep search, the following hardcoded color values still exist in UserProfile.tsx:

## Blue Color Issues:
1. `text-blue-400 hover:text-blue-300` - username links (appears 4 times)
2. `group-hover:text-blue-300` - title hover states (appears 2 times)

## Slate Color Issues:
1. `text-slate-500 hover:text-slate-300` - menu buttons (appears 6+ times)
2. `bg-slate-800/95` - dropdown menus (appears 3+ times)
3. `text-slate-300` - menu text and avatar text (appears 10+ times)
4. `text-slate-400` - timestamp and meta text (appears 5+ times)
5. `ring-slate-600/30` - avatar rings (appears 3+ times)
6. `bg-gradient-to-br from-slate-600 to-slate-700` - avatar backgrounds (appears 3+ times)
7. `from-slate-900/20 to-transparent` - preview overlays (appears 3+ times)
8. Various other slate borders, backgrounds, and hover states

## Solution Strategy:
Since there are many duplicate instances across the three tabs (mindmaps, collaborations, saves), the most efficient approach would be to:

1. Create reusable components or patterns for:
   - Avatar display with proper color system
   - Menu dropdowns with proper color system  
   - Preview cards with proper color system
   - Username links with proper color system

2. Replace the remaining hardcoded values with the color system equivalents we've already defined.

The key pattern repetitions are in the map display cards that appear in all three tabs.
