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

        // Measured 100/100/100 on all three pages once the brass contrast and
        // the logo's accessible name were fixed, so the floor sits just under
        // that rather than at the placeholder 0.9 it started from.
        'categories:accessibility': ['error', { minScore: 0.98 }],
        'categories:best-practices': ['error', { minScore: 0.98 }],
        'categories:seo': ['error', { minScore: 0.98 }],

        // Advisory: moves with network timing and third-party fonts in CI.
        // Measured 95-99; the local preview serves no gzip, which costs a few
        // points that production does not.
        'categories:performance': ['warn', { minScore: 0.9 }],

        // The canonical deliberately points at envoiddesign.in, the domain this
        // site moves to, so Lighthouse sees a cross-domain canonical and fails
        // the audit. Re-enable this at cutover, when it becomes self-referencing.
        canonical: 'off',

        // Cache headers belong to GitHub Pages and Cloudflare, not to this repo.
        'uses-long-cache-ttl': 'off',
        // Likewise CSP: Pages serves no custom headers.
        'csp-xss': 'off',
        // Advisory now that every photo has 600/1200/native variants behind a
        // <picture>: worth seeing if a new image lands without them.
        'uses-responsive-images': 'warn',

        'errors-in-console': 'warn',
      },
    },

    upload: {
      target: 'filesystem',
      outputDir: '.lighthouseci',
    },
  },
};
