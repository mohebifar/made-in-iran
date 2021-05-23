import * as ejs from "https://deno.land/x/dejs@0.9.3/mod.ts";
import { Octokit as OctokitCore } from "https://cdn.skypack.dev/@octokit/core?dts";
import { paginateRest } from "https://cdn.skypack.dev/@octokit/plugin-paginate-rest?dts";
import { restEndpointMethods } from "https://cdn.skypack.dev/@octokit/plugin-rest-endpoint-methods?dts";
import { retry } from "https://cdn.skypack.dev/@octokit/plugin-retry?dts";

const Octokit = OctokitCore.plugin(restEndpointMethods, paginateRest, retry);

const GITHUB_AUTH_TOKEN = Deno.env.get("GITHUB_AUTH_TOKEN");

const outputFilePath = new URL("../README.md", import.meta.url);
const templateFilePath = new URL("./template.md", import.meta.url);
const dataFilePath = new URL("../data.json", import.meta.url);

const data: Data = JSON.parse(readAndDecodeFile(dataFilePath));

const octokit = new Octokit({
  auth: GITHUB_AUTH_TOKEN,
  request: {
    timeout: 10000,
  },
});

const repositories = data.curated.map((item) => {
  const fetchReposPromise = item.repos.map((repoPath) => {
    const [owner, repo] = repoPath.split("/");
    return octokit.rest.repos.get({ owner, repo });
  });

  return Promise.allSettled(fetchReposPromise).then((rawResult) => {
    const result = rawResult
      .filter((result, index): result is PromiseFulfilledResult<any> => {
        if (result.status !== "fulfilled") {
          console.debug(
            "Skipping a repo: ",
            result.reason?.message,
            item.repos[index]
          );

          return false;
        }

        return Boolean(result.value.data);
      })
      .map((response) => response.value.data)
      .sort((a, b) => (a.stargazers_count < b.stargazers_count ? 1 : -1));

    return {
      anchor: item.anchor ?? item.category.toLowerCase(),
      category: item.category,
      repos: result,
    };
  });
});

try {
  const curated = await Promise.all(repositories);
  const template = readAndDecodeFile(templateFilePath);
  const markdown = await ejs.render(template, { curated });

  await Deno.copy(
    markdown,
    Deno.openSync(outputFilePath, { truncate: true, write: true })
  );
} catch (error) {
  console.error(error);
}

Deno.exit();

function readAndDecodeFile(filePath: string | URL) {
  const decoder = new TextDecoder("utf-8");
  return decoder.decode(Deno.readFileSync(filePath));
}

interface Data {
  curated: {
    category: string;
    anchor: string;
    repos: string[];
  }[];
}
