import { settingsHandlers } from './settings';
import { topicHandlers } from './topics';

export const handlers = [...topicHandlers, ...settingsHandlers];
export { resetTopics } from './topics';
export { resetSettings } from './settings';
