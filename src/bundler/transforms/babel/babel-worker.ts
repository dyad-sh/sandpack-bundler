import * as babel from "@babel/standalone";
import * as reactRefreshBabel from "react-refresh/babel";

import { ITranspilationResult } from "../Transformer";
import { WorkerMessageBus } from "../../../utils/WorkerMessageBus";
import { collectDependencies } from "./dep-collector";

const reactRefresh = reactRefreshBabel.default ?? reactRefreshBabel;

babel.availablePlugins["react-refresh/babel"] = reactRefresh;

export interface ITransformData {
  code: string;
  filepath: string;
}

async function transform({
  code,
  filepath,
}: ITransformData): Promise<ITranspilationResult> {
  const requires: Set<string> = new Set();
  const transformed = babel.transform(code, {
    filepath,
    presets: [
      "env",
      "typescript",
      [
        "react",
        {
          runtime: "automatic",
        },
      ],
    ],
    plugins: [
      collectDependencies(requires),
      ["react-refresh/babel", { skipEnvCheck: true }],
    ],
    // no ast needed for now
    ast: false,
    sourceMaps: false,
    compact: true,
  });

  return {
    code: transformed.code,
    dependencies: requires,
  };
}

new WorkerMessageBus({
  channel: "sandpack-babel",
  endpoint: self,
  handleNotification: () => Promise.resolve(),
  handleRequest: (method, data) => {
    switch (method) {
      case "transform":
        return transform(data);
      default:
        return Promise.reject(new Error("Unknown method"));
    }
  },
  handleError: (err) => {
    console.error(err);
    return Promise.resolve();
  },
});
