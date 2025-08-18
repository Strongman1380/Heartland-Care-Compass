# Heartland Youth Compass

## Project info

A youth management platform for Heartland Boys Home.

## How can I edit this code?

There are several ways of editing your application.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

You can deploy this project using various hosting platforms like:

- Vercel
- Netlify
- GitHub Pages
- Or any static hosting service

## Deployment instructions

1. Build the project:
```sh
npm run build
```

2. The built files will be in the `dist` directory, which you can deploy to any static hosting service.

3. For local testing of the production build:
```sh
npx serve -s dist
```

## GitHub Pages Deployment

This project is a Vite React SPA. To deploy manually to GitHub Pages:

1. Build the project:
```sh
npm run predeploy
```
2. Commit and push the `dist` folder to a `gh-pages` branch (or use an action).
3. In GitHub repo settings, enable Pages and point it to the `gh-pages` branch root (or `/docs` if you move it there).

You can also use a GitHub Action for automatic deployment. Example workflow (add to `.github/workflows/deploy.yml`):
```yaml
name: Deploy
on:
	push:
		branches: [ main ]
permissions:
	contents: write
jobs:
	build-deploy:
		runs-on: ubuntu-latest
		steps:
			- uses: actions/checkout@v4
			- uses: actions/setup-node@v4
				with:
					node-version: 20
			- run: npm ci
			- run: npm run build
				env:
					GH_PAGES_BASE: '/' # or '/<repo-name>/' if using project pages
			- name: Deploy to gh-pages
				uses: peaceiris/actions-gh-pages@v3
				with:
					github_token: ${{ secrets.GITHUB_TOKEN }}
					publish_dir: dist
```

If using this repository project page (username.github.io/Heartland-Care-Compass), the base path is already set by scripts:
```sh
npm run deploy:gh
```
This builds with `GH_PAGES_BASE='/Heartland-Care-Compass/'`.

## Vercel Deployment

Vercel supports Vite out of the box:
1. Push the repo to GitHub.
2. Import the project in Vercel.
3. Framework preset: Vite.
4. Build Command: `npm run build`
5. Output Directory: `dist`

No special base path needed for Vercel; it serves from root.

## Environment Variables

Currently no runtime env vars are required. If you add any, configure them in Vercel dashboard or GitHub Actions secrets.

## SPA Routing on GitHub Pages

`404.html` is included to redirect all unknown routes back to `index.html` for client-side routing.
