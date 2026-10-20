# companion-module-lumora-console

A [Bitfocus Companion](https://bitfocus.io/companion) module for [Lumora](https://github.com/typoirl/Lumora), the free lighting console. It talks to Lumora over OSC (UDP or TCP) and shows what the console is doing on your buttons: executor names, live cues, levels and lit keys, the masters, the encoder bar, the grand master and the command line.

See [companion/HELP.md](companion/HELP.md) for setting it up, and the actions, feedbacks, variables and presets it has.

## Needs

- Lumora a.7.2.013 or later (OSC, under Setup → Control).
- Companion 3.x or 4.x.

## Developing

```
npm install
npm test                 # OSC encoding, SLIP, feedback handling, definitions
npm run package          # lumora-console-<version>.tgz, to import into Companion
```

To try it in Companion before it's published, set Companion's *Developer modules path* to the folder holding this one (Settings → Advanced), or import the .tgz from `npm run package` (Modules → Import module package).

## License

MIT
