# 📝 TODO FIXES

## 1. ✅ Comments - Working
Backend: `/api/interactions/beats/:id/comments` ✅
Frontend: `handleAddComment()` in BeatDetailsScreen ✅

## 2. ⏳ Producer Statistics
Need to add charts/stats for producers on:
- BeatDetailsScreen (for own beats)
- ProfileScreen (producer dashboard)
- MyBeatsScreen

## 3. ⏳ Edit Beat
Backend: `/api/beats/:id` PUT ✅
Frontend: EditBeatScreen exists ✅
Issue: Probably beat.id undefined

## 4. ⏳ Role System
Current roles: `user`, `manager`
Need: `user`, `producer`, `manager`

"Become Producer" button → adds `producer` role to user
