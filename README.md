# CRG

Prototypes for Reporting Content-Referenced Growth Visualizations.

This fractions prototype explores student and classroom status and growth through a learning progression. It includes four student histories, three demonstration classrooms, concept descriptions, exemplar tasks, and follow-up activities.

## View the prototype

Once GitHub Pages is enabled: https://DerekCBriggs.github.io/CRG/

To run offline, download this repository as a ZIP, extract it, and open `index.html` in a browser. No installation or build step is required.

## Publish with GitHub Pages

In Settings → Pages, choose **Deploy from a branch**, select **main** and **/ (root)**, then Save. GitHub publishes the static files and updates the site after subsequent commits.

## Data and interpretation

The demonstration data reproduce the supplied local reporting prototype. Sandy's latest score is 511. The four named student histories and classroom initials are separate demonstration datasets.

Reference scores are 419, 450, 467 and 498. Optional classroom uncertainty bars illustrate ±6 points; they are not student-specific confidence intervals. The Grade 4 reference band is 465–526. Reference locations support inquiry about student thinking, rather than definitive mastery classifications.

Research: https://doi.org/10.1080/10627197.2025.2503288

## Files

- `index.html`, `style.css`, `app.js`: interface and interactions.
- `data.js`, `data.json`: demonstration data.
- `assets/`: twenty teaching images.

The site uses relative asset paths and has no server, database, external scripts, or remote fonts.
