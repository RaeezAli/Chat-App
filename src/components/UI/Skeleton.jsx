import React from 'react';

const Skeleton = ({ className = '', variant = 'rect' }) => {
  const baseClasses = "animate-pulse bg-gray-200 dark:bg-gray-800";
  const variantClasses = {
    circle: "rounded-full",
    rect: "rounded-lg",
    text: "rounded h-3 w-full"
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant] || variantClasses.rect} ${className}`} />
  );
};

export const GroupListItemSkeleton = () => (
  <div className="p-3 flex items-center space-x-3">
    <Skeleton variant="rect" className="w-10 h-10 rounded-xl flex-shrink-0" />
    <div className="flex-grow min-w-0 space-y-2">
      <Skeleton variant="text" className="w-24" />
      <Skeleton variant="text" className="w-full opacity-50" />
    </div>
  </div>
);

export const MessageItemSkeleton = ({ isOwn }) => (
  <div className={`flex w-full mb-4 ${isOwn ? 'justify-end' : 'justify-start'} items-end space-x-2`}>
    {!isOwn && <Skeleton variant="circle" className="w-8 h-8 flex-shrink-0" />}
    <div className={`p-4 rounded-2xl w-2/3 max-w-[300px] space-y-2 ${isOwn ? 'bg-indigo-100/50 dark:bg-indigo-900/20 rounded-tr-none' : 'bg-white dark:bg-gray-800 rounded-tl-none border border-gray-100 dark:border-gray-700'}`}>
      {!isOwn && <Skeleton variant="text" className="w-16 opacity-30 h-2" />}
      <Skeleton variant="text" className="w-full" />
      <Skeleton variant="text" className="w-5/6" />
      <div className="flex justify-end mt-1">
        <Skeleton variant="text" className="w-8 h-2 opacity-50" />
      </div>
    </div>
  </div>
);

export default Skeleton;
