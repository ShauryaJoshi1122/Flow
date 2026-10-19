// FlowVeo Model Selector & Generation Interceptor
// Injects the 4 Veo 3.1 model tiers into Google Labs Flow UI

(function() {
  const MODEL_TIERS = [
    {
      id: 'veo-3.1-quality',
      name: 'Veo 3.1 - Quality',
      credits: 150,
      priority: 'High Priority',
      badgeClass: 'badge-quality',
      desc: 'Maximum fidelity & temporal detail'
    },
    {
      id: 'veo-3.1-fast',
      name: 'Veo 3.1 - Fast',
      credits: 75,
      priority: 'Standard Priority',
      badgeClass: 'badge-fast',
      desc: 'Rapid render pipeline (~15s)'
    },
    {
      id: 'veo-3.1-lite',
      name: 'Veo 3.1 - Lite (Lower Priority)',
      credits: 40,
      priority: 'Lower Priority',
      badgeClass: 'badge-lite',
      desc: 'Resource-efficient queue'
    },
    {
      id: 'veo-3.1-ultra-lite',
      name: 'Veo 3.1 - Ultra Lite',
      credits: 25,
      priority: 'Eco Variant',
      badgeClass: 'badge-eco',
      desc: 'Maximum credit conservation'
    }
  ];

  let selectedModelId = 'veo-3.1-fast';

  function injectModelSelector() {
    if (document.getElementById('flowveo-model-selector-panel')) return;

    // Search for Google Labs Flow prompt input / settings container
    const promptContainers = document.querySelectorAll('form, textarea, [role="main"], [data-test-id*="prompt"], [aria-label*="Prompt"], div:has(textarea)');
    if (promptContainers.length === 0) return;

    const panel = document.createElement('div');
    panel.id = 'flowveo-model-selector-panel';
    panel.style.cssText = `
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 12px;
      padding: 14px;
      margin: 12px 0;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #e2e8f0;
      z-index: 1000;
    `;

    panel.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="background: #3b82f6; width: 8px; height: 8px; border-radius: 50%;"></span>
          <strong style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8;">FlowVeo Engine</strong>
        </div>
        <span style="font-size: 11px; background: #1e293b; padding: 2px 8px; border-radius: 6px; color: #38bdf8;">Veo 3.1 Architecture</span>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 8px;" id="flowveo-tier-grid">
        ${MODEL_TIERS.map(tier => `
          <div class="flowveo-tier-card" data-tier="${tier.id}" style="
            background: ${tier.id === selectedModelId ? '#1e293b' : '#0b1120'};
            border: 1.5px solid ${tier.id === selectedModelId ? '#3b82f6' : '#1e293b'};
            border-radius: 8px;
            padding: 10px;
            cursor: pointer;
            transition: all 0.2s ease;
          ">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
              <span style="font-weight: 600; font-size: 13px; color: ${tier.id === selectedModelId ? '#ffffff' : '#cbd5e1'};">${tier.name}</span>
              <span style="font-size: 10px; font-weight: 700; background: ${tier.id === selectedModelId ? '#2563eb' : '#334155'}; color: white; padding: 1px 6px; border-radius: 4px;">
                ${tier.credits} cr
              </span>
            </div>
            <div style="font-size: 11px; color: #94a3b8;">${tier.desc}</div>
            <div style="font-size: 10px; color: #64748b; margin-top: 4px; font-style: italic;">${tier.priority}</div>
          </div>
        `).join('')}
      </div>
    `;

    // Add click listeners to cards
    const cards = panel.querySelectorAll('.flowveo-tier-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        selectedModelId = card.getAttribute('data-tier');
        cards.forEach(c => {
          const isSelected = c.getAttribute('data-tier') === selectedModelId;
          c.style.background = isSelected ? '#1e293b' : '#0b1120';
          c.style.borderColor = isSelected ? '#3b82f6' : '#1e293b';
          const title = c.querySelector('span');
          if (title) title.style.color = isSelected ? '#ffffff' : '#cbd5e1';
        });
        console.log('[FlowVeo] Selected model tier:', selectedModelId);
      });
    });

    // Insert above prompt input or first container
    const target = promptContainers[0];
    if (target.parentNode) {
      target.parentNode.insertBefore(panel, target);
    }
  }

  // Hook generation triggers to verify virtual credits
  function hookGenerationButtons() {
    const buttons = document.querySelectorAll('button');
    buttons.forEach(btn => {
      const text = btn.innerText?.toLowerCase() || '';
      const isGenerate = (text.includes('generate') || text.includes('create') || text.includes('render')) && !btn.dataset.flowveoHooked;

      if (isGenerate) {
        btn.dataset.flowveoHooked = 'true';
        btn.addEventListener('click', async (e) => {
          // Intercept generation to deduct credits
          const promptInput = document.querySelector('textarea, input[type="text"]');
          const prompt = promptInput?.value || 'Video generation';

          try {
            const response = await new Promise((resolve) => {
              chrome.runtime.sendMessage({
                type: 'VERIFY_AND_DEDUCT_CREDITS',
                modelTier: selectedModelId,
                prompt
              }, resolve);
            });

            if (!response || !response.success) {
              e.preventDefault();
              e.stopPropagation();
              alert(`[FlowVeo Alert] ${response?.error || 'Insufficient virtual credits. Please top up your package in the FlowVeo Dashboard.'}`);
              return false;
            }

            console.log('[FlowVeo] Generation authorized. Remaining balance:', response.remainingUserBalance);
          } catch (err) {
            console.warn('[FlowVeo] Error validating credits:', err);
          }
        }, true);
      }
    });
  }

  // Observe UI changes
  const observer = new MutationObserver(() => {
    injectModelSelector();
    hookGenerationButtons();
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Initial attempt
  setTimeout(() => {
    injectModelSelector();
    hookGenerationButtons();
  }, 1000);
})();
