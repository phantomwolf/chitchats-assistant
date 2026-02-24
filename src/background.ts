// background.ts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'DOWNLOAD_FILE') {
        chrome.downloads.download({
            url: message.url,
            filename: message.filename,
            saveAs: false,
            conflictAction: 'overwrite',
        }, (downloadId) => {
            // Monitor the download status
            const checkStatus = (delta: chrome.downloads.DownloadDelta) => {
                if (delta.id === downloadId && delta.state?.current === 'complete') {
                    console.log(`Download ${downloadId} finished!`);
                    chrome.downloads.onChanged.removeListener(checkStatus);
                }
            };
            chrome.downloads.onChanged.addListener(checkStatus);
        });
    }
});