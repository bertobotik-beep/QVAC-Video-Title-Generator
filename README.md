# QVAC Video Title Generator

Describe a video's content and an on-device AI writes 3-5 title options grounded in that description. No cloud call, no API key.

## Run

```bash
npm install
npm start
```

Then open http://localhost:31016

Requires Node.js >= 22.17 (see `engines` in `package.json`).

## QVAC SDK version

`@qvac/sdk` ^0.19.0 (see `package.json`).

## How it works

Built on [Tether's QVAC SDK](https://www.npmjs.com/package/@qvac/sdk) — all inference runs on-device, no cloud call, no API key.

1. `loadModel({ modelSrc: LLAMA_3_2_1B_INST_Q4_0 })` loads the model once at startup, before the HTTP server starts accepting requests.
2. Each `POST /api/videotitle` request calls `completion()` with a one-shot example baked into the chat history (a real user/assistant turn, not just prose instructions) and streams the reply token-by-token via `run.tokenStream`.
3. `unloadModel({ modelId })` releases the model on `SIGINT`/`SIGTERM`.

The response is passed through `generate()` in `src/videotitle.js`, which keeps only lines that actually match the requested numbered format (dropping any preamble sentence like "Here are 5 titles:"), strips numbering/quotes/markdown, drops anything that looks like a refusal or is over 120 characters, and de-duplicates. If fewer than 3 usable titles survive, a deterministic fallback (built directly from the description, no model involved) is returned instead.

### Example

Input:

> A 10-minute video where I take apart an old mechanical keyboard, clean every switch by hand, and put it back together to see if it feels better than new.

Output:

```
1. I Deep Cleaned My Old Mechanical Keyboard
2. Taking Apart & Cleaning Every Switch
3. Does Cleaning Old Switches Feel Better Than New?
4. Full Mechanical Keyboard Teardown & Clean
5. Restoring a Mechanical Keyboard, Switch by Switch
```

This exact pair is also the one-shot example baked into the prompt (see `EXAMPLE_INPUT`/`EXAMPLE_OUTPUT` in `src/videotitle.js`), and the code explicitly filters out any of these lines if the model parrots them back for an unrelated description.

## License

MIT
