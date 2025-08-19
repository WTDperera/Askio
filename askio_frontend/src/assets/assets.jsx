import logo from './logo.svg';
import sample_cover from './sample_cover.jpg';
import sample_profile from './sample_profile.jpg';
import bgImage from './bgImage.png';
import group_users from './group_users.png';
import { Home, MessageCircle, Search, User, Users } from 'lucide-react';
import sponsored_img from './sponsored_img.png';

// Exported static asset references
export const assets = { logo, sample_cover, sample_profile, bgImage, group_users, sponsored_img };

// Navigation items
export const menuItemsData = [
  { to: '/feed', label: 'Feed', Icon: Home },
  { to: '/messages', label: 'Messages', Icon: MessageCircle },
  { to: '/connections', label: 'Connections', Icon: Users },
  { to: '/discover', label: 'Discover', Icon: Search },
  { to: '/profile', label: 'Profile', Icon: User }
];

