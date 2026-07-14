import { moduleHealth } from "../../shared/utils/api-response.js";

export const usersService = {
  health() {
    return moduleHealth("users");
  },
};
