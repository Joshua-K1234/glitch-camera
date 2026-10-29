# Contributing to Glitch Camera

Thanks for helping make this little studio more interesting. Code, documentation, design, accessibility reviews, and bug reports are all welcome.

## Get started

1. Fork the repository and clone your fork.
2. Use Node.js 20 or later and run `npm run dev`. No dependencies to install.
3. Make a branch for your change: `git switch -c your-change`.
4. Run `npm test` and `node --check dist/app.js`.
5. Try your change in a browser, including the built-in demo. For layout changes, check a narrow mobile viewport too.
6. Open a pull request explaining the problem, what changed, and how you checked it. Screenshots help for visual changes.

Look for `good first issue` and `help wanted` labels. Leave a comment if you want to work on an issue so others can coordinate. For a large feature, propose it in an issue before doing a lot of implementation work.

## Add an effect

Effects live in `dist/effects/index.js`. Add a renderer and a registry entry:

```js
function myEffect(frame, { intensity, time }) {
  const { width, height, data } = frame;
  const output = new Uint8ClampedArray(data);
  // Edit output's red, green, and blue channels here.
  // Preserve alpha and do not modify data.
  return { width, height, data: output };
}

// Add to the exported effects array:
{ id: 'my-effect', name: 'My effect', tag: 'A short caption',
  description: 'What this effect looks like.', color: '#c4f36b',
  render: myEffect }
```

`intensity` ranges from 0 to 1; `time` is seconds. `applyEffect` handles zero intensity before calling the renderer. Input may be browser `ImageData`, whose properties are not enumerable: read `width`, `height`, and `data` explicitly instead of spreading the object. Use the helper `copy(frame)` when convenient.

The existing tests automatically cover registry entries for output dimensions, input immutability, alpha preservation, zero intensity, and a one-pixel image. Add a focused test for behavior unique to your effect. A new effect should visibly change the colored fixture in the existing test suite.

## Keep contributions easy to review

- Prefer a small change that solves one problem.
- Keep the app usable without camera permission and without a network connection after loading.
- Do not introduce uploads, telemetry, remote fonts, or paid API requirements.
- Keep keyboard access, text labels, and reduced-motion behavior intact.
- Use the demo or a generated sample in screenshots; do not share someone else's camera feed.

## Community

Be kind, assume good intent, and give specific feedback about the work. Harassment and discriminatory behavior are not welcome. Keep bug reports and pull requests focused on the project.

By contributing, you agree to license your contribution under this project's MIT license.
