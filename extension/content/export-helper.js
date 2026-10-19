// FlowVeo Direct Video Exporter
// Injects multi-resolution direct export menu (270p, 720p, 1080p) on generated videos

(function() {
  function injectExportControls() {
    const videoElements = document.querySelectorAll('video, [data-test-id*="video-card"], div:has(> video)');
    
    videoElements.forEach((videoCard, idx) => {
      if (videoCard.dataset.flowveoExportInjected) return;
      videoCard.dataset.flowveoExportInjected = 'true';

      const exportContainer = document.createElement('div');
      exportContainer.className = 'flowveo-direct-export-bar';
      exportContainer.style.cssText = `
        display: flex;
        align-items: center;
        gap: 6px;
        background: rgba(15, 23, 42, 0.9);
        backdrop-filter: blur(8px);
        padding: 6px 10px;
        border-radius: 8px;
        border: 1px solid rgba(59, 130, 246, 0.3);
        margin-top: 6px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 11px;
        width: fit-content;
        z-index: 50;
      `;

      exportContainer.innerHTML = `
        <span style="color: #94a3b8; font-weight: 600; margin-right: 4px; display: flex; align-items: center; gap: 4px;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          Export:
        </span>
        <button class="flowveo-export-btn" data-res="270p" style="background: #1e293b; color: #38bdf8; border: 1px solid #334155; padding: 3px 8px; border-radius: 4px; cursor: pointer; font-weight: 600;">270p</button>
        <button class="flowveo-export-btn" data-res="720p" style="background: #1e293b; color: #60a5fa; border: 1px solid #334155; padding: 3px 8px; border-radius: 4px; cursor: pointer; font-weight: 600;">720p HD</button>
        <button class="flowveo-export-btn" data-res="1080p" style="background: #2563eb; color: #ffffff; border: none; padding: 3px 8px; border-radius: 4px; cursor: pointer; font-weight: 600;">1080p FHD</button>
      `;

      // Handle download clicks
      const buttons = exportContainer.querySelectorAll('.flowveo-export-btn');
      buttons.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const resolution = btn.getAttribute('data-res');
          downloadVideo(videoCard, resolution);
        });
      });

      // Insert adjacent to video or video card container
      if (videoCard.nextSibling) {
        videoCard.parentNode.insertBefore(exportContainer, videoCard.nextSibling);
      } else {
        videoCard.parentNode.appendChild(exportContainer);
      }
    });
  }

  function downloadVideo(card, resolution) {
    const video = card.querySelector('video') || (card.tagName === 'VIDEO' ? card : null);
    let src = video?.currentSrc || video?.src;

    if (!src) {
      const source = card.querySelector('source');
      src = source?.src;
    }

    if (!src) {
      alert('Could not locate media stream for direct export. Please ensure the video has finished rendering.');
      return;
    }

    // Trigger download cleanly without showing underlying Google storage account
    const a = document.createElement('a');
    a.href = src;
    a.download = `flowveo_veo3.1_${resolution}_${Date.now()}.mp4`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    console.log(`[FlowVeo] Exported video at ${resolution}`);
  }

  // Observe newly rendered videos
  const observer = new MutationObserver(() => {
    injectExportControls();
  });

  observer.observe(document.body, { childList: true, subtree: true });

  setTimeout(injectExportControls, 2000);
})();
