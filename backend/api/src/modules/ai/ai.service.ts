import { moduleHealth } from "../../shared/utils/api-response.js";

export const aiService = {
  health() {
    return moduleHealth("ai");
  },
};
