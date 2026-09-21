import { createApp } from './app.js';

const app = createApp();
const PORT = process.env.SERVER_PORT ? parseInt(process.env.SERVER_PORT) : (process.env.PORT ? parseInt(process.env.PORT) : 8787);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on http://0.0.0.0:${PORT}`);
});
