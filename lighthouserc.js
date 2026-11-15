// Lighthouse CI budget. Runs in the `check` job against a local copy of the
// site served at the same path it lives on in production, so <base href> and
// every relative URL resolve exactly as they do once deployed.
//
// Gates are set to the floor we refuse to drop below, not to the current score.
// Tighten them as the real numbers settle; a gate that fails for a nit teaches
// people to ignore CI.
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'python3 -u -m http.server 8000 --directory _preview',
      startServerReadyPattern: 'Serving HTTP',
      url: [
        'http://localhost:8000/envoid-design-studio/',
        'http://localhost:8000/envoid-design-studio/projects.html',
        'http://localhost:8000/envoid-design-studio/contact.html',
      ],
      numberOfRuns: 1,
      settings: { preset: 'desktop' },
    },

    assert: {
      assertions: {
        // Hard gates: these audits are deterministic and a regression is a real defect.
        'document-title': 'error',
        'meta-description': 'error',
        'html-has-lang': 'error',
        'image-alt': 'error',
        'unsized-images': 'error',
        'is-crawlable': 'error',
        'http-status-code': 'error',
        viewport: 'error',
        'link-text': 'error',

        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],

        // Advisory: both move with network timing and third-party fonts in CI.
        'categories:seo': ['warn', { minScore: 0.9 }],
        'categories:performance': ['warn', { minScore: 0.85 }],

        // The canonical deliberately points at envoiddesign.in, the domain this
        // site moves to, so Lighthouse sees a cross-domain canonical and fails
        // the audit. Re-enable this at cutover, when it becomes self-referencing.
        canonical: 'off',

        // Cache headers belong to GitHub Pages and Cloudflare, not to this repo.
        'uses-long-cache-ttl': 'off',
        // Likewise CSP: Pages serves no custom headers.
        'csp-xss': 'off',
        // The renders are served at their native size by design; the gallery
        // sizes tiles to the picture rather than cropping to a layout box.
        'uses-responsive-images': 'off',

        'errors-in-console': 'warn',
      },
    },

    upload: {
      target: 'filesystem',
      outputDir: '.lighthouseci',
    },
  },
};
