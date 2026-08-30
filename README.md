# mltydesigns.com

[![GitHub license](https://img.shields.io/github/license/meagantroot/mltydesigns.com)](https://github.com)

This is the Jekyll source for [mltydesigns.com](https://mltydesigns.com), including the browser-based pool scoring app.

## Local development

Prerequisites:

- Ruby 3.3.0
- Bundler 2.5.3
- Node.js 22 (for the pool app regression tests)

Install the locked dependencies:

```bash
bundle install
```

Start the local Jekyll server:

```bash
bundle exec jekyll serve
```

Open the site at `http://127.0.0.1:4000` or the pool app at `http://127.0.0.1:4000/pool`.

Run a strict local build check:

```bash
bundle exec jekyll build --strict_front_matter
```

Run the pool storage and backup regression tests:

```bash
node --test tests/*.test.js
```

## Pool data storage

Pool match data remains in the browser's `localStorage`. The app stores the active match and match history in one versioned dataset, verifies writes before replacing the current copy, and retains a previous verified copy for recovery. Existing legacy browser data and schema-v1 backup files are upgraded automatically when read.

Backup imports offer two modes: **Merge** adds non-duplicate matches and preserves conflicting records, while **Overwrite** replaces the device's active match and history after validation and confirmation.

Stored player profiles keep a canonical player name and separate skill levels for each game mode. Mapping a historical player name assigns the stable `playerId` and updates those match entries to the profile's canonical name, allowing history and statistics to consistently combine explicitly mapped variants.

GitHub Pages remains responsible for publishing the site. The workflow in `.github/workflows/build.yml` runs the pool regression tests and the equivalent production build with GitHub's read-only metadata token; it verifies pull requests and pushes to `main` but does not deploy separately.


### Hi there! I'm Meagan Truglio,

A Sysadmin and Web Developer passionate about Gardening and Pool.

- 🌱 I’m currently growing 14 different varieties of chilli peppers
- ⚡ **Fun fact:** In the Summer of 2025 I won MVP in APA pool league. 
- 💬 Talk to me about coding projects, Linux, Colabs or if you're hiring!
- ✉️ **Email Me:** contact@mltydesigns.com

<hr>
<p align="center">
   <i>Let's Connect and Build Something Together</i>
   <br>
<br>
<a target="_blank" rel="noopener noreferrer" href="https://mltydesigns.com/"><img src="https://img.shields.io/badge/-WEB-FF4088?style=for-the-badge&logoColor=white"></img></a>	
<a target="_blank" rel="noopener noreferrer" href="https://www.linkedin.com/in/meagantruglio/"><img src="https://img.shields.io/badge/-LinkedIn-0077B5?style=for-the-badge&logo=Linkedin&logoColor=white"></img></a>
</p>
