import { createApp } from './app.js';
import { config } from './config/index.js';

createApp(config).listen(config.PORT, () => {
  console.log(`API listening on port ${config.PORT}`);
});
