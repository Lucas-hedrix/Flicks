export const DownloadService = {
  startDownload: async (
    _type: 'movie' | 'tv',
    _id: number,
    title: string,
    _season?: number,
    _episode?: number
  ) => {
    // DLHub uses a POST request for their search engine. To pre-fill the search
    // automatically, we have to create a hidden form and submit it.
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = 'https://dlhub.cc/search';
    form.target = '_blank'; // Open in new tab
    
    const inputQ = document.createElement('input');
    inputQ.type = 'hidden';
    inputQ.name = 'q';
    inputQ.value = title;
    
    const inputSource = document.createElement('input');
    inputSource.type = 'hidden';
    inputSource.name = 'source';
    inputSource.value = _type === 'tv' ? 'series' : 'movies';

    form.appendChild(inputQ);
    form.appendChild(inputSource);
    document.body.appendChild(form);
    
    form.submit();
    
    // Cleanup
    document.body.removeChild(form);
  },
};

