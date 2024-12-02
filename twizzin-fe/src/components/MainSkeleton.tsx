'use client';

export const MainSkeleton = () => {
  return (
    <div className='min-h-screen flex flex-col'>
      {/* Header Skeleton */}
      <div className='w-full flex justify-between items-center p-4'>
        {/* Logo placeholder */}
        <div className='flex items-center gap-2'>
          <div className='h-8 w-8 bg-gray animate-pulse rounded-full' />
          <div className='h-6 w-24 bg-gray animate-pulse rounded hidden md:block' />
        </div>
        {/* Buttons placeholder */}
        <div className='flex items-center gap-2'>
          <div className='h-8 w-8 bg-gray animate-pulse rounded-full' />
          <div className='h-8 w-8 bg-gray animate-pulse rounded-full' />
          <div className='h-8 w-24 bg-gray animate-pulse rounded' />
        </div>
      </div>

      {/* Content Skeleton */}
      <div className='flex-grow flex justify-center items-center p-4'>
        <div className='w-full max-w-[520px] flex flex-col gap-4'>
          {/* Connect wallet button placeholder */}
          <div className='h-12 bg-gray animate-pulse rounded-lg w-full' />

          {/* Carousel placeholder */}
          <div className='h-64 bg-gray animate-pulse rounded-lg w-full' />

          {/* Dots placeholder */}
          <div className='flex gap-2 justify-center'>
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className='h-2 w-2 bg-gray animate-pulse rounded-full'
              />
            ))}
          </div>

          {/* Buttons placeholder */}
          <div className='h-12 bg-gray animate-pulse rounded-lg w-full' />
          <div className='h-12 bg-gray animate-pulse rounded-lg w-full' />
        </div>
      </div>
    </div>
  );
};
