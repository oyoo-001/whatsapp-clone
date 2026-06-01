import React from 'react';

const ForceUpdateModal = ({ updateUrl }) => {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-2xl dark:bg-gray-800">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-blue-100 p-4 dark:bg-blue-900/30">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </div>
        </div>

        <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">Update Required</h2>
        <p className="mb-8 text-gray-600 dark:text-gray-400">
          A new version of TuChat is available. To continue using the app, please update to the latest version.
        </p>

        <a
          href={updateUrl || "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full rounded-xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white transition-all hover:bg-blue-700 active:scale-95"
        >
          Update Now
        </a>

        <p className="mt-4 text-xs text-gray-400">
          Current version is no longer supported.
        </p>
      </div>
    </div>
  );
};

export default ForceUpdateModal;
