import React from 'react'; // Loading: reusable centered spinner

const Loading = ({ height = '100vh' }) => { // height can be overridden per context
  return (
    <div style={{ height }} className="flex items-center justify-center">
      <div className="w-10 h-10 rounded-full border-4 border-indigo-300 border-t-transparent animate-spin" aria-label="Loading" />
    </div>
  );
};

export default Loading;