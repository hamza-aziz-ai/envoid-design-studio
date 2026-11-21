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
        'http://localhost:8000/',
        'http://localhost:8000/projects/',
        'http://localhost:8000/contact/',
        // One of each new page type: the services hub and a service-area page
        // share a layout, so a regression in it shows up here.
        'http://localhost:8000/services/',
        'http://localhost:8000/architects-in-ghaziabad/',
        // The interactive tools carry the most accessibility risk on the site:
        // custom controls drawn in SVG. One of them is enough to gate both.
        'http://localhost:8000/room-planner/',
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

        // Self-referencing since the move to envoiddesign.in, so this audit is
        // meaningful again and a canonical pointing anywhere else is a defect.
        canonical: 'error',

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
