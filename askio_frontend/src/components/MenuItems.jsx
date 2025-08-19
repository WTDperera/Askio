import React from 'react';
import { menuItemsData } from '../assets/assets';
import { NavLink } from 'react-router-dom';

const MenuItems = ({ setSidebarOpen }) => {
  return (
    <div className="px-6 text-gray-600 space-y-1 font-medium">
      {menuItemsData.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/feed'}
          onClick={() => setSidebarOpen?.(false)}
          className={({ isActive }) =>
            `px-3 py-2 flex items-center gap-3 rounded-xl ${
              isActive ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50'
            }`
          }
        >
          {Icon && <Icon className="w-5 h-5" aria-hidden="true" />}
          <span>{label}</span>
        </NavLink>
      ))}
    </div>
  );
};

export default MenuItems;