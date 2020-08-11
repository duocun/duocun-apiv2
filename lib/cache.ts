import NodeCache from "node-cache";
import { getLogger } from "./logger";
import path from "path";
const logger = getLogger(path.basename(__filename));

const cacheStore = new NodeCache({
  stdTTL: 0,
  useClones: true,
});

cacheStore.on("set", function (key, value) {
  if (key === "ROLE_PERMISSION") {
    logger.info("Role - permission relationship changed");
    logger.info(JSON.stringify(value));
  }
});

export default cacheStore;
