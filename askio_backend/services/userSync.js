import User from '../models/User.js';
import { clerkClient } from '@clerk/clerk-sdk-node';

// Ensure local User document exists & core profile fields are refreshed from Clerk.
export async function syncUser(clerkUserId) {
  if (!clerkUserId) return null;
  let existing = await User.findOne({ clerkId: clerkUserId });
  try {
    const u = await clerkClient.users.getUser(clerkUserId);
    const full_name = u.fullName || [u.firstName, u.lastName].filter(Boolean).join(' ');
    const username = u.username || (u.primaryEmailAddress?.emailAddress?.split('@')[0]);
    const email = u.primaryEmailAddress?.emailAddress;
    const profile_picture = u.imageUrl;
    if (existing) {
      const updates = {};
      if (full_name && full_name !== existing.full_name) updates.full_name = full_name;
      if (username && username !== existing.username) updates.username = username;
      if (email && email !== existing.email) updates.email = email;
      if (profile_picture && profile_picture !== existing.profile_picture) updates.profile_picture = profile_picture;
      if (Object.keys(updates).length) {
        existing.set(updates);
        await existing.save();
      }
      return existing;
    }
    return await User.create({ clerkId: clerkUserId, full_name, username, email, profile_picture, followers: [], following: [] });
  } catch (e) {
    if (existing) return existing; // fallback: return stale record
    return await User.create({ clerkId: clerkUserId });
  }
}

// Fetch multiple users by clerk ids returning a map for quick lookup.
export async function ensureUsersLoaded(ids) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return {};
  const users = await User.find({ clerkId: { $in: unique } }).lean();
  const map = {};
  users.forEach(u => { map[u.clerkId] = u; });
  return map;
}
